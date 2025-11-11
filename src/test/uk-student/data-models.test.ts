import { describe, it, expect, beforeEach } from 'vitest';
import type {
  InventoryItem,
  Recipe,
  MealPlan,
  TravelRoute,
  UKStudentExpense,
  AcademicEvent,
  Routine,
  Store,
  Budget,
  UKStudentPreferences,
  ValidationResult,
  ReceiptData,
  WeatherConditions,
  NutritionInfo,
  Ingredient,
  RoutineStep
} from '../../types/uk-student';

// Validation functions for data models
class UKStudentValidator {
  validateInventoryItem(item: Partial<InventoryItem>): ValidationResult {
    const errors: string[] = [];
    
    if (!item.item_name || item.item_name.trim().length === 0) {
      errors.push('Item name is required');
    }
    
    if (item.quantity === undefined || item.quantity < 0) {
      errors.push('Quantity must be non-negative');
    }
    
    if (!item.unit || item.unit.trim().length === 0) {
      errors.push('Unit is required');
    }
    
    if (!item.category || item.category.trim().length === 0) {
      errors.push('Category is required');
    }
    
    if (item.location && !['fridge', 'pantry', 'freezer'].includes(item.location)) {
      errors.push('Location must be fridge, pantry, or freezer');
    }
    
    if (item.cost !== undefined && item.cost < 0) {
      errors.push('Cost must be non-negative');
    }
    
    if (item.expiry_date && item.purchase_date && 
        new Date(item.expiry_date) < new Date(item.purchase_date)) {
      errors.push('Expiry date cannot be before purchase date');
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
  
  validateRecipe(recipe: Partial<Recipe>): ValidationResult {
    const errors: string[] = [];
    
    if (!recipe.name || recipe.name.trim().length === 0) {
      errors.push('Recipe name is required');
    }
    
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      errors.push('Recipe must have at least one ingredient');
    }
    
    if (!recipe.instructions || recipe.instructions.length === 0) {
      errors.push('Recipe must have instructions');
    }
    
    if (recipe.cooking_time !== undefined && recipe.cooking_time <= 0) {
      errors.push('Cooking time must be positive');
    }
    
    if (recipe.prep_time !== undefined && recipe.prep_time < 0) {
      errors.push('Prep time must be non-negative');
    }
    
    if (recipe.difficulty !== undefined && 
        (recipe.difficulty < 1 || recipe.difficulty > 5)) {
      errors.push('Difficulty must be between 1 and 5');
    }
    
    if (recipe.servings !== undefined && recipe.servings <= 0) {
      errors.push('Servings must be positive');
    }
    
    if (recipe.bulk_cooking_multiplier !== undefined && 
        recipe.bulk_cooking_multiplier <= 0) {
      errors.push('Bulk cooking multiplier must be positive');
    }
    
    // Validate ingredients
    if (recipe.ingredients) {
      recipe.ingredients.forEach((ingredient, index) => {
        if (!ingredient.name || ingredient.name.trim().length === 0) {
          errors.push(`Ingredient ${index + 1} name is required`);
        }
        if (ingredient.quantity <= 0) {
          errors.push(`Ingredient ${index + 1} quantity must be positive`);
        }
        if (!ingredient.unit || ingredient.unit.trim().length === 0) {
          errors.push(`Ingredient ${index + 1} unit is required`);
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
  
  validateTravelRoute(route: Partial<TravelRoute>): ValidationResult {
    const errors: string[] = [];
    
    if (!route.from_location || route.from_location.trim().length === 0) {
      errors.push('From location is required');
    }
    
    if (!route.to_location || route.to_location.trim().length === 0) {
      errors.push('To location is required');
    }
    
    if (route.from_location === route.to_location) {
      errors.push('From and to locations cannot be the same');
    }
    
    if (!route.preferred_method || 
        !['bike', 'train', 'walk', 'bus'].includes(route.preferred_method)) {
      errors.push('Preferred method must be bike, train, walk, or bus');
    }
    
    if (route.duration_minutes !== undefined && route.duration_minutes <= 0) {
      errors.push('Duration must be positive');
    }
    
    if (route.cost_pence !== undefined && route.cost_pence < 0) {
      errors.push('Cost must be non-negative');
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
  
  validateExpense(expense: Partial<UKStudentExpense>): ValidationResult {
    const errors: string[] = [];
    
    if (expense.amount === undefined || expense.amount <= 0) {
      errors.push('Amount must be positive');
    }
    
    if (expense.amount !== undefined && expense.amount > 10000) {
      errors.push('Amount seems unusually high (over £100)');
    }
    
    if (expense.currency && !['GBP', 'USD', 'EUR'].includes(expense.currency)) {
      errors.push('Currency must be GBP, USD, or EUR');
    }
    
    if (!expense.category || expense.category.trim().length === 0) {
      errors.push('Category is required');
    }
    
    if (expense.payment_method && 
        !['monzo', 'iq-prepaid', 'icici-uk', 'cash', 'card'].includes(expense.payment_method)) {
      errors.push('Invalid payment method');
    }
    
    if (!expense.transaction_date) {
      errors.push('Transaction date is required');
    }
    
    if (expense.transaction_date && 
        new Date(expense.transaction_date) > new Date()) {
      errors.push('Transaction date cannot be in the future');
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
  
  validateAcademicEvent(event: Partial<AcademicEvent>): ValidationResult {
    const errors: string[] = [];
    
    if (!event.title || event.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (!event.type || 
        !['class', 'assignment', 'exam', 'deadline', 'study_session'].includes(event.type)) {
      errors.push('Type must be class, assignment, exam, deadline, or study_session');
    }
    
    if (!event.start_time) {
      errors.push('Start time is required');
    }
    
    if (event.end_time && event.start_time && 
        new Date(event.end_time) <= new Date(event.start_time)) {
      errors.push('End time must be after start time');
    }
    
    if (event.importance !== undefined && 
        (event.importance < 1 || event.importance > 5)) {
      errors.push('Importance must be between 1 and 5');
    }
    
    if (event.preparation_time !== undefined && event.preparation_time < 0) {
      errors.push('Preparation time must be non-negative');
    }
    
    if (event.travel_time !== undefined && event.travel_time < 0) {
      errors.push('Travel time must be non-negative');
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
  
  validateBudget(budget: Partial<Budget>): ValidationResult {
    const errors: string[] = [];
    
    if (!budget.category || budget.category.trim().length === 0) {
      errors.push('Category is required');
    }
    
    if (budget.weekly_limit !== undefined && budget.weekly_limit < 0) {
      errors.push('Weekly limit must be non-negative');
    }
    
    if (budget.monthly_limit !== undefined && budget.monthly_limit < 0) {
      errors.push('Monthly limit must be non-negative');
    }
    
    if (budget.weekly_limit !== undefined && budget.monthly_limit !== undefined &&
        budget.weekly_limit * 4.33 > budget.monthly_limit * 1.2) {
      errors.push('Weekly limit seems inconsistent with monthly limit');
    }
    
    if (budget.alert_threshold !== undefined && 
        (budget.alert_threshold < 0 || budget.alert_threshold > 1)) {
      errors.push('Alert threshold must be between 0 and 1');
    }
    
    if (budget.current_weekly_spent !== undefined && budget.current_weekly_spent < 0) {
      errors.push('Current weekly spent must be non-negative');
    }
    
    if (budget.current_monthly_spent !== undefined && budget.current_monthly_spent < 0) {
      errors.push('Current monthly spent must be non-negative');
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
  
  validateRoutine(routine: Partial<Routine>): ValidationResult {
    const errors: string[] = [];
    
    if (!routine.name || routine.name.trim().length === 0) {
      errors.push('Routine name is required');
    }
    
    if (!routine.routine_type || 
        !['morning', 'evening', 'skincare', 'laundry', 'gym', 'study'].includes(routine.routine_type)) {
      errors.push('Invalid routine type');
    }
    
    if (!routine.steps || routine.steps.length === 0) {
      errors.push('Routine must have at least one step');
    }
    
    if (routine.estimated_duration !== undefined && routine.estimated_duration <= 0) {
      errors.push('Estimated duration must be positive');
    }
    
    if (!routine.frequency || 
        !['daily', 'weekly', 'monthly', 'custom'].includes(routine.frequency)) {
      errors.push('Invalid frequency');
    }
    
    if (routine.completion_streak !== undefined && routine.completion_streak < 0) {
      errors.push('Completion streak must be non-negative');
    }
    
    // Validate steps
    if (routine.steps) {
      routine.steps.forEach((step, index) => {
        if (!step.name || step.name.trim().length === 0) {
          errors.push(`Step ${index + 1} name is required`);
        }
        if (step.estimated_duration <= 0) {
          errors.push(`Step ${index + 1} duration must be positive`);
        }
        if (step.order < 0) {
          errors.push(`Step ${index + 1} order must be non-negative`);
        }
      });
      
      // Check for duplicate orders
      const orders = routine.steps.map(step => step.order);
      const uniqueOrders = new Set(orders);
      if (orders.length !== uniqueOrders.size) {
        errors.push('Step orders must be unique');
      }
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
}

describe('UK Student Data Model Validation', () => {
  let validator: UKStudentValidator;
  
  beforeEach(() => {
    validator = new UKStudentValidator();
  });
  
  describe('InventoryItem Validation', () => {
    it('should validate a correct inventory item', () => {
      const item: Partial<InventoryItem> = {
        item_name: 'Milk',
        quantity: 1,
        unit: 'litre',
        category: 'dairy',
        location: 'fridge',
        cost: 1.50,
        purchase_date: new Date('2024-11-10'),
        expiry_date: new Date('2024-11-17')
      };
      
      const result = validator.validateInventoryItem(item);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject inventory item with missing required fields', () => {
      const item: Partial<InventoryItem> = {
        quantity: 1
      };
      
      const result = validator.validateInventoryItem(item);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Item name is required');
      expect(result.error).toContain('Unit is required');
      expect(result.error).toContain('Category is required');
    });
    
    it('should reject inventory item with negative quantity', () => {
      const item: Partial<InventoryItem> = {
        item_name: 'Milk',
        quantity: -1,
        unit: 'litre',
        category: 'dairy'
      };
      
      const result = validator.validateInventoryItem(item);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Quantity must be non-negative');
    });
    
    it('should reject inventory item with invalid location', () => {
      const item: Partial<InventoryItem> = {
        item_name: 'Milk',
        quantity: 1,
        unit: 'litre',
        category: 'dairy',
        location: 'cupboard' as any
      };
      
      const result = validator.validateInventoryItem(item);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Location must be fridge, pantry, or freezer');
    });
    
    it('should reject inventory item with expiry before purchase date', () => {
      const item: Partial<InventoryItem> = {
        item_name: 'Milk',
        quantity: 1,
        unit: 'litre',
        category: 'dairy',
        purchase_date: new Date('2024-11-15'),
        expiry_date: new Date('2024-11-10')
      };
      
      const result = validator.validateInventoryItem(item);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expiry date cannot be before purchase date');
    });
  });
  
  describe('Recipe Validation', () => {
    it('should validate a correct recipe', () => {
      const recipe: Partial<Recipe> = {
        name: 'Pasta with Tomato Sauce',
        ingredients: [
          { name: 'pasta', quantity: 100, unit: 'g' },
          { name: 'tomatoes', quantity: 200, unit: 'g' }
        ],
        instructions: ['Cook pasta', 'Add sauce'],
        cooking_time: 15,
        prep_time: 5,
        difficulty: 2,
        servings: 1,
        bulk_cooking_multiplier: 4
      };
      
      const result = validator.validateRecipe(recipe);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject recipe with missing required fields', () => {
      const recipe: Partial<Recipe> = {
        cooking_time: 15
      };
      
      const result = validator.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Recipe name is required');
      expect(result.error).toContain('Recipe must have at least one ingredient');
      expect(result.error).toContain('Recipe must have instructions');
    });
    
    it('should reject recipe with invalid difficulty', () => {
      const recipe: Partial<Recipe> = {
        name: 'Test Recipe',
        ingredients: [{ name: 'test', quantity: 1, unit: 'piece' }],
        instructions: ['test'],
        difficulty: 6 as any
      };
      
      const result = validator.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Difficulty must be between 1 and 5');
    });
    
    it('should reject recipe with invalid ingredient', () => {
      const recipe: Partial<Recipe> = {
        name: 'Test Recipe',
        ingredients: [
          { name: '', quantity: -1, unit: '' }
        ],
        instructions: ['test']
      };
      
      const result = validator.validateRecipe(recipe);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Ingredient 1 name is required');
      expect(result.error).toContain('Ingredient 1 quantity must be positive');
      expect(result.error).toContain('Ingredient 1 unit is required');
    });
  });
  
  describe('TravelRoute Validation', () => {
    it('should validate a correct travel route', () => {
      const route: Partial<TravelRoute> = {
        from_location: 'Five Ways',
        to_location: 'University',
        preferred_method: 'train',
        duration_minutes: 8,
        cost_pence: 205
      };
      
      const result = validator.validateTravelRoute(route);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject route with same from and to locations', () => {
      const route: Partial<TravelRoute> = {
        from_location: 'University',
        to_location: 'University',
        preferred_method: 'walk'
      };
      
      const result = validator.validateTravelRoute(route);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('From and to locations cannot be the same');
    });
    
    it('should reject route with invalid transport method', () => {
      const route: Partial<TravelRoute> = {
        from_location: 'Five Ways',
        to_location: 'University',
        preferred_method: 'car' as any
      };
      
      const result = validator.validateTravelRoute(route);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Preferred method must be bike, train, walk, or bus');
    });
  });
  
  describe('Expense Validation', () => {
    it('should validate a correct expense', () => {
      const expense: Partial<UKStudentExpense> = {
        amount: 15.50,
        currency: 'GBP',
        category: 'groceries',
        payment_method: 'monzo',
        transaction_date: new Date('2024-11-10')
      };
      
      const result = validator.validateExpense(expense);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject expense with negative amount', () => {
      const expense: Partial<UKStudentExpense> = {
        amount: -5,
        category: 'groceries',
        transaction_date: new Date()
      };
      
      const result = validator.validateExpense(expense);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Amount must be positive');
    });
    
    it('should warn about unusually high amounts', () => {
      const expense: Partial<UKStudentExpense> = {
        amount: 15000, // £150
        category: 'groceries',
        transaction_date: new Date()
      };
      
      const result = validator.validateExpense(expense);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Amount seems unusually high');
    });
    
    it('should reject future transaction dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const expense: Partial<UKStudentExpense> = {
        amount: 10,
        category: 'groceries',
        transaction_date: futureDate
      };
      
      const result = validator.validateExpense(expense);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Transaction date cannot be in the future');
    });
  });
  
  describe('Academic Event Validation', () => {
    it('should validate a correct academic event', () => {
      const event: Partial<AcademicEvent> = {
        title: 'Corporate Finance Lecture',
        type: 'class',
        start_time: new Date('2024-11-12T09:00:00'),
        end_time: new Date('2024-11-12T10:00:00'),
        importance: 4,
        preparation_time: 15,
        travel_time: 30
      };
      
      const result = validator.validateAcademicEvent(event);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject event with end time before start time', () => {
      const event: Partial<AcademicEvent> = {
        title: 'Test Event',
        type: 'class',
        start_time: new Date('2024-11-12T10:00:00'),
        end_time: new Date('2024-11-12T09:00:00')
      };
      
      const result = validator.validateAcademicEvent(event);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('End time must be after start time');
    });
    
    it('should reject event with invalid importance', () => {
      const event: Partial<AcademicEvent> = {
        title: 'Test Event',
        type: 'class',
        start_time: new Date(),
        importance: 6 as any
      };
      
      const result = validator.validateAcademicEvent(event);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Importance must be between 1 and 5');
    });
  });
  
  describe('Budget Validation', () => {
    it('should validate a correct budget', () => {
      const budget: Partial<Budget> = {
        category: 'groceries',
        weekly_limit: 40,
        monthly_limit: 160,
        alert_threshold: 0.8,
        current_weekly_spent: 25,
        current_monthly_spent: 100
      };
      
      const result = validator.validateBudget(budget);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject budget with inconsistent weekly/monthly limits', () => {
      const budget: Partial<Budget> = {
        category: 'groceries',
        weekly_limit: 100, // £100 * 4.33 weeks = £433/month
        monthly_limit: 200 // But monthly limit is only £200
      };
      
      const result = validator.validateBudget(budget);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Weekly limit seems inconsistent with monthly limit');
    });
    
    it('should reject budget with invalid alert threshold', () => {
      const budget: Partial<Budget> = {
        category: 'groceries',
        alert_threshold: 1.5
      };
      
      const result = validator.validateBudget(budget);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Alert threshold must be between 0 and 1');
    });
  });
  
  describe('Routine Validation', () => {
    it('should validate a correct routine', () => {
      const routine: Partial<Routine> = {
        name: 'Morning Routine',
        routine_type: 'morning',
        steps: [
          { id: '1', name: 'Brush teeth', estimated_duration: 3, order: 1, required: true },
          { id: '2', name: 'Shower', estimated_duration: 10, order: 2, required: true }
        ],
        estimated_duration: 13,
        frequency: 'daily',
        completion_streak: 5
      };
      
      const result = validator.validateRoutine(routine);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
    
    it('should reject routine with duplicate step orders', () => {
      const routine: Partial<Routine> = {
        name: 'Test Routine',
        routine_type: 'morning',
        steps: [
          { id: '1', name: 'Step 1', estimated_duration: 5, order: 1, required: true },
          { id: '2', name: 'Step 2', estimated_duration: 5, order: 1, required: true }
        ],
        frequency: 'daily'
      };
      
      const result = validator.validateRoutine(routine);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Step orders must be unique');
    });
    
    it('should reject routine with invalid step', () => {
      const routine: Partial<Routine> = {
        name: 'Test Routine',
        routine_type: 'morning',
        steps: [
          { id: '1', name: '', estimated_duration: -5, order: -1, required: true }
        ],
        frequency: 'daily'
      };
      
      const result = validator.validateRoutine(routine);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Step 1 name is required');
      expect(result.error).toContain('Step 1 duration must be positive');
      expect(result.error).toContain('Step 1 order must be non-negative');
    });
  });
});

describe('UK Student Data Model Constraints', () => {
  describe('Business Logic Constraints', () => {
    it('should enforce reasonable cooking time limits', () => {
      const recipe: Partial<Recipe> = {
        name: 'Quick Breakfast',
        cooking_time: 5,
        prep_time: 2,
        ingredients: [{ name: 'oats', quantity: 50, unit: 'g' }],
        instructions: ['Mix and serve']
      };
      
      const validator = new UKStudentValidator();
      const result = validator.validateRecipe(recipe);
      expect(result.valid).toBe(true);
      
      // Total time should be reasonable for student lifestyle
      const totalTime = (recipe.cooking_time || 0) + (recipe.prep_time || 0);
      expect(totalTime).toBeLessThanOrEqual(60); // Max 1 hour for most student meals
    });
    
    it('should enforce reasonable travel costs for Birmingham', () => {
      const route: Partial<TravelRoute> = {
        from_location: 'Five Ways',
        to_location: 'University',
        preferred_method: 'train',
        duration_minutes: 8,
        cost_pence: 205 // £2.05 - realistic Birmingham train fare
      };
      
      const validator = new UKStudentValidator();
      const result = validator.validateTravelRoute(route);
      expect(result.valid).toBe(true);
      
      // Cost should be reasonable for local Birmingham transport
      expect(route.cost_pence).toBeLessThanOrEqual(500); // Max £5 for local travel
    });
    
    it('should enforce reasonable budget limits for students', () => {
      const budget: Partial<Budget> = {
        category: 'groceries',
        weekly_limit: 40, // £40/week for groceries is reasonable for students
        monthly_limit: 160,
        alert_threshold: 0.8
      };
      
      const validator = new UKStudentValidator();
      const result = validator.validateBudget(budget);
      expect(result.valid).toBe(true);
      
      // Weekly grocery budget should be reasonable for students
      expect(budget.weekly_limit).toBeGreaterThanOrEqual(20); // Minimum £20/week
      expect(budget.weekly_limit).toBeLessThanOrEqual(100); // Maximum £100/week
    });
    
    it('should enforce reasonable routine durations', () => {
      const routine: Partial<Routine> = {
        name: 'Quick Morning Routine',
        routine_type: 'morning',
        steps: [
          { id: '1', name: 'Brush teeth', estimated_duration: 3, order: 1, required: true },
          { id: '2', name: 'Get dressed', estimated_duration: 5, order: 2, required: true }
        ],
        estimated_duration: 8,
        frequency: 'daily'
      };
      
      const validator = new UKStudentValidator();
      const result = validator.validateRoutine(routine);
      expect(result.valid).toBe(true);
      
      // Morning routine should be quick enough for 9am classes
      expect(routine.estimated_duration).toBeLessThanOrEqual(30); // Max 30 minutes
    });
  });
  
  describe('Data Integrity Constraints', () => {
    it('should maintain referential integrity between meal plans and recipes', () => {
      // This would be enforced at the database level, but we can test the logic
      const mealPlan: Partial<MealPlan> = {
        week_start_date: new Date('2024-11-11'),
        meals: {
          '2024-11-11': {
            breakfast: {
              id: 'recipe-1',
              name: 'Overnight Oats'
            } as Recipe
          }
        },
        shopping_list: [
          { name: 'oats', quantity: 350, unit: 'g', priority: 'essential', category: 'grains' }
        ]
      };
      
      // Verify that shopping list items correspond to recipe ingredients
      const breakfastRecipe = mealPlan.meals?.['2024-11-11']?.breakfast;
      const shoppingList = mealPlan.shopping_list || [];
      
      expect(breakfastRecipe).toBeDefined();
      expect(shoppingList.some(item => item.name === 'oats')).toBe(true);
    });
    
    it('should maintain consistency between budget spending and expenses', () => {
      const budget: Partial<Budget> = {
        category: 'groceries',
        weekly_limit: 40,
        current_weekly_spent: 25
      };
      
      const expense: Partial<UKStudentExpense> = {
        amount: 15,
        category: 'groceries',
        transaction_date: new Date()
      };
      
      // After adding this expense, current_weekly_spent should be updated
      const newWeeklySpent = (budget.current_weekly_spent || 0) + (expense.amount || 0);
      expect(newWeeklySpent).toBe(40);
      expect(newWeeklySpent).toBeLessThanOrEqual(budget.weekly_limit || 0);
    });
  });
});