// API endpoint for shopping list optimization
import type { APIRoute } from 'astro';
import { ShoppingOptimizer } from '../../../../lib/uk-student/shopping-optimizer';
import { UKLocationService } from '../../../../lib/uk-student/location-service';
import type { 
  ShoppingItem, 
  Store, 
  ShoppingConstraints 
} from '../../../../types/uk-student';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { 
      items, 
      stores, 
      constraints = {} 
    } = body as {
      items: ShoppingItem[];
      stores: Store[];
      constraints: ShoppingConstraints;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Shopping items are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Store list is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize services
    const locationService = new UKLocationService();
    const shoppingOptimizer = new ShoppingOptimizer(locationService);

    // Optimize shopping list
    const optimizedList = await shoppingOptimizer.optimizeShoppingList(
      items,
      stores,
      constraints
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: optimizedList 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error optimizing shopping list:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to optimize shopping list',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};