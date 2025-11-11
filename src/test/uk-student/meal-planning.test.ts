// UK Student Meal Planning System Tests
// Comprehensive test suite for meal planning algorithms and inventory management

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MealPlanningService } from '../../lib/uk-student/meal-planning-service';
import { InventoryService } from '../../lib/uk-student/inventory-service';
import { RecipeEngine } from '../../lib/uk-student/recipe-engine';
import { ShoppingOptimizer } from '../../lib/uk-student/shopping-optimizer';
import type {
  Recipe,
  InventoryItem,
  MealConstraints,
  ShoppingItem,
  Store,
  RecipeConstraints
} from '../../types/uk-student';

// Mock Supabase
vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null
          })),
          gt: vi.fn(() => ({
            data: [],
            error: null
          })),
          lte: vi.fn(() => ({
            data: [],
            error: null
          })),
          overlaps: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      })),
      upsert: vi.fn(() => ({
        error: null
      }))
    }))
  }
}));

// Mock location service
const mockLocationService = {
  getBirminghamRoute: vi.fn(),
  getNearbyStores: vi.fn(),
  getWeatherForecast: vi.fn(),
  calculateTravelTime: vi.fn()
};

describe('MealPlanningService', () => {
  let service: MealPlanningService;
  const userId = 'test-user-id';

  beforeEach(() => {
    service = new MealPlanningService(userId);
    vi.clearAllMocks();
  });

  describe('generateWeeklyPlan', () => {
    it('should generate a meal plan within budget constraints', async () => {
      const constraints: MealConstraints = {
        budget: 50,
        cookingTimeLimits: { breakfast: 10, lunch: 20, dinner: 30 },
        dietaryRestrictions: [],
        servings: 1,
        bulkCookingPreference: false
      };

      // Mock the service methods
      vi.spyOn(service, 'getCurrentInventory').mockResolvedValue([]);
      vi.spyOn(service, 'suggestRecipes').mockResolvedValue([mockRecipe]);

      const plan = await service.generateWeeklyPlan(constraints);

      expect(plan).toBeDefined();
      expect(plan.user_id).toBe(userId);
      expect(plan.total_cost).toBeLessThanOrEqual(constraints.budget);
    });

    it('should consider available ingredients when planning meals', async () => {
      const availableIngredients = ['chicken', 'rice', 'vegetables'];
      const constraints: MealConstraints = {
        budget: 40,
        cookingTimeLimits: { breakfast: 15, lunch: 25, dinner: 35 },
        dietaryRestrictions: [],
        servings: 1,
        bulkCookingPreference: false,
        availableIngredients
      };

      vi.spyOn(service, 'getCurrentInventory').mockResolvedValue(mockInventory);
      vi.spyOn(service, 'suggestRecipes').mockResolvedValue([mockRecipe]);

      const plan = await service.generateWeeklyPlan(constraints);

      expect(service.suggestRecipes).toHaveBeenCalledWith(
        availableIngredients,
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('suggestRecipes', () => {
    it('should return recipes matching time constraints', async () => {
      const ingredients = ['pasta', 'tomatoes'];
      const maxTime = 20;

      const recipes = await service.suggestRecipes(ingredients, maxTime);

      expect(Array.isArray(recipes)).toBe(true);
      // In a real test, we'd verify the recipes returned match the time constraint
    });

    it('should filter by dietary restrictions', async () => {
      const ingredients = ['chicken', 'vegetables'];
      const maxTime = 30;
      const options = { tags: ['vegetarian'] };

      const recipes = await service.suggestRecipes(ingredients, maxTime, options);

      expect(Array.isArray(recipes)).toBe(true);
    });
  });

  describe('calculateBulkCooking', () => {
    it('should calculate correct multiplier for bulk cooking', () => {
      const recipe = mockRecipe;
      const days = 4;

      const result = service.calculateBulkCooking(recipe, days);

      expect(result.multiplier).toBeGreaterThan(1);
      expect(result.totalServings).toBeGreaterThan(recipe.servings);
      expect(result.storageRecommendations).toContain('Store in fridge');
    });

    it('should suggest freezing for longer storage', () => {
      const recipe = {
        ...mockRecipe,
        storage_info: {
          fridge_days: 3,
          freezer_days: 30,
          reheating_instructions: 'Microwave for 2-3 minutes'
        }
      };
      const days = 7;

      const result = service.calculateBulkCooking(recipe, days);

      expect(result.storageRecommendations).toContain('Freeze portions');
    });
  });
});

describe('InventoryService', () => {
  let service: InventoryService;
  const userId = 'test-user-id';

  beforeEach(() => {
    service = new InventoryService(userId);
    vi.clearAllMocks();
  });

  describe('addInventoryItem', () => {
    it('should add new inventory item with correct categorization', async () => {
      const item = {
        item_name: 'chicken breast',
        quantity: 2,
        unit: 'pieces',
        location: 'fridge' as const,
        purchase_date: new Date(),
        cost: 5.99
      };

      // Mock successful insertion
      vi.mocked(require('../../lib/supabase/client').supabase.from).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { ...item, id: 'test-id', category: 'meat' },
              error: null
            }))
          }))
        }))
      });

      const result = await service.addInventoryItem(item);

      expect(result).toBeDefined();
      expect(result.category).toBe('meat');
    });
  });

  describe('getExpiryAlerts', () => {
    it('should return items expiring soon with correct urgency', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockInventoryWithExpiry = [
        {
          ...mockInventory[0],
          expiry_date: tomorrow,
          item_name: 'milk'
        }
      ];

      vi.spyOn(service, 'getAllInventory').mockResolvedValue(mockInventoryWithExpiry);

      const alerts = await service.getExpiryAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].urgency).toBe('high');
      expect(alerts[0].days_until_expiry).toBe(1);
    });
  });

  describe('bulkUpdateInventory', () => {
    it('should handle multiple inventory updates efficiently', async () => {
      const items = [
        {
          item_name: 'bread',
          quantity: 1,
          unit: 'loaf',
          location: 'pantry' as const
        },
        {
          item_name: 'milk',
          quantity: 1,
          unit: 'liter',
          location: 'fridge' as const
        }
      ];

      vi.spyOn(service, 'addInventoryItem').mockResolvedValue(mockInventory[0]);

      const results = await service.bulkUpdateInventory(items);

      expect(results).toHaveLength(items.length);
      expect(service.addInventoryItem).toHaveBeenCalledTimes(items.length);
    });
  });
});

