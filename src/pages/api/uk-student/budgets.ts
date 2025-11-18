// UK Student Budgets API Endpoint
// Handles CRUD operations for budgets and budget health

import type { APIRoute } from 'astro';
import { ukFinanceService } from '../../../lib/uk-student/uk-finance-service';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const budgets = await ukFinanceService.getBudgets(userId);
    const budgetHealth = await ukFinanceService.getBudgetHealth(userId);
    
    return new Response(JSON.stringify({ budgets, budgetHealth }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch budgets' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    const budget = await ukFinanceService.createBudget({
      userId: body.userId,
      category: body.category,
      budgetType: body.budgetType,
      limitAmount: body.limitAmount,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      alertThreshold: body.alertThreshold || 0.8,
      isActive: body.isActive !== false
    });

    return new Response(JSON.stringify({ budget }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    return new Response(JSON.stringify({ error: 'Failed to create budget' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return new Response(JSON.stringify({ error: 'Budget ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert date strings to Date objects if present
    if (updates.periodStart) {
      updates.periodStart = new Date(updates.periodStart);
    }
    if (updates.periodEnd) {
      updates.periodEnd = new Date(updates.periodEnd);
    }

    const budget = await ukFinanceService.updateBudget(id, updates);

    return new Response(JSON.stringify({ budget }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return new Response(JSON.stringify({ error: 'Failed to update budget' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Budget ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await ukFinanceService.deleteBudget(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete budget' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};