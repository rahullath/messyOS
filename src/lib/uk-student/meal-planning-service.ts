// UK Student Meal Planning Service
// Handles recipe suggestions, meal planning, and shopping list optimization

import { supabase } from '../supabase/client';
import type {
  Recipe,
  MealPlan,
  InventoryItem,
  ShoppingItem,
  OptimizedShoppingList,
  Store,
  StoreRecommendation,
  WeeklyMeals,
  NutritionInfo,
  CookingTimeLimits,
  APIResponse
} from '../../types/uk-student';

export interface MealConstraints {
  budget: number;
  cookingTimeLimits: CookingTimeLimits;
  dietaryRestrictions: string[];
  servings: number;
  bulkCookingPreference: boolean;
  availableIngredients?: string[];
}

export interface RecipeSearchOptions {
  ingredients?: string[];
  maxCookingTime?: number;
  difficulty?: number;
  tags?: string[];
  limit?: number;
}

export class MealPlanningService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Generate a weekly meal plan based on constraints and preferences
   */
  async generateWeeklyPlan(constraints: MealConstraints): Promise<MealPlan> {
    try {
      // Get user's current inventory
      const inventory = await this.getCurrentInventory();
      
      // Get suitable recipes for each meal type
      const breakfastRecipes = await this.suggestRecipes(
        constraints.availableIngredients || [],
        constraints.cookingTimeLimits.breakfast,
        { tags: ['breakfast'], limit: 7 }
      );
      
      const lunchRecipes = await this.suggestRecipes(
        constraints.availableIngredients || [],
        constraints.cookingTimeLimits.lunch,
        { tags: ['lunch', 'quick'], limit: 7 }
      );
      
      const dinnerRecipes = await this.suggestRecipes(
        constraints.availableIngredients || [],
        constraints.cookingTimeLimits.dinner,
        { tags: ['dinner'], limit: 7 }
      );

      // Generate weekly meal schedule
      const weeklyMeals = this.createWeeklySchedule(
        breakfastRecipes,
        lunchRecipes,
        dinnerRecipes,
        constraints
      );

      // Generate shopping list
      const shoppingList = await this.generateShoppingList(weeklyMeals, inventory);
      
      // Calculate nutrition summary
      const nutritionSummary = this.calculateNutritionSummary(weeklyMeals);
      
      // Estimate total cost
      const totalCost = this.estimateTotalCost(shoppingList);

      const mealPlan: MealPlan = {
        id: crypto.randomUUID(),
        user_id: this.userId,
        week_start_date: this.getWeekStartDate(),
        meals: weeklyMeals,
        shopping_list: shoppingList,
        total_cost: totalCost,
        nutrition_summary: nutritionSummary,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Save to database
      await this.saveMealPlan(mealPlan);
      
      return mealPlan;
    } catch (error) {
      console.error('Error generating weekly meal plan:', error);
      throw new Error('Failed to generate meal plan');
    }
  }

  /**
   * Suggest recipes based on available ingredients and time constraints
   */
  async suggestRecipes(
    ingredients: string[],
    maxCookingTime: number,
    options: RecipeSearchOptions = {}
  ): Promise<Recipe[]> {
    try {
      let query = supabase
        .from('uk_student_recipes')
        .select('*')
        .eq('is_public', true)
        .lte('cooking_time', maxCookingTime);

      // Filter by difficulty if specified
      if (options.difficulty) {
        query = query.lte('difficulty', options.difficulty);
      }

      // Filter by tags if specified
      if (options.tags && options.tags.length > 0) {
        query = query.overlaps('tags', options.tags);
      }

      // Limit results
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: recipes, error } = await query;

      if (error) {
        throw error;
      }

      if (!recipes) {
        return [];
      }

      // Score recipes based on ingredient availability
      const scoredRecipes = recipes.map(recipe => ({
        ...recipe,
        score: this.calculateRecipeScore(recipe, ingredients)
      }));

      // Sort by score (highest first) and return
      return scoredRecipes
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || 10);

    } catch (error) {
      console.error('Error suggesting recipes:', error);
      return [];
    }
  }

  /**
   * Get current inventory for the user
   */
  async getCurrentInventory(): Promise<InventoryItem[]> {
    try {
      const { data: inventory, error } = await supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', this.userId)
        .gt('quantity', 0);

      if (error) {
        throw error;
      }

      return inventory || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return [];
    }
  }

  /**
   * Track inventory items and update quantities
   */
  async updateInventory(items: Partial<InventoryItem>[]): Promise<void> {
    try {
      for (const item of items) {
        if (item.id) {
          // Update existing item
          const { error } = await supabase
            .from('uk_student_inventory')
            .update({
              quantity: item.quantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('user_id', this.userId);

          if (error) throw error;
        } else {
          // Add new item
          const { error } = await supabase
            .from('uk_student_inventory')
            .insert({
              user_id: this.userId,
              item_name: item.item_name!,
              quantity: item.quantity!,
              unit: item.unit!,
              category: item.category || 'other',
              location: item.location || 'fridge',
              expiry_date: item.expiry_date,
              purchase_date: item.purchase_date,
              store: item.store,
              cost: item.cost
            });

          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw new Error('Failed to update inventory');
    }
  }

  /**
   * Optimize shopping list based on store locations and prices
   */
  async optimizeShoppingList(
    items: ShoppingItem[],
    stores: Store[]
  ): Promise<OptimizedShoppingList> {
    try {
      // Group items by category for efficient shopping
      const categorizedItems = this.categorizeShoppingItems(items);
      
      // Calculate store recommendations based on items and locations
      const storeRecommendations = await this.calculateStoreRecommendations(
        categorizedItems,
        stores
      );

      // Estimate total cost and time
      const totalCost = storeRecommendations.reduce((sum, store) => sum + store.subtotal, 0);
      const totalTime = storeRecommendations.reduce((sum, store) => sum + store.travel_time, 0) + 
                       (storeRecommendations.length * 15); // 15 min per store

      return {
        items: categorizedItems,
        stores: storeRecommendations,
        total_estimated_cost: totalCost,
        estimated_time: totalTime
      };
    } catch (error) {
      console.error('Error optimizing shopping list:', error);
      throw new Error('Failed to optimize shopping list');
    }
  }

  /**
   * Calculate bulk cooking recommendations
   */
  calculateBulkCooking(recipe: Recipe, days: number): {
    multiplier: number;
    totalServings: number;
    storageRecommendations: string[];
    costSavings: number;
  } {
    const multiplier = Math.ceil(days / recipe.servings) * recipe.bulk_cooking_multiplier;
    const totalServings = recipe.servings * multiplier;
    
    const storageRecommendations = [];
    if (recipe.storage_info.fridge_days && recipe.storage_info.fridge_days >= days) {
      storageRecommendations.push(`Store in fridge for up to ${recipe.storage_info.fridge_days} days`);
    }
    if (recipe.storage_info.freezer_days && recipe.storage_info.freezer_days >= days) {
      storageRecommendations.push(`Freeze portions for up to ${recipe.storage_info.freezer_days} days`);
    }
    
    // Estimate cost savings from bulk cooking (typically 15-25% savings)
    const costSavings = multiplier > 1 ? 0.2 : 0;
    
    return {
      multiplier,
      totalServings,
      storageRecommendations,
      costSavings
    };
  }

  // Private helper methods

  private calculateRecipeScore(recipe: Recipe, availableIngredients: string[]): number {
    let score = 0;
    const recipeIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase());
    const available = availableIngredients.map(ing => ing.toLowerCase());
    
    // Score based on ingredient availability
    const matchingIngredients = recipeIngredients.filter(ing => 
      available.some(avail => ing.includes(avail) || avail.includes(ing))
    );
    
    score += (matchingIngredients.length / recipeIngredients.length) * 100;
    
    // Bonus for fewer total ingredients (simpler recipes)
    score += Math.max(0, 10 - recipeIngredients.length);
    
    // Bonus for lower difficulty
    score += (6 - recipe.difficulty) * 5;
    
    return score;
  }

  private createWeeklySchedule(
    breakfastRecipes: Recipe[],
    lunchRecipes: Recipe[],
    dinnerRecipes: Recipe[],
    constraints: MealConstraints
  ): WeeklyMeals {
    const meals: WeeklyMeals = {};
    const startDate = this.getWeekStartDate();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      meals[dateKey] = {
        breakfast: breakfastRecipes[i % breakfastRecipes.length] || null,
        lunch: lunchRecipes[i % lunchRecipes.length] || null,
        dinner: dinnerRecipes[i % dinnerRecipes.length] || null
      };
    }
    
    return meals;
  }

  private async generateShoppingList(
    weeklyMeals: WeeklyMeals,
    inventory: InventoryItem[]
  ): Promise<ShoppingItem[]> {
    const neededIngredients = new Map<string, ShoppingItem>();
    
    // Collect all ingredients from meals
    Object.values(weeklyMeals).forEach(dayMeals => {
      [dayMeals.breakfast, dayMeals.lunch, dayMeals.dinner].forEach(recipe => {
        if (recipe) {
          recipe.ingredients.forEach(ingredient => {
            const key = ingredient.name.toLowerCase();
            const existing = neededIngredients.get(key);
            
            if (existing) {
              existing.quantity += ingredient.quantity;
            } else {
              neededIngredients.set(key, {
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                priority: ingredient.optional ? 'optional' : 'essential',
                category: this.categorizeIngredient(ingredient.name)
              });
            }
          });
        }
      });
    });

    // Subtract available inventory
    inventory.forEach(item => {
      const key = item.item_name.toLowerCase();
      const needed = neededIngredients.get(key);
      if (needed && item.quantity > 0) {
        needed.quantity = Math.max(0, needed.quantity - item.quantity);
        if (needed.quantity === 0) {
          neededIngredients.delete(key);
        }
      }
    });

    return Array.from(neededIngredients.values()).filter(item => item.quantity > 0);
  }

  private calculateNutritionSummary(weeklyMeals: WeeklyMeals): NutritionInfo {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let mealCount = 0;

    Object.values(weeklyMeals).forEach(dayMeals => {
      [dayMeals.breakfast, dayMeals.lunch, dayMeals.dinner].forEach(recipe => {
        if (recipe && recipe.nutrition) {
          totalCalories += recipe.nutrition.calories || 0;
          totalProtein += recipe.nutrition.protein || 0;
          totalCarbs += recipe.nutrition.carbs || 0;
          totalFat += recipe.nutrition.fat || 0;
          mealCount++;
        }
      });
    });

    return {
      calories: Math.round(totalCalories / 7), // Daily average
      protein: Math.round(totalProtein / 7),
      carbs: Math.round(totalCarbs / 7),
      fat: Math.round(totalFat / 7)
    };
  }

  private estimateTotalCost(shoppingList: ShoppingItem[]): number {
    return shoppingList.reduce((total, item) => {
      return total + (item.estimated_cost || this.estimateItemCost(item));
    }, 0);
  }

  private estimateItemCost(item: ShoppingItem): number {
    // Basic cost estimation based on category and quantity
    const baseCosts: Record<string, number> = {
      'vegetables': 2.50,
      'fruits': 3.00,
      'meat': 8.00,
      'dairy': 2.00,
      'grains': 1.50,
      'spices': 1.00,
      'other': 2.00
    };
    
    const basePrice = baseCosts[item.category] || baseCosts['other'];
    return basePrice * Math.max(1, item.quantity / 2); // Rough estimation
  }

  private categorizeIngredient(ingredientName: string): string {
    const name = ingredientName.toLowerCase();
    
    if (['chicken', 'beef', 'pork', 'fish', 'lamb'].some(meat => name.includes(meat))) {
      return 'meat';
    }
    if (['milk', 'cheese', 'yogurt', 'butter', 'cream'].some(dairy => name.includes(dairy))) {
      return 'dairy';
    }
    if (['rice', 'pasta', 'bread', 'flour', 'oats'].some(grain => name.includes(grain))) {
      return 'grains';
    }
    if (['tomato', 'onion', 'carrot', 'potato', 'pepper'].some(veg => name.includes(veg))) {
      return 'vegetables';
    }
    if (['apple', 'banana', 'orange', 'berry'].some(fruit => name.includes(fruit))) {
      return 'fruits';
    }
    if (['salt', 'pepper', 'garlic', 'herb', 'spice'].some(spice => name.includes(spice))) {
      return 'spices';
    }
    
    return 'other';
  }

  private categorizeShoppingItems(items: ShoppingItem[]): ShoppingItem[] {
    return items.map(item => ({
      ...item,
      category: item.category || this.categorizeIngredient(item.name)
    }));
  }

  private async calculateStoreRecommendations(
    items: ShoppingItem[],
    stores: Store[]
  ): Promise<StoreRecommendation[]> {
    const recommendations: StoreRecommendation[] = [];
    
    for (const store of stores) {
      const storeItems = this.getItemsForStore(items, store);
      if (storeItems.length === 0) continue;
      
      const subtotal = this.calculateStoreSubtotal(storeItems, store);
      const travelTime = await this.estimateTravelTime(store);
      const priorityScore = this.calculateStorePriorityScore(store, storeItems);
      
      recommendations.push({
        store,
        items: storeItems,
        subtotal,
        travel_time: travelTime,
        priority_score: priorityScore
      });
    }
    
    return recommendations.sort((a, b) => b.priority_score - a.priority_score);
  }

  private getItemsForStore(items: ShoppingItem[], store: Store): ShoppingItem[] {
    // For now, assume all stores carry all items
    // In a real implementation, this would check store-specific inventory
    return items;
  }

  private calculateStoreSubtotal(items: ShoppingItem[], store: Store): number {
    const priceMultiplier = store.price_level === 'budget' ? 0.9 : 
                           store.price_level === 'premium' ? 1.2 : 1.0;
    
    return items.reduce((total, item) => {
      const itemCost = (item.estimated_cost || this.estimateItemCost(item)) * priceMultiplier;
      return total + itemCost;
    }, 0);
  }

  private async estimateTravelTime(store: Store): Promise<number> {
    // Simplified travel time estimation
    // In a real implementation, this would use the location service
    const baseTimes: Record<string, number> = {
      'aldi': 15,
      'tesco': 20,
      'sainsburys': 25,
      'premier': 10,
      'university-superstore': 5
    };
    
    return baseTimes[store.name.toLowerCase()] || 20;
  }

  private calculateStorePriorityScore(store: Store, items: ShoppingItem[]): number {
    let score = 0;
    
    // Prefer budget stores
    if (store.price_level === 'budget') score += 30;
    else if (store.price_level === 'mid') score += 20;
    else score += 10;
    
    // Prefer stores with good ratings
    score += (store.user_rating || 3) * 5;
    
    // Prefer stores that can fulfill more items
    score += items.length * 2;
    
    return score;
  }

  private getWeekStartDate(): Date {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek); // Start from Sunday
    startDate.setHours(0, 0, 0, 0);
    return startDate;
  }

  private async saveMealPlan(mealPlan: MealPlan): Promise<void> {
    const { error } = await supabase
      .from('uk_student_meal_plans')
      .upsert({
        user_id: mealPlan.user_id,
        week_start_date: mealPlan.week_start_date.toISOString().split('T')[0],
        meals: mealPlan.meals,
        shopping_list: mealPlan.shopping_list,
        total_cost: mealPlan.total_cost,
        nutrition_summary: mealPlan.nutrition_summary
      });

    if (error) {
      throw new Error(`Failed to save meal plan: ${error.message}`);
    }
  }
}