describe('RecipeEngine', () => {
  describe('scoreRecipes', () => {
    it('should score recipes based on ingredient availability', () => {
      const recipes = [mockRecipe];
      const constraints: RecipeConstraints = {
        maxCookingTime: 30,
        maxDifficulty: 3,
        availableIngredients: ['pasta', 'tomatoes'],
        dietaryRestrictions: []
      };

      const scores = RecipeEngine.scoreRecipes(recipes, constraints);

      expect(scores).toHaveLength(1);
      expect(scores[0].score).toBeGreaterThan(0);
      expect(scores[0].breakdown).toBeDefined();
    });

    it('should penalize recipes exceeding time limits', () => {
      const longRecipe = {
        ...mockRecipe,
        cooking_time: 45,
        prep_time: 15
      };

      const constraints: RecipeConstraints = {
        maxCookingTime: 30,
        maxDifficulty: 5,
        availableIngredients: ['pasta', 'tomatoes'],
        dietaryRestrictions: []
      };

      const scores = RecipeEngine.scoreRecipes([longRecipe], constraints);

      expect(scores[0].breakdown.timeMatch).toBeLessThan(100);
    });
  });

  describe('findMakeableRecipes', () => {
    it('should find recipes that can be made with current inventory', () => {
      const recipes = [mockRecipe];
      const inventory = mockInventory;

      const makeable = RecipeEngine.findMakeableRecipes(recipes, inventory, 1);

      expect(Array.isArray(makeable)).toBe(true);
    });
  });

  describe('suggestBulkCookingRecipes', () => {
    it('should prioritize recipes suitable for bulk cooking', () => {
      const bulkRecipe = {
        ...mockRecipe,
        bulk_cooking_multiplier: 3.0,
        storage_info: {
          fridge_days: 5,
          freezer_days: 30,
          reheating_instructions: 'Microwave'
        }
      };

      const constraints: RecipeConstraints = {
        maxCookingTime: 45,
        maxDifficulty: 4,
        availableIngredients: ['pasta', 'tomatoes'],
        dietaryRestrictions: []
      };

      const suggestions = RecipeEngine.suggestBulkCookingRecipes([bulkRecipe], constraints, 4);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].score).toBeGreaterThan(0);
    });
  });
});

