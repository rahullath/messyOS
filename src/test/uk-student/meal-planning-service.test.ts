// Tests for UK Student Meal Planning Service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MealPlanningService } from '../../lib/uk-student/meal-planning-service';
import type { 
  Recipe, 
  InventoryItem, 
  MealConstraints,
  CookingTimeLimits 
} from '../../types/uk-student';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            lte: vi.fn(() => ({
              overlaps: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: mockRecipes, error: null }))
              }))
            }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    }))
  }
}));

const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Quick Scrambled Eggs',
    description: 'Simple breakfast eggs',
    ingredients: [
      { name: 'eggs', quantity: 2, unit: 'pieces' },
      { name: 'butter', quantity: 1, unit: 'tbsp' }
    ],
    instructions: ['Beat eggs', 'Cook in pan'],
    cooking_time: 5,
    prep_time: 2,
    difficulty: 1,
    servings: 1,
    nutrition: { calories: 200, protein: 12, carbs: 2, fat: 16 },
    storage_info: { fridge_days: 1 },
    bulk_cooking_multiplier: 1,
    tags: ['breakfast', 'quick', 'protein'],
    is_public: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    name: 'Chicken Pasta',
    description: 'Hearty dinner pasta',
    ingredients: [
      { name: 'chicken breast', quantity: 200, unit: 'g' },
      { name: 'pasta', quantity: 100, unit: 'g' },
      { name: 'tomato sauce', quantity: 150, unit: 'ml' }
    ],
    instructions: ['Cook chicken', 'Boil pasta', 'Combine'],
    cooking_time: 20,
    prep_time: 10,
    difficulty: 2,
    servings: 1,
    nutrition: { calories: 450, protein: 35, carbs: 45, fat: 12 },
    storage_info: { fridge_days: 3, freezer_days: 30 },
    bulk_cooking_multiplier: 2,
    tags: ['dinner', 'protein', 'pasta'],
    is_public: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

const mockInventory: InventoryItem[] = [
  {
    id: '1',
    user_id: 'test-user',
    item_name: 'eggs',
    quantity: 6,
    unit: 'pieces',
    category: 'dairy',
    location: 'fridge',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    user_id: 'test-user',
    item_name: 'pasta',
    quantity: 500,
    unit: 'g',
    category: 'grains',
    location: 'pantry',
    created_at: new Date(),
    updated_at: new Date()
  }
];

