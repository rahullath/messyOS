// UK Student Expenses API Endpoint
// Handles CRUD operations for expenses

import type { APIRoute } from 'astro';
import { ukFinanceService } from '../../../lib/uk-student/uk-finance-service';
import type { UKStudentExpense, ExpenseFilters } from '../../../types/uk-student-finance';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse filters from query parameters
    const filters: ExpenseFilters = {};
    
    const startDate = url.searchParams.get('startDate');
    if (startDate) filters.startDate = new Date(startDate);
    
    const endDate = url.searchParams.get('endDate');
    if (endDate) filters.endDate = new Date(endDate);
    
    const category = url.searchParams.get('category');
    if (category) filters.category = category;
    
    const store = url.searchParams.get('store');
    if (store) filters.store = store;
    
    const paymentMethod = url.searchParams.get('paymentMethod');
    if (paymentMethod) filters.paymentMethod = paymentMethod as any;
    
    const minAmount = url.searchParams.get('minAmount');
    if (minAmount) filters.minAmount = parseFloat(minAmount);
    
    const maxAmount = url.searchParams.get('maxAmount');
    if (maxAmount) filters.maxAmount = parseFloat(maxAmount);

    const expenses = await ukFinanceService.getExpenses(userId, filters);
    
    return new Response(JSON.stringify({ expenses }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch expenses' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    const expense = await ukFinanceService.addExpense({
      userId: body.userId,
      amount: body.amount,
      currency: body.currency || 'GBP',
      description: body.description,
      category: body.category,
      subcategory: body.subcategory,
      store: body.store,
      location: body.location,
      paymentMethod: body.paymentMethod,
      receiptData: body.receiptData,
      transactionDate: new Date(body.transactionDate),
      isRecurring: body.isRecurring || false,
      recurringFrequency: body.recurringFrequency,
      tags: body.tags || [],
      notes: body.notes
    });

    return new Response(JSON.stringify({ expense }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    return new Response(JSON.stringify({ error: 'Failed to create expense' }), {
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
      return new Response(JSON.stringify({ error: 'Expense ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert date strings to Date objects if present
    if (updates.transactionDate) {
      updates.transactionDate = new Date(updates.transactionDate);
    }

    const expense = await ukFinanceService.updateExpense(id, updates);

    return new Response(JSON.stringify({ expense }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    return new Response(JSON.stringify({ error: 'Failed to update expense' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ error: 'Expense ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await ukFinanceService.deleteExpense(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete expense' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};