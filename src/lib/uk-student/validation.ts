// UK Student Data Validation Utilities
import type {
  InventoryItem,
  Recipe,
  TravelRoute,
  UKStudentExpense,
  AcademicEvent,
  Routine,
  Budget,
  ValidationResult
} from '../../types/uk-student';

/**
 * Validation utility class for UK Student data models
 * Provides comprehensive validation for all UK student life optimization data types
 */
export class UKStudentValidator {
  /**
   * Validates an inventory item for completeness and business rules
   */
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
  
  /**
   * Validates a recipe for completeness and cooking constraints
   */
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
  
  /**
   * Validates a travel route for Birmingham-specific constraints
   */
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
    
    // Birmingham-specific validation
    if (route.cost_pence !== undefined && route.cost_pence > 500) {
      errors.push('Cost seems high for local Birmingham travel (over £5)');
    }
    
    return {
      valid: errors.length === 0,
      error: errors.length > 0 ? errors.join(', ') : undefined
    };
  }
  
  /**
   * Validates a UK student expense with financial constraints
   */
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
  
  /**
   * Validates an academic event for university scheduling
   */
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
  
  /**
   * Validates a budget with student-appropriate limits
   */
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
  
  /**
   * Validates a routine with realistic time constraints
   */
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

// Export a singleton instance for convenience
export const ukStudentValidator = new UKStudentValidator();

// Export validation helper functions
export const validateInventoryItem = (item: Partial<InventoryItem>) => 
  ukStudentValidator.validateInventoryItem(item);

export const validateRecipe = (recipe: Partial<Recipe>) => 
  ukStudentValidator.validateRecipe(recipe);

export const validateTravelRoute = (route: Partial<TravelRoute>) => 
  ukStudentValidator.validateTravelRoute(route);

export const validateExpense = (expense: Partial<UKStudentExpense>) => 
  ukStudentValidator.validateExpense(expense);

export const validateAcademicEvent = (event: Partial<AcademicEvent>) => 
  ukStudentValidator.validateAcademicEvent(event);

export const validateBudget = (budget: Partial<Budget>) => 
  ukStudentValidator.validateBudget(budget);

export const validateRoutine = (routine: Partial<Routine>) => 
  ukStudentValidator.validateRoutine(routine);