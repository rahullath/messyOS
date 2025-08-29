// src/pages/api/expenses/nutrition-link.ts - Link Grocery Expenses with Nutrition Data
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { expense_id, nutrition_log_ids, estimated_nutrition_value } = await request.json();

    if (!expense_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Expense ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify expense belongs to user
    const { data: expense } = await serverAuth.supabase
      .from('expenses')
      .select('*')
      .eq('id', expense_id)
      .eq('user_id', user.id)
      .single();

    if (!expense) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Expense not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update expense with nutrition link
    const { error: updateError } = await serverAuth.supabase
      .from('expenses')
      .update({
        linked_nutrition_log_id: nutrition_log_ids?.[0], // Link to primary nutrition log
        estimated_nutrition_value: estimated_nutrition_value,
        updated_at: new Date().toISOString()
      })
      .eq('id', expense_id);

    if (updateError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to link nutrition data'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If multiple nutrition logs, create additional links in metadata
    if (nutrition_log_ids && nutrition_log_ids.length > 1) {
      const { error: metadataError } = await serverAuth.supabase
        .from('expenses')
        .update({
          metadata: {
            ...expense.metadata,
            linked_nutrition_logs: nutrition_log_ids,
            nutrition_link_created_at: new Date().toISOString()
          }
        })
        .eq('id', expense_id);

      if (metadataError) {
        console.warn('Failed to update metadata:', metadataError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Successfully linked nutrition data to expense'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Nutrition link error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to link nutrition data'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const analysis_type = url.searchParams.get('analysis') || 'daily';

    // Get grocery expenses for the date
    const { data: groceryExpenses } = await serverAuth.supabase
      .from('expenses')
      .select(`
        *,
        expense_categories(name, icon)
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', `${date}T00:00:00.000Z`)
      .lt('transaction_date', `${date}T23:59:59.999Z`)
      .or('expense_categories.name.eq.Food & Dining,merchant_name.ilike.%TESCO%,merchant_name.ilike.%SAINSBURY%,merchant_name.ilike.%ASDA%,merchant_name.ilike.%WAITROSE%')
      .eq('transaction_type', 'debit');

    // Get nutrition logs for the same date
    const { data: nutritionLogs } = await serverAuth.supabase
      .from('food_logs')
      .select(`
        *,
        foods(name, calories, protein, carbs, fat)
      `)
      .eq('user_id', user.id)
      .gte('logged_at', `${date}T00:00:00.000Z`)
      .lt('logged_at', `${date}T23:59:59.999Z`);

    // Analyze nutrition value per currency unit
    const nutritionAnalysis = await analyzeNutritionValue(groceryExpenses || [], nutritionLogs || []);

    // Get historical nutrition spending patterns
    const { data: historicalData } = await serverAuth.supabase
      .from('expenses')
      .select(`
        transaction_date,
        amount_primary_currency,
        estimated_nutrition_value,
        merchant_name
      `)
      .eq('user_id', user.id)
      .not('linked_nutrition_log_id', 'is', null)
      .gte('transaction_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('transaction_date', { ascending: false });

    return new Response(JSON.stringify({
      success: true,
      date,
      grocery_expenses: groceryExpenses?.map(expense => ({
        id: expense.id,
        date: expense.transaction_date,
        merchant: expense.merchant_name,
        amount: expense.amount_primary_currency,
        category: expense.expense_categories?.name,
        has_nutrition_link: !!expense.linked_nutrition_log_id,
        nutrition_value: expense.estimated_nutrition_value
      })),
      nutrition_logs: nutritionLogs?.map(log => ({
        id: log.id,
        food_name: log.foods?.name,
        calories: (log.quantity_grams / 100) * (log.foods?.calories || 0),
        protein: (log.quantity_grams / 100) * (log.foods?.protein || 0),
        meal_type: log.meal_type,
        logged_at: log.logged_at
      })),
      analysis: nutritionAnalysis,
      historical_trends: analyzeHistoricalTrends(historicalData || []),
      suggestions: generateNutritionExpenseSuggestions(groceryExpenses || [], nutritionLogs || [])
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Nutrition analysis error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to analyze nutrition expenses'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function analyzeNutritionValue(expenses: any[], nutritionLogs: any[]) {
  if (expenses.length === 0 || nutritionLogs.length === 0) {
    return {
      total_spent: 0,
      total_calories: 0,
      calories_per_currency: 0,
      protein_per_currency: 0,
      efficiency_rating: 'N/A'
    };
  }

  const totalSpent = expenses.reduce((sum, expense) => sum + (expense.amount_primary_currency || 0), 0);
  const totalCalories = nutritionLogs.reduce((sum, log) => {
    const calories = (log.quantity_grams / 100) * (log.foods?.calories || 0);
    return sum + calories;
  }, 0);
  
  const totalProtein = nutritionLogs.reduce((sum, log) => {
    const protein = (log.quantity_grams / 100) * (log.foods?.protein || 0);
    return sum + protein;
  }, 0);

  const caloriesPerCurrency = totalSpent > 0 ? totalCalories / totalSpent : 0;
  const proteinPerCurrency = totalSpent > 0 ? totalProtein / totalSpent : 0;

  // Efficiency rating based on calories per £/$ (higher is better)
  let efficiencyRating = 'Poor';
  if (caloriesPerCurrency > 100) efficiencyRating = 'Excellent';
  else if (caloriesPerCurrency > 50) efficiencyRating = 'Good';
  else if (caloriesPerCurrency > 25) efficiencyRating = 'Average';

  return {
    total_spent: totalSpent,
    total_calories: totalCalories,
    total_protein: totalProtein,
    calories_per_currency: caloriesPerCurrency,
    protein_per_currency: proteinPerCurrency,
    efficiency_rating: efficiencyRating,
    meals_logged: nutritionLogs.length,
    grocery_transactions: expenses.length
  };
}

function analyzeHistoricalTrends(historicalData: any[]) {
  if (historicalData.length < 2) {
    return {
      trend: 'insufficient_data',
      average_nutrition_value: 0,
      best_merchants: [],
      spending_pattern: 'unknown'
    };
  }

  const avgNutritionValue = historicalData
    .filter(d => d.estimated_nutrition_value)
    .reduce((sum, d) => sum + d.estimated_nutrition_value, 0) / historicalData.length;

  // Find best value merchants
  const merchantValues: Record<string, { total: number; count: number; value: number }> = {};
  
  for (const expense of historicalData) {
    if (expense.merchant_name && expense.estimated_nutrition_value) {
      if (!merchantValues[expense.merchant_name]) {
        merchantValues[expense.merchant_name] = { total: 0, count: 0, value: 0 };
      }
      merchantValues[expense.merchant_name].total += expense.estimated_nutrition_value;
      merchantValues[expense.merchant_name].count += 1;
    }
  }

  // Calculate average value per merchant
  const bestMerchants = Object.entries(merchantValues)
    .map(([name, data]) => ({
      name,
      avg_nutrition_value: data.total / data.count,
      transaction_count: data.count
    }))
    .sort((a, b) => b.avg_nutrition_value - a.avg_nutrition_value)
    .slice(0, 3);

  // Analyze spending pattern (weekly trends)
  const weeklySpending = historicalData.reduce((acc, expense) => {
    const weekDay = new Date(expense.transaction_date).getDay();
    acc[weekDay] = (acc[weekDay] || 0) + expense.amount_primary_currency;
    return acc;
  }, {} as Record<number, number>);

  const peakDay = Object.entries(weeklySpending)
    .sort(([,a], [,b]) => b - a)[0];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const spendingPattern = peakDay ? `Peak: ${dayNames[parseInt(peakDay[0])]}` : 'Even distribution';

  return {
    trend: historicalData.length > 10 ? 'sufficient_data' : 'building_history',
    average_nutrition_value: avgNutritionValue,
    best_merchants: bestMerchants,
    spending_pattern: spendingPattern,
    total_linked_expenses: historicalData.length
  };
}

function generateNutritionExpenseSuggestions(expenses: any[], nutritionLogs: any[]) {
  const suggestions = [];

  // Check if user is logging nutrition but not linking to expenses
  if (nutritionLogs.length > 0 && expenses.length > 0) {
    const linkedExpenses = expenses.filter(e => e.linked_nutrition_log_id);
    if (linkedExpenses.length === 0) {
      suggestions.push({
        type: 'linking',
        priority: 'high',
        message: 'Link your grocery expenses to nutrition logs for better insights',
        action: 'Start by matching today\'s grocery receipts with your food diary'
      });
    }
  }

  // Analyze spending efficiency
  if (expenses.length > 0) {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount_primary_currency, 0);
    const avgExpense = totalSpent / expenses.length;
    
    if (avgExpense > 50) { // High average expense
      suggestions.push({
        type: 'cost_optimization',
        priority: 'medium',
        message: 'Consider shopping at discount supermarkets for basic ingredients',
        action: 'Try Aldi or Lidl for staples like rice, pasta, and vegetables'
      });
    }
  }

  // Nutrition density suggestions
  const proteinLogs = nutritionLogs.filter(log => {
    const protein = (log.quantity_grams / 100) * (log.foods?.protein || 0);
    return protein > 15; // High protein foods
  });

  if (proteinLogs.length < nutritionLogs.length * 0.3) {
    suggestions.push({
      type: 'nutrition_optimization',
      priority: 'medium',
      message: 'Add more protein-rich foods for better nutrition value',
      action: 'Consider eggs, lentils, or chicken - great protein per £ spent'
    });
  }

  // UK-specific suggestions
  const ukMerchants = expenses.filter(e => 
    e.merchant_name?.includes('TESCO') || 
    e.merchant_name?.includes('SAINSBURY') || 
    e.merchant_name?.includes('WAITROSE')
  );

  if (ukMerchants.length > 0) {
    suggestions.push({
      type: 'uk_specific',
      priority: 'low',
      message: 'Use supermarket apps for personalized deals and discounts',
      action: 'Download Tesco Clubcard or Sainsbury\'s Nectar apps for savings'
    });
  }

  return suggestions;
}