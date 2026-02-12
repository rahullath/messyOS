// UK Student Meal Planning API Endpoints
// RESTful API for meal planning, inventory management, and shopping optimization

import type { APIRoute } from 'astro';
import { MealPlanningService } from '../../../lib/uk-student/meal-planning-service';
import { InventoryService } from '../../../lib/uk-student/inventory-service';
import { RecipeEngine } from '../../../lib/uk-student/recipe-engine';
import { ShoppingOptimizer } from '../../../lib/uk-student/shopping-optimizer';
import { UKLocationService } from '../../../lib/uk-student/location-service';
import type {
  MealConstraints,
  RecipeConstraints,
  InventoryUpdateRequest,
  ShoppingConstraints
} from '../../../types/uk-student';

// Helper function to get user ID from request
async function getUserId(request: Request): Promise<string | null> {
  // In a real implementation, this would extract user ID from JWT token or session
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  // For now, return a test user ID
  return 'test-user-id';
}

// Helper function to send JSON response
function jsonResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // Route: GET /api/uk-student/meal-planning/plan
    if (pathname.endsWith('/plan')) {
      const weekStart = searchParams.get('week_start');
      const mealPlanningService = new MealPlanningService(userId);
      
      if (weekStart) {
        // Get specific week's meal plan
        // In a real implementation, this would query the database
        return jsonResponse({ message: 'Get meal plan for specific week', week_start: weekStart });
      } else {
        // Get current week's meal plan
        return jsonResponse({ message: 'Get current meal plan' });
      }
    }

    // Route: GET /api/uk-student/meal-planning/inventory
    if (pathname.endsWith('/inventory')) {
      const inventoryService = new InventoryService(userId);
      const location = searchParams.get('location') as 'fridge' | 'pantry' | 'freezer' | null;
      
      if (location) {
        const inventory = await inventoryService.getInventoryByLocation(location);
        return jsonResponse({ inventory });
      } else {
        const [inventory, status, alerts] = await Promise.all([
          inventoryService.getAllInventory(),
          inventoryService.getInventoryStatus(),
          inventoryService.getExpiryAlerts()
        ]);
        
        return jsonResponse({ inventory, status, alerts });
      }
    }

    // Route: GET /api/uk-student/meal-planning/recipes/suggest
    if (pathname.endsWith('/recipes/suggest')) {
      const ingredients = searchParams.get('ingredients')?.split(',') || [];
      const maxTime = parseInt(searchParams.get('max_time') || '30');
      const tags = searchParams.get('tags')?.split(',') || [];
      const difficulty = parseInt(searchParams.get('difficulty') || '5');
      
      const mealPlanningService = new MealPlanningService(userId);
      const recipes = await mealPlanningService.suggestRecipes(ingredients, maxTime, {
        tags,
        difficulty,
        limit: 10
      });
      
      return jsonResponse({ recipes });
    }

    // Route: GET /api/uk-student/meal-planning/recipes/score
    if (pathname.endsWith('/recipes/score')) {
      const ingredients = searchParams.get('ingredients')?.split(',') || [];
      const maxTime = parseInt(searchParams.get('max_time') || '30');
      const maxDifficulty = parseInt(searchParams.get('max_difficulty') || '5');
      const dietaryRestrictions = searchParams.get('dietary_restrictions')?.split(',') || [];
      
      const constraints: RecipeConstraints = {
        maxCookingTime: maxTime,
        maxDifficulty,
        availableIngredients: ingredients,
        dietaryRestrictions
      };

      // In a real implementation, this would fetch recipes from database
      const mockRecipes = []; // Would be populated from database
      const inventoryService = new InventoryService(userId);
      const inventory = await inventoryService.getAllInventory();
      
      const scores = RecipeEngine.scoreRecipes(mockRecipes, constraints, inventory);
      return jsonResponse({ scores });
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
  } catch (error) {
    console.error('GET Error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
};

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const pathname = url.pathname;
    const body = await request.json();

    // Route: POST /api/uk-student/meal-planning/plan/generate
    if (pathname.endsWith('/plan/generate')) {
      const constraints: MealConstraints = body;
      const mealPlanningService = new MealPlanningService(userId);
      
      const mealPlan = await mealPlanningService.generateWeeklyPlan(constraints);
      return jsonResponse({ meal_plan: mealPlan });
    }

    // Route: POST /api/uk-student/meal-planning/inventory
    if (pathname.endsWith('/inventory')) {
      const item: InventoryUpdateRequest = body;
      const inventoryService = new InventoryService(userId);
      
      const newItem = await inventoryService.addInventoryItem(item);
      return jsonResponse({ item: newItem }, 201);
    }

    // Route: POST /api/uk-student/meal-planning/inventory/bulk
    if (pathname.endsWith('/inventory/bulk')) {
      const items: InventoryUpdateRequest[] = body.items;
      const inventoryService = new InventoryService(userId);
      
      const results = await inventoryService.bulkUpdateInventory(items);
      return jsonResponse({ items: results });
    }

    // Route: POST /api/uk-student/meal-planning/shopping/optimize
    if (pathname.endsWith('/shopping/optimize')) {
      const { shopping_list, constraints } = body;
      const locationService = new UKLocationService();
      const shoppingOptimizer = new ShoppingOptimizer(locationService);
      
      // In a real implementation, this would fetch stores from database
      const mockStores = []; // Would be populated from database
      
      const optimized = await shoppingOptimizer.optimizeShoppingList(
        shopping_list,
        mockStores,
        constraints
      );
      
      return jsonResponse({ optimized_list: optimized });
    }

    // Route: POST /api/uk-student/meal-planning/recipes/bulk-cooking
    if (pathname.endsWith('/recipes/bulk-cooking')) {
      const { constraints, days } = body;
      
      // In a real implementation, this would fetch recipes from database
      const mockRecipes = []; // Would be populated from database
      
      const bulkRecipes = RecipeEngine.suggestBulkCookingRecipes(mockRecipes, constraints, days);
      return jsonResponse({ bulk_recipes: bulkRecipes });
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
  } catch (error) {
    console.error('POST Error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, url }) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const pathname = url.pathname;
    const body = await request.json();

    // Route: PUT /api/uk-student/meal-planning/inventory/:id
    const inventoryMatch = pathname.match(/\/inventory\/([^\/]+)$/);
    if (inventoryMatch) {
      const itemId = inventoryMatch[1];
      const updates = body;
      const inventoryService = new InventoryService(userId);
      
      const updatedItem = await inventoryService.updateInventoryItem(itemId, updates);
      return jsonResponse({ item: updatedItem });
    }

    // Route: PUT /api/uk-student/meal-planning/inventory/:id/consume
    const consumeMatch = pathname.match(/\/inventory\/([^\/]+)\/consume$/);
    if (consumeMatch) {
      const itemId = consumeMatch[1];
      const { quantity_used } = body;
      const inventoryService = new InventoryService(userId);
      
      const result = await inventoryService.consumeInventoryItem(itemId, quantity_used);
      return jsonResponse({ item: result });
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
  } catch (error) {
    console.error('PUT Error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const pathname = url.pathname;

    // Route: DELETE /api/uk-student/meal-planning/inventory/:id
    const inventoryMatch = pathname.match(/\/inventory\/([^\/]+)$/);
    if (inventoryMatch) {
      const itemId = inventoryMatch[1];
      const inventoryService = new InventoryService(userId);
      
      await inventoryService.deleteInventoryItem(itemId);
      return jsonResponse({ message: 'Item deleted successfully' });
    }

    return jsonResponse({ error: 'Endpoint not found' }, 404);
  } catch (error) {
    console.error('DELETE Error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};