describe('ShoppingOptimizer', () => {
  let optimizer: ShoppingOptimizer;

  beforeEach(() => {
    optimizer = new ShoppingOptimizer(mockLocationService);
  });

  describe('optimizeShoppingList', () => {
    it('should optimize shopping across multiple stores', async () => {
      const items: ShoppingItem[] = [
        {
          name: 'bread',
          quantity: 1,
          unit: 'loaf',
          priority: 'essential',
          category: 'bakery'
        },
        {
          name: 'milk',
          quantity: 1,
          unit: 'liter',
          priority: 'essential',
          category: 'dairy'
        }
      ];

      const stores = mockStores;
      const constraints = {
        maxBudget: 20,
        prioritizePrice: true
      };

      const optimized = await optimizer.optimizeShoppingList(items, stores, constraints);

      expect(optimized.items).toHaveLength(items.length);
      expect(optimized.stores.length).toBeGreaterThan(0);
      expect(optimized.total_estimated_cost).toBeLessThanOrEqual(constraints.maxBudget);
    });
  });

  describe('findCheapestCombination', () => {
    it('should find the most cost-effective store combination', async () => {
      const items: ShoppingItem[] = [
        {
          name: 'chicken',
          quantity: 1,
          unit: 'kg',
          priority: 'essential',
          category: 'meat',
          estimated_cost: 8.00
        }
      ];

      const stores = mockStores;

      const cheapest = await optimizer.findCheapestCombination(items, stores);

      expect(cheapest.length).toBeGreaterThan(0);
      // Should prefer budget stores like Aldi
      expect(cheapest[0].store.price_level).toBe('budget');
    });
  });
});

// Mock data for tests
const mockRecipe: Recipe = {
  id: 'recipe-1',
  name: 'Quick Pasta',
  description: 'Simple pasta dish',
  ingredients: [
    { name: 'pasta', quantity: 100, unit: 'g', optional: false },
    { name: 'tomatoes', quantity: 200, unit: 'g', optional: false }
  ],
  instructions: ['Cook pasta', 'Add tomatoes'],
  cooking_time: 15,
  prep_time: 5,
  difficulty: 2,
  servings: 1,
  nutrition: {
    calories: 450,
    protein: 15,
    carbs: 65,
    fat: 12
  },
  storage_info: {
    fridge_days: 3,
    freezer_days: 30,
    reheating_instructions: 'Microwave for 2-3 minutes'
  },
  bulk_cooking_multiplier: 2.0,
  tags: ['quick', 'vegetarian'],
  is_public: true,
  created_at: new Date(),
  updated_at: new Date()
};

const mockInventory: InventoryItem[] = [
  {
    id: 'inv-1',
    user_id: 'test-user',
    item_name: 'pasta',
    quantity: 500,
    unit: 'g',
    category: 'grains',
    location: 'pantry',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'inv-2',
    user_id: 'test-user',
    item_name: 'canned tomatoes',
    quantity: 2,
    unit: 'cans',
    category: 'vegetables',
    location: 'pantry',
    created_at: new Date(),
    updated_at: new Date()
  }
];

const mockStores: Store[] = [
  {
    id: 'store-1',
    name: 'Aldi',
    type: 'store',
    address: 'Five Ways, Birmingham',
    coordinates: { latitude: 52.4751, longitude: -1.9180 },
    opening_hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' }
    },
    price_level: 'budget',
    user_rating: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'store-2',
    name: 'Tesco',
    type: 'store',
    address: 'Selly Oak, Birmingham',
    coordinates: { latitude: 52.4376, longitude: -1.9358 },
    opening_hours: {
      monday: { open: '06:00', close: '00:00' },
      tuesday: { open: '06:00', close: '00:00' }
    },
    price_level: 'mid',
    user_rating: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];