describe('MealPlanningService', () => {
  let service: MealPlanningService;
  const userId = 'test-user';

  beforeEach(() => {
    service = new MealPlanningService(userId);
    vi.clearAllMocks();
  });

  describe('generateWeeklyPlan', () => {
    it('should generate a complete weekly meal plan', async () => {
      const constraints: MealConstraints = {
        budget: 50,
        cookingTimeLimits: { breakfast: 10, lunch: 20, dinner: 30 },
        dietaryRestrictions: [],
        servings: 1,
        bulkCookingPreference: false,
        availableIngredients: ['eggs', 'pasta']
      };

      const mealPlan = await service.generateWeeklyPlan(constraints);

      expect(mealPlan).toBeDefined();
      expect(mealPlan.user_id).toBe(userId);
      expect(mealPlan.meals).toBeDefined();
      expect(mealPlan.shopping_list).toBeDefined();
      expect(mealPlan.total_cost).toBeGreaterThan(0);
      expect(mealPlan.nutrition_summary).toBeDefined();
    });

    it('should respect cooking time limits', async () => {
      const constraints: MealConstraints = {
        budget: 50,
        cookingTimeLimits: { breakfast: 5, lunch: 15, dinner: 25 },
        dietaryRestrictions: [],
        servings: 1,
        bulkCookingPreference: false
      };

      const mealPlan = await service.generateWeeklyPlan(constraints);
      
      // Check that suggested recipes respect time limits
      Object.values(mealPlan.meals).forEach(dayMeals => {
        if (dayMeals.breakfast) {
          const totalTime = dayMeals.breakfast.cooking_time + dayMeals.breakfast.prep_time;
          expect(totalTime).toBeLessThanOrEqual(constraints.cookingTimeLimits.breakfast);
        }
      });
    });

    it('should handle budget constraints', async () => {
      const constraints: MealConstraints = {
        budget: 20, // Low budget
        cookingTimeLimits: { breakfast: 10, lunch: 20, dinner: 30 },
        dietaryRestrictions: [],
        servings: 1,
        bulkCookingPreference: true
      };

      const mealPlan = await service.generateWeeklyPlan(constraints);
      
      expect(mealPlan.total_cost).toBeLessThanOrEqual(constraints.budget);
    });
  });

  describe('suggestRecipes', () => {
    it('should suggest recipes based on available ingredients', async () => {
      const ingredients = ['eggs', 'butter'];
      const maxCookingTime = 10;
      const options = { tags: ['breakfast'], limit: 5 };

      const recipes = await service.suggestRecipes(ingredients, maxCookingTime, options);

      expect(recipes).toBeDefined();
      expect(Array.isArray(recipes)).toBe(true);
      expect(recipes.length).toBeGreaterThan(0);
      
      // Should prioritize recipes with available ingredients
      const firstRecipe = recipes[0];
      expect(firstRecipe.cooking_time + firstRecipe.prep_time).toBeLessThanOrEqual(maxCookingTime);
    });

    it('should filter by cooking time', async () => {
      const ingredients = ['chicken', 'pasta'];
      const maxCookingTime = 15; // Short time limit

      const recipes = await service.suggestRecipes(ingredients, maxCookingTime);

      recipes.forEach(recipe => {
        const totalTime = recipe.cooking_time + recipe.prep_time;
        expect(totalTime).toBeLessThanOrEqual(maxCookingTime);
      });
    });

    it('should handle empty ingredient list', async () => {
      const recipes = await service.suggestRecipes([], 30);

      expect(recipes).toBeDefined();
      expect(Array.isArray(recipes)).toBe(true);
    });
  });

  describe('getCurrentInventory', () => {
    it('should fetch user inventory', async () => {
      // Mock the supabase response
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => Promise.resolve({ data: mockInventory, error: null }))
          }))
        }))
      });

      const inventory = await service.getCurrentInventory();

      expect(inventory).toBeDefined();
      expect(Array.isArray(inventory)).toBe(true);
    });
  });

  describe('calculateBulkCooking', () => {
    it('should calculate bulk cooking recommendations', () => {
      const recipe = mockRecipes[1]; // Chicken Pasta
      const days = 4;

      const bulkInfo = service.calculateBulkCooking(recipe, days);

      expect(bulkInfo.multiplier).toBeGreaterThan(1);
      expect(bulkInfo.totalServings).toBeGreaterThan(recipe.servings);
      expect(bulkInfo.storageRecommendations).toBeDefined();
      expect(Array.isArray(bulkInfo.storageRecommendations)).toBe(true);
      expect(bulkInfo.costSavings).toBeGreaterThanOrEqual(0);
    });

    it('should provide storage recommendations', () => {
      const recipe = mockRecipes[1];
      const days = 3;

      const bulkInfo = service.calculateBulkCooking(recipe, days);

      expect(bulkInfo.storageRecommendations.length).toBeGreaterThan(0);
      expect(bulkInfo.storageRecommendations[0]).toContain('fridge');
    });
  });

  describe('optimizeShoppingList', () => {
    it('should optimize shopping list with store recommendations', async () => {
      const shoppingItems = [
        { name: 'chicken breast', quantity: 500, unit: 'g', priority: 'essential' as const, category: 'meat' },
        { name: 'pasta', quantity: 200, unit: 'g', priority: 'essential' as const, category: 'grains' }
      ];

      const stores = [
        {
          id: '1',
          name: 'Tesco',
          type: 'store' as const,
          price_level: 'mid' as const,
          user_rating: 4,
          opening_hours: {},
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      const optimizedList = await service.optimizeShoppingList(shoppingItems, stores);

      expect(optimizedList).toBeDefined();
      expect(optimizedList.items).toBeDefined();
      expect(optimizedList.stores).toBeDefined();
      expect(optimizedList.total_estimated_cost).toBeGreaterThan(0);
      expect(optimizedList.estimated_time).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
            }))
          }))
        }))
      });

      const recipes = await service.suggestRecipes(['eggs'], 10);
      
      expect(recipes).toBeDefined();
      expect(Array.isArray(recipes)).toBe(true);
      expect(recipes.length).toBe(0); // Should return empty array on error
    });

    it('should handle invalid constraints', async () => {
      const invalidConstraints: MealConstraints = {
        budget: -10, // Invalid budget
        cookingTimeLimits: { breakfast: -5, lunch: 0, dinner: -10 }, // Invalid times
        dietaryRestrictions: [],
        servings: 0, // Invalid servings
        bulkCookingPreference: false
      };

      await expect(service.generateWeeklyPlan(invalidConstraints)).rejects.toThrow();
    });
  });

  describe('nutrition calculations', () => {
    it('should calculate accurate nutrition summaries', () => {
      const weeklyMeals = {
        '2024-01-01': {
          breakfast: mockRecipes[0],
          lunch: null,
          dinner: mockRecipes[1]
        },
        '2024-01-02': {
          breakfast: mockRecipes[0],
          lunch: mockRecipes[1],
          dinner: null
        }
      };

      // Access private method for testing
      const nutritionSummary = (service as any).calculateNutritionSummary(weeklyMeals);

      expect(nutritionSummary).toBeDefined();
      expect(nutritionSummary.calories).toBeGreaterThan(0);
      expect(nutritionSummary.protein).toBeGreaterThan(0);
      expect(nutritionSummary.carbs).toBeGreaterThan(0);
      expect(nutritionSummary.fat).toBeGreaterThan(0);
    });
  });
});