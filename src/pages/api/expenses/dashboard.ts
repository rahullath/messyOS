// src/pages/api/expenses/dashboard.ts - Expense Dashboard Data
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

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

    const timeframe = url.searchParams.get('timeframe') || 'month'; // 'week', 'month', 'year'
    const currency = url.searchParams.get('currency') || 'primary';

    // Get user settings
    const { data: userSettings } = await serverAuth.supabase
      .from('user_expense_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const primaryCurrency = userSettings?.primary_currency || 'USD';
    const secondaryCurrency = userSettings?.secondary_currency;
    const isUKUser = userSettings?.country_code === 'UK';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Get spending statistics
    const { data: spendingStats, error: statsError } = await serverAuth.supabase
      .rpc('calculate_spending_stats', {
        user_id_param: user.id,
        start_date_param: startDate.toISOString().split('T')[0],
        end_date_param: now.toISOString().split('T')[0]
      });

    if (statsError) {
      console.error('Spending stats error:', statsError);
    }

    // Get recent transactions
    const { data: recentTransactions } = await serverAuth.supabase
      .from('expenses')
      .select(`
        *,
        expense_categories(name, icon, color)
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .eq('transaction_type', 'debit')
      .order('transaction_date', { ascending: false })
      .limit(20);

    // Get category breakdown
    const { data: categoryBreakdown } = await serverAuth.supabase
      .from('expenses')
      .select(`
        amount_primary_currency,
        expense_categories(name, icon, color)
      `)
      .eq('user_id', user.id)
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .eq('transaction_type', 'debit')
      .not('expense_categories', 'is', null);

    // Process category data
    const categoryTotals: Record<string, { amount: number; icon: string; color: string }> = {};
    
    if (categoryBreakdown) {
      for (const expense of categoryBreakdown) {
        const categoryName = expense.expense_categories?.name || 'Other';
        const amount = expense.amount_primary_currency || 0;
        
        if (!categoryTotals[categoryName]) {
          categoryTotals[categoryName] = {
            amount: 0,
            icon: expense.expense_categories?.icon || '📝',
            color: expense.expense_categories?.color || '#6b7280'
          };
        }
        categoryTotals[categoryName].amount += amount;
      }
    }

    // Get daily spending for chart
    const { data: dailySpending } = await serverAuth.supabase
      .from('expenses')
      .select('transaction_date, amount_primary_currency')
      .eq('user_id', user.id)
      .eq('transaction_type', 'debit')
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .order('transaction_date');

    // Group by day
    const dailyTotals: Record<string, number> = {};
    if (dailySpending) {
      for (const expense of dailySpending) {
        const date = expense.transaction_date;
        dailyTotals[date] = (dailyTotals[date] || 0) + (expense.amount_primary_currency || 0);
      }
    }

    // Get budgets and progress
    const { data: budgets } = await serverAuth.supabase
      .from('budgets')
      .select(`
        *,
        expense_categories(name, icon, color)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gte('end_date', now.toISOString().split('T')[0]);

    // Calculate price comparison insights (UK-specific)
    let priceInsights: any[] = [];
    if (isUKUser && recentTransactions) {
      priceInsights = await calculatePriceInsights(recentTransactions, serverAuth.supabase);
    }

    // Get top merchants
    const topMerchants = recentTransactions 
      ? recentTransactions
          .reduce((acc, tx) => {
            if (tx.merchant_name) {
              acc[tx.merchant_name] = (acc[tx.merchant_name] || 0) + (tx.amount_primary_currency || 0);
            }
            return acc;
          }, {} as Record<string, number>)
      : {};

    const sortedMerchants = Object.entries(topMerchants)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    // Calculate trends
    const totalSpent = spendingStats?.[0]?.total_spent || 0;
    const dailyAverage = spendingStats?.[0]?.daily_average || 0;
    
    // Get previous period for comparison
    const prevStartDate = new Date(startDate);
    const prevEndDate = new Date(startDate);
    
    switch (timeframe) {
      case 'week':
        prevStartDate.setDate(startDate.getDate() - 7);
        break;
      case 'year':
        prevStartDate.setFullYear(startDate.getFullYear() - 1);
        prevEndDate.setDate(startDate.getDate() - 1);
        break;
      case 'month':
      default:
        prevStartDate.setMonth(startDate.getMonth() - 1);
        prevEndDate.setDate(startDate.getDate() - 1);
        break;
    }

    const { data: prevPeriodStats } = await serverAuth.supabase
      .from('expenses')
      .select('amount_primary_currency')
      .eq('user_id', user.id)
      .eq('transaction_type', 'debit')
      .gte('transaction_date', prevStartDate.toISOString().split('T')[0])
      .lte('transaction_date', prevEndDate.toISOString().split('T')[0]);

    const prevPeriodTotal = prevPeriodStats?.reduce((sum, tx) => sum + (tx.amount_primary_currency || 0), 0) || 0;
    const trendPercentage = prevPeriodTotal > 0 ? ((totalSpent - prevPeriodTotal) / prevPeriodTotal) * 100 : 0;

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_spent: totalSpent,
        daily_average: dailyAverage,
        transaction_count: recentTransactions?.length || 0,
        currency: primaryCurrency,
        secondary_currency: secondaryCurrency,
        trend_percentage: trendPercentage,
        timeframe,
        date_range: {
          start: startDate.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        }
      },
      categories: Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b.amount - a.amount)
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          icon: data.icon,
          color: data.color,
          percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0
        })),
      daily_spending: Object.entries(dailyTotals).map(([date, amount]) => ({
        date,
        amount
      })),
      recent_transactions: recentTransactions?.slice(0, 10).map(tx => ({
        id: tx.id,
        date: tx.transaction_date,
        merchant: tx.merchant_name,
        description: tx.description,
        amount: tx.amount_primary_currency,
        category: tx.expense_categories?.name,
        category_icon: tx.expense_categories?.icon,
        secondary_amount: tx.amount_secondary_currency
      })),
      top_merchants: sortedMerchants,
      budgets: budgets?.map(budget => ({
        id: budget.id,
        name: budget.name,
        amount: budget.amount,
        spent: budget.spent_amount,
        remaining: budget.remaining_amount,
        percentage: budget.percentage_used,
        category: budget.expense_categories?.name,
        category_icon: budget.expense_categories?.icon,
        is_exceeded: budget.is_exceeded
      })),
      price_insights: priceInsights,
      user_settings: {
        country: userSettings?.country_code,
        is_uk_user: isUKUser,
        is_first_month: userSettings?.is_first_month_tracking,
        currency_symbol: getCurrencySymbol(primaryCurrency)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Expenses dashboard error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch expense dashboard data'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function calculatePriceInsights(transactions: any[], supabase: any): Promise<any[]> {
  const insights = [];
  
  // Group transactions by merchant for comparison
  const merchantGroups: Record<string, any[]> = {};
  
  for (const tx of transactions) {
    if (tx.merchant_name) {
      if (!merchantGroups[tx.merchant_name]) {
        merchantGroups[tx.merchant_name] = [];
      }
      merchantGroups[tx.merchant_name].push(tx);
    }
  }
  
  // Analyze each merchant group
  for (const [merchant, txs] of Object.entries(merchantGroups)) {
    if (txs.length > 1) {
      const amounts = txs.map(tx => tx.amount_primary_currency || 0);
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const maxAmount = Math.max(...amounts);
      const minAmount = Math.min(...amounts);
      
      // Check for significant price variations
      if (maxAmount > avgAmount * 1.4) {
        const expensive = txs.find(tx => tx.amount_primary_currency === maxAmount);
        insights.push({
          type: 'price_alert',
          merchant,
          message: `£${maxAmount.toFixed(2)} at ${merchant} was ${((maxAmount - avgAmount) / avgAmount * 100).toFixed(0)}% above your average`,
          date: expensive?.transaction_date,
          severity: 'medium'
        });
      }
    }
  }
  
  return insights;
}

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'INR': '₹',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥'
  };
  return symbols[currency] || currency;
}