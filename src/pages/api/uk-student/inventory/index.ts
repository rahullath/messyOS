// API endpoints for inventory management
import type { APIRoute } from 'astro';
import { InventoryService } from '../../../../lib/uk-student/inventory-service';
import type { InventoryUpdateRequest } from '../../../../lib/uk-student/inventory-service';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const userId = searchParams.get('userId');
    const location = searchParams.get('location') as 'fridge' | 'pantry' | 'freezer' | null;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const inventoryService = new InventoryService(userId);
    
    let inventory;
    if (location) {
      inventory = await inventoryService.getInventoryByLocation(location);
    } else {
      inventory = await inventoryService.getAllInventory();
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: inventory 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching inventory:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch inventory',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, item } = body as {
      userId: string;
      item: InventoryUpdateRequest;
    };

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const inventoryService = new InventoryService(userId);
    const newItem = await inventoryService.addInventoryItem(item);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: newItem 
      }),
      { 
        status: 201, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error adding inventory item:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to add inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, itemId, updates } = body as {
      userId: string;
      itemId: string;
      updates: Partial<InventoryUpdateRequest>;
    };

    if (!userId || !itemId) {
      return new Response(
        JSON.stringify({ error: 'User ID and item ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const inventoryService = new InventoryService(userId);
    const updatedItem = await inventoryService.updateInventoryItem(itemId, updates);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: updatedItem 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error updating inventory item:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, itemId } = body as {
      userId: string;
      itemId: string;
    };

    if (!userId || !itemId) {
      return new Response(
        JSON.stringify({ error: 'User ID and item ID are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const inventoryService = new InventoryService(userId);
    await inventoryService.deleteInventoryItem(itemId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Item deleted successfully' 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to delete inventory item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};