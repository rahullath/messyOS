// UK Student Recipe Suggestion Engine
// Advanced algorithm for recipe recommendations based on constraints

import type {
  Recipe,
  InventoryItem,
  CookingTimeLimits,
  NutritionInfo
} from '../../types/uk-student';

export interface RecipeConstraints {
  maxCookingTime: number;
  maxDifficulty: number;
  availableIngredients: string[];
  dietaryRestrictions: string[];
  nutritionTargets?: Partial<NutritionInfo>;
  preferredTags?: string[];
  servings?: number;
}

export interface RecipeScore {
  recipe: Recipe;
  score: number;
  breakdown: {
    ingredientMatch: number;
    timeMatch: number;
    difficultyMatch: number;
    nutritionMatch: number;
    preferenceMatch: number;
  };
  missingIngredients: string[];
  estimatedCost: number;
}

export class RecipeEngine {
  /**
   * Score and rank recipes based on multiple criteria
   */
  static scoreRecipes(
    recipes: Recipe[],
    constraints: RecipeConstraints,
    inventory: InventoryItem[] = []
  ): RecipeScore[] {
    const availableIngredients = constraints.availableIngredients.map(ing => ing.toLowerCase());
    const inventoryItems = inventory.map(item => item.item_name.toLowerCase());
    const allAvailable = [...new Set([...availableIngredients, ...inventoryItems])];

    return recipes.map(recipe => {
      const score = this.calculateRecipeScore(recipe, constraints, allAvailable);
      return score;
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Find recipes that can be made with current inventory
   */
  static findMakeableRecipes(
    recipes: Recipe[],
    inventory: InventoryItem[],
    maxMissingIngredients: number = 2
  ): RecipeScore[] {
    const inventoryMap = new Map<string, number>();
    inventory.forEach(item => {
      inventoryMap.set(item.item_name.toLowerCase(), item.quantity);
    });

    return recipes
      .map(recipe => {
        const missingIngredients: string[] = [];
        let canMake = true;

        recipe.ingredients.forEach(ingredient => {
          const available = inventoryMap.get(ingredient.name.toLowerCase()) || 0;
          if (available < ingredient.quantity) {
            if (!ingredient.optional) {
              missingIngredients.push(ingredient.name);
            }
          }
        });

        if (missingIngredients.length <= maxMissingIngredients) {
          return {
            recipe,
            score: 100 - (missingIngredients.length * 10),
            breakdown: {
              ingredientMatch: 100 - (missingIngredients.length * 10),
              timeMatch: 100,
              difficultyMatch: 100,
              nutritionMatch: 100,
              preferenceMatch: 100
            },
            missingIngredients,
            estimatedCost: this.estimateRecipeCost(recipe, missingIngredients)
          };
        }

        return null;
      })
      .filter((score): score is RecipeScore => score !== null)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Suggest recipes for meal prep and bulk cooking
   */
  static suggestBulkCookingRecipes(
    recipes: Recipe[],
    constraints: RecipeConstraints,
    days: number = 4
  ): RecipeScore[] {
    // Filter recipes suitable for bulk cooking
    const bulkSuitableRecipes = recipes.filter(recipe => {
      return (
        recipe.bulk_cooking_multiplier > 1 &&
        recipe.storage_info &&
        (recipe.storage_info.fridge_days || 0) >= days
      );
    });

    return this.scoreRecipes(bulkSuitableRecipes, constraints)
      .map(score => ({
        ...score,
        score: score.score + 20 // Bonus for bulk cooking suitability
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Find complementary recipes for balanced nutrition
   */
  static findComplementaryRecipes(
    baseRecipe: Recipe,
    availableRecipes: Recipe[],
    nutritionTargets: NutritionInfo
  ): Recipe[] {
    const baseNutrition = baseRecipe.nutrition;
    if (!baseNutrition) return [];

    const complementary = availableRecipes.filter(recipe => {
      if (!recipe.nutrition) return false;
      
      // Look for recipes that complement the base recipe nutritionally
      const proteinGap = (nutritionTargets.protein || 0) - (baseNutrition.protein || 0);
      const carbGap = (nutritionTargets.carbs || 0) - (baseNutrition.carbs || 0);
      const fatGap = (nutritionTargets.fat || 0) - (baseNutrition.fat || 0);

      const recipeProtein = recipe.nutrition.protein || 0;
      const recipeCarbs = recipe.nutrition.carbs || 0;
      const recipeFat = recipe.nutrition.fat || 0;

      // Recipe is complementary if it helps fill nutritional gaps
      return (
        (proteinGap > 0 && recipeProtein > 10) ||
        (carbGap > 0 && recipeCarbs > 20) ||
        (fatGap > 0 && recipeFat > 5)
      );
    });

    return complementary.slice(0, 5); // Return top 5 complementary recipes
  }

  /**
   * Generate recipe variations based on available ingredients
   */
  static generateRecipeVariations(
    baseRecipe: Recipe,
    availableIngredients: string[]
  ): Recipe[] {
    const variations: Recipe[] = [];
    const available = availableIngredients.map(ing => ing.toLowerCase());

    // Create variations by substituting ingredients
    const substitutions = this.getIngredientSubstitutions();
    
    baseRecipe.ingredients.forEach(ingredient => {
      const subs = substitutions[ingredient.name.toLowerCase()];
      if (subs) {
        subs.forEach(substitute => {
          if (available.includes(substitute.toLowerCase())) {
            const variation = {
              ...baseRecipe,
              id: `${baseRecipe.id}-var-${substitute}`,
              name: `${baseRecipe.name} (with ${substitute})`,
              ingredients: baseRecipe.ingredients.map(ing => 
                ing.name.toLowerCase() === ingredient.name.toLowerCase()
                  ? { ...ing, name: substitute }
                  : ing
              )
            };
            variations.push(variation);
          }
        });
      }
    });

    return variations.slice(0, 3); // Return top 3 variations
  }

  // Private helper methods

  private static calculateRecipeScore(
    recipe: Recipe,
    constraints: RecipeConstraints,
    availableIngredients: string[]
  ): RecipeScore {
    const breakdown = {
      ingredientMatch: this.scoreIngredientMatch(recipe, availableIngredients),
      timeMatch: this.scoreTimeMatch(recipe, constraints.maxCookingTime),
      difficultyMatch: this.scoreDifficultyMatch(recipe, constraints.maxDifficulty),
      nutritionMatch: this.scoreNutritionMatch(recipe, constraints.nutritionTargets),
      preferenceMatch: this.scorePreferenceMatch(recipe, constraints.preferredTags || [])
    };

    // Calculate weighted total score
    const weights = {
      ingredientMatch: 0.35,
      timeMatch: 0.25,
      difficultyMatch: 0.15,
      nutritionMatch: 0.15,
      preferenceMatch: 0.10
    };

    const totalScore = Object.entries(breakdown).reduce((sum, [key, score]) => {
      return sum + (score * weights[key as keyof typeof weights]);
    }, 0);

    const missingIngredients = this.findMissingIngredients(recipe, availableIngredients);
    const estimatedCost = this.estimateRecipeCost(recipe, missingIngredients);

    return {
      recipe,
      score: Math.round(totalScore),
      breakdown,
      missingIngredients,
      estimatedCost
    };
  }

  private static scoreIngredientMatch(recipe: Recipe, availableIngredients: string[]): number {
    const recipeIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase());
    const available = availableIngredients;
    
    let matchCount = 0;
    let totalRequired = 0;

    recipe.ingredients.forEach(ingredient => {
      if (!ingredient.optional) {
        totalRequired++;
        const hasIngredient = available.some(avail => 
          ingredient.name.toLowerCase().includes(avail) || 
          avail.includes(ingredient.name.toLowerCase())
        );
        if (hasIngredient) matchCount++;
      }
    });

    if (totalRequired === 0) return 100;
    return Math.round((matchCount / totalRequired) * 100);
  }

  private static scoreTimeMatch(recipe: Recipe, maxTime: number): number {
    const totalTime = recipe.cooking_time + recipe.prep_time;
    if (totalTime <= maxTime) return 100;
    
    // Gradual penalty for exceeding time limit
    const overTime = totalTime - maxTime;
    const penalty = Math.min(overTime * 2, 80); // Max 80% penalty
    return Math.max(20, 100 - penalty);
  }

  private static scoreDifficultyMatch(recipe: Recipe, maxDifficulty: number): number {
    if (recipe.difficulty <= maxDifficulty) return 100;
    
    const difficultyGap = recipe.difficulty - maxDifficulty;
    return Math.max(0, 100 - (difficultyGap * 25));
  }

  private static scoreNutritionMatch(recipe: Recipe, targets?: Partial<NutritionInfo>): number {
    if (!targets || !recipe.nutrition) return 50; // Neutral score if no targets

    let score = 0;
    let criteriaCount = 0;

    if (targets.calories) {
      const calorieMatch = Math.abs((recipe.nutrition.calories || 0) - targets.calories);
      score += Math.max(0, 100 - (calorieMatch / 10));
      criteriaCount++;
    }

    if (targets.protein) {
      const proteinMatch = Math.abs((recipe.nutrition.protein || 0) - targets.protein);
      score += Math.max(0, 100 - (proteinMatch * 2));
      criteriaCount++;
    }

    if (targets.carbs) {
      const carbMatch = Math.abs((recipe.nutrition.carbs || 0) - targets.carbs);
      score += Math.max(0, 100 - (carbMatch * 2));
      criteriaCount++;
    }

    return criteriaCount > 0 ? Math.round(score / criteriaCount) : 50;
  }

  private static scorePreferenceMatch(recipe: Recipe, preferredTags: string[]): number {
    if (preferredTags.length === 0) return 50; // Neutral if no preferences

    const matchingTags = recipe.tags.filter(tag => 
      preferredTags.some(pref => pref.toLowerCase() === tag.toLowerCase())
    );

    return Math.round((matchingTags.length / preferredTags.length) * 100);
  }

  private static findMissingIngredients(recipe: Recipe, availableIngredients: string[]): string[] {
    const missing: string[] = [];
    
    recipe.ingredients.forEach(ingredient => {
      if (!ingredient.optional) {
        const hasIngredient = availableIngredients.some(avail => 
          ingredient.name.toLowerCase().includes(avail.toLowerCase()) || 
          avail.toLowerCase().includes(ingredient.name.toLowerCase())
        );
        
        if (!hasIngredient) {
          missing.push(ingredient.name);
        }
      }
    });

    return missing;
  }

  private static estimateRecipeCost(recipe: Recipe, missingIngredients: string[]): number {
    // Basic cost estimation for missing ingredients
    const ingredientCosts: Record<string, number> = {
      'chicken': 6.00,
      'beef': 8.00,
      'fish': 7.00,
      'cheese': 3.50,
      'milk': 1.20,
      'eggs': 2.50,
      'bread': 1.00,
      'rice': 2.00,
      'pasta': 1.50,
      'tomato': 2.00,
      'onion': 1.00,
      'garlic': 0.50,
      'oil': 2.00,
      'butter': 2.50
    };

    return missingIngredients.reduce((total, ingredient) => {
      const name = ingredient.toLowerCase();
      const cost = Object.entries(ingredientCosts).find(([key]) => 
        name.includes(key) || key.includes(name)
      )?.[1] || 2.00; // Default cost
      
      return total + cost;
    }, 0);
  }

  private static getIngredientSubstitutions(): Record<string, string[]> {
    return {
      'chicken breast': ['chicken thigh', 'turkey breast'],
      'beef mince': ['turkey mince', 'lamb mince'],
      'cheddar cheese': ['mozzarella', 'gouda', 'swiss cheese'],
      'whole milk': ['semi-skimmed milk', '2% milk'],
      'butter': ['margarine', 'olive oil'],
      'white rice': ['brown rice', 'quinoa'],
      'pasta': ['noodles', 'rice'],
      'white bread': ['brown bread', 'wholemeal bread'],
      'tomato': ['cherry tomatoes', 'canned tomatoes'],
      'fresh herbs': ['dried herbs'],
      'lemon': ['lime', 'vinegar'],
      'garlic': ['garlic powder', 'shallots'],
      'onion': ['shallots', 'leeks']
    };
  }
}