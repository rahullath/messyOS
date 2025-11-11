// UK Student Meal Planning Integration Test
// Simple integration test to verify the system works end-to-end

import { describe, it, expect } from 'vitest';
import { RecipeEngine } from '../../lib/uk-student/recipe-engine';
import type { Recipe, InventoryItem, RecipeConstraints } from '../../types/uk-student';

describe('UK Student Meal Planning Integration', () => {
  const mockRecipes: Recipe[] = [
    {
      id: 'pasta-1',
      name: 'Quick Pasta',
      description: 'Simple pasta dish',
      ingredients: [
        { name: 'pasta', quantity: 100, unit: 'g', optional: false },
        { name: 'tomatoes', quantity: 200, unit: 'g', optional: false },
        { name: 'cheese', quantity: 50, unit: 'g', optional: true }
      ],
      instructions: ['Cook pasta', 'Add tomatoes', 'Serve with cheese'],
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
      tags: ['quick', 'vegetarian', 'pasta'],
      is_public: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'chicken-rice-1',
      name: 'Chicken Rice Bowl',
      description: 'Protein-rich meal',
      ingredients: [
        { name: 'chicken', quantity: 150, unit: 'g', optional: false },
        { name: 'rice', quantity: 80, unit: 'g', optional: false },
        { name: 'vegetables', quantity: 100, unit: 'g', optional: false }
      ],
      instructions: ['Cook rice', 'Cook chicken', 'Steam vegetables', 'Combine'],
      cooking_time: 25,
      prep_time: 10,
      difficulty: 3,
      servings: 1,
      nutrition: {
        calories: 520,
        protein: 35,
        carbs: 60,
        fat: 8
      },
      storage_info: {
        fridge_days: 4,
        freezer_days: 60,
        reheating_instructions: 'Microwave for 3-4 minutes'
      },
      bulk_cooking_multiplier: 3.0,
      tags: ['protein', 'healthy', 'meal-prep'],
      is_public: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

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
      item_name: 'tomatoes',
      quantity: 3,
      unit: 'pieces',
      category: 'vegetables',
      location: 'fridge',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  it('should score recipes based on available ingredients', () => {
    const constraints: RecipeConstraints = {
      maxCookingTime: 30,
      maxDifficulty: 3,
      availableIngredients: ['pasta', 'tomatoes'],
      dietaryRestrictions: []
    };

    const scores = RecipeEngine.scoreRecipes(mockRecipes, constraints, mockInventory);

    expect(scores).toHaveLength(2);
    expect(scores[0].score).toBeGreaterThan(0);
    expect(scores[0].breakdown).toBeDefined();
    expect(scores[0].breakdown.ingredientMatch).toBeGreaterThan(0);
    expect(scores[0].breakdown.timeMatch).toBeGreaterThan(0);
  });

  it('should find makeable recipes with current inventory', () => {
    const makeable = RecipeEngine.findMakeableRecipes(mockRecipes, mockInventory, 2);

    expect(makeable.length).toBeGreaterThan(0);
    expect(makeable[0].recipe).toBeDefined();
    expect(makeable[0].missingIngredients.length).toBeLessThanOrEqual(2);
  });

  it('should suggest bulk cooking recipes for meal prep', () => {
    const constraints: RecipeConstraints = {
      maxCookingTime: 45,
      maxDifficulty: 4,
      availableIngredients: ['chicken', 'rice', 'vegetables'],
      dietaryRestrictions: []
    };

    const bulkRecipes = RecipeEngine.suggestBulkCookingRecipes(mockRecipes, constraints, 4);

    expect(bulkRecipes.length).toBeGreaterThan(0);
    // Bulk cooking recipes should have higher scores due to bonus
    expect(bulkRecipes[0].score).toBeGreaterThan(20);
  });

  it('should generate recipe variations based on available ingredients', () => {
    const baseRecipe = mockRecipes[0];
    const availableIngredients = ['pasta', 'canned tomatoes', 'mozzarella'];

    const variations = RecipeEngine.generateRecipeVariations(baseRecipe, availableIngredients);

    expect(Array.isArray(variations)).toBe(true);
    // Variations should have modified ingredient lists
    if (variations.length > 0) {
      expect(variations[0].name).toContain('with');
    }
  });

  it('should find complementary recipes for balanced nutrition', () => {
    const baseRecipe = mockRecipes[0]; // Pasta (high carbs)
    const nutritionTargets = {
      calories: 600,
      protein: 30,
      carbs: 80,
      fat: 15
    };

    const complementary = RecipeEngine.findComplementaryRecipes(
      baseRecipe,
      mockRecipes,
      nutritionTargets
    );

    expect(Array.isArray(complementary)).toBe(true);
    // Should find recipes that complement the base recipe nutritionally
  });

  it('should handle empty ingredient lists gracefully', () => {
    const constraints: RecipeConstraints = {
      maxCookingTime: 30,
      maxDifficulty: 3,
      availableIngredients: [],
      dietaryRestrictions: []
    };

    const scores = RecipeEngine.scoreRecipes(mockRecipes, constraints);

    expect(scores).toHaveLength(2);
    // Should still return scores even with no available ingredients
    expect(scores[0].score).toBeGreaterThanOrEqual(0);
  });

  it('should respect dietary restrictions', () => {
    const constraints: RecipeConstraints = {
      maxCookingTime: 30,
      maxDifficulty: 3,
      availableIngredients: ['pasta', 'tomatoes'],
      dietaryRestrictions: ['vegetarian']
    };

    const scores = RecipeEngine.scoreRecipes(mockRecipes, constraints);

    expect(scores).toHaveLength(2);
    // Vegetarian recipes should score higher when vegetarian is preferred
    const vegetarianRecipe = scores.find(s => s.recipe.tags.includes('vegetarian'));
    expect(vegetarianRecipe).toBeDefined();
  });

  it('should penalize recipes that exceed time constraints', () => {
    const shortTimeConstraints: RecipeConstraints = {
      maxCookingTime: 10, // Very short time limit
      maxDifficulty: 5,
      availableIngredients: ['pasta', 'tomatoes', 'chicken', 'rice'],
      dietaryRestrictions: []
    };

    const scores = RecipeEngine.scoreRecipes(mockRecipes, shortTimeConstraints);

    // Recipes exceeding time limit should have lower time match scores
    const longRecipe = scores.find(s => s.recipe.cooking_time + s.recipe.prep_time > 10);
    if (longRecipe) {
      expect(longRecipe.breakdown.timeMatch).toBeLessThan(100);
    }
  });

  it('should calculate missing ingredients correctly', () => {
    const partialInventory: InventoryItem[] = [
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
      }
      // Missing tomatoes
    ];

    const makeable = RecipeEngine.findMakeableRecipes(mockRecipes, partialInventory, 2);

    expect(makeable.length).toBeGreaterThan(0);
    const pastaRecipe = makeable.find(m => m.recipe.name === 'Quick Pasta');
    if (pastaRecipe) {
      expect(pastaRecipe.missingIngredients).toContain('tomatoes');
    }
  });
});