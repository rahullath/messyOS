// DATABASE CLEANUP UTILITY - COMPLETE VERSION
// src/pages/api/finance/cleanup.ts

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { action, options } = await request.json();

    let result;
    switch (action) {
      case 'clean-all':
        result = await cleanAllFinanceData(supabase, user.id);
        break;
      case 'clean-duplicates':
        result = await cleanDuplicates(supabase, user.id);
        break;
      case 'clean-internal-transfers':
        result = await cleanInternalTransfers(supabase, user.id);
        break;
      case 'clean-large-amounts':
        result = await cleanLargeAmounts(supabase, user.id, options?.threshold || 20000);
        break;
      case 'analyze-data':
        result = await analyzeFinanceData(supabase, user.id);
        break;
      default:
        throw new Error('Invalid cleanup action');
    }

    return new Response(JSON.stringify({
      success: true,
      message: result.message,
      deletedCount: result.deletedCount || 0,
      details: result.details,
      analysis: result.analysis || null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Cleanup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Clean all finance data
async function cleanAllFinanceData(supabase: any, userId: string) {
  console.log('🧹 Cleaning ALL finance data...');
  
  const { data: beforeCount } = await supabase
    .from('metrics')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', ['expense', 'income', 'crypto_value']);

  const { error } = await supabase
    .from('metrics')
    .delete()
    .eq('user_id', userId)
    .in('type', ['expense', 'income', 'crypto_value']);

  if (error) throw error;

  return {
    message: 'All finance data cleaned successfully',
    deletedCount: beforeCount?.length || 0,
    details: 'Removed all expenses, income, and crypto data. Ready for fresh import.'
  };
}

// Clean duplicate transactions
async function cleanDuplicates(supabase: any, userId: string) {
  console.log('🔍 Finding and removing duplicates...');
  
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', userId)
    .in('type', ['expense', 'income']);

  if (!metrics || metrics.length === 0) {
    return {
      message: 'No transactions found to deduplicate',
      deletedCount: 0,
      details: 'Database is clean'
    };
  }

  // Group by duplicate key
  const duplicateGroups = new Map();
  
  for (const metric of metrics) {
    const date = metric.recorded_at.split('T')[0];
    const description = (metric.metadata?.description || '').substring(0, 30);
    const amount = metric.value;
    const key = `${date}-${description}-${amount}`;
    
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key).push(metric);
  }

  // Find duplicates and keep only the latest
  const toDelete = [];
  for (const [key, group] of duplicateGroups) {
    if (group.length > 1) {
      // Sort by recorded_at, keep the latest, delete the rest
      group.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      toDelete.push(...group.slice(1));
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    const ids = toDelete.map(t => t.id);
    const { error } = await supabase
      .from('metrics')
      .delete()
      .in('id', ids);

    if (error) throw error;
  }

  return {
    message: `Removed ${toDelete.length} duplicate transactions`,
    deletedCount: toDelete.length,
    details: `Found ${duplicateGroups.size} unique transactions, removed duplicates`
  };
}

// Clean internal transfers
async function cleanInternalTransfers(supabase: any, userId: string) {
  console.log('🚫 Removing internal transfers...');
  
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', userId)
    .in('type', ['expense', 'income']);

  if (!metrics) {
    return {
      message: 'No transactions found',
      deletedCount: 0,
      details: 'Database is empty'
    };
  }

  const internalTransferPatterns = [
    'transfer to pot',
    'ifn/neosiexeddd',
    'pot to main',
    'savings account',
    'internal fund transfer'
  ];

  const toDelete = metrics.filter(metric => {
    const description = (metric.metadata?.description || '').toLowerCase();
    return internalTransferPatterns.some(pattern => description.includes(pattern));
  });

  if (toDelete.length > 0) {
    const ids = toDelete.map(t => t.id);
    const totalAmount = toDelete.reduce((sum, t) => sum + t.value, 0);
    
    const { error } = await supabase
      .from('metrics')
      .delete()
      .in('id', ids);

    if (error) throw error;

    return {
      message: `Removed ${toDelete.length} internal transfer records`,
      deletedCount: toDelete.length,
      details: `Cleaned Jupiter pot transfers worth ₹${totalAmount.toLocaleString()} - these were inflating expenses`
    };
  }

  return {
    message: 'No internal transfers found to clean',
    deletedCount: 0,
    details: 'Database already clean of internal transfers'
  };
}

// Clean large amount transactions (likely internal transfers)
async function cleanLargeAmounts(supabase: any, userId: string, threshold: number = 20000) {
  console.log(`💰 Removing transactions over ₹${threshold.toLocaleString()}...`);
  
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', userId)
    .in('type', ['expense', 'income'])
    .gt('value', threshold);

  if (!metrics || metrics.length === 0) {
    return {
      message: `No transactions over ₹${threshold.toLocaleString()} found`,
      deletedCount: 0,
      details: 'All transactions are within normal expense range'
    };
  }

  const totalAmount = metrics.reduce((sum, m) => sum + m.value, 0);
  const ids = metrics.map(m => m.id);

  // Show what's being deleted for transparency
  const sampleTransactions = metrics.slice(0, 3).map(m => ({
    amount: m.value,
    description: m.metadata?.description?.substring(0, 50) || 'Unknown'
  }));

  const { error } = await supabase
    .from('metrics')
    .delete()
    .in('id', ids);

  if (error) throw error;

  return {
    message: `Removed ${metrics.length} large transactions totaling ₹${totalAmount.toLocaleString()}`,
    deletedCount: metrics.length,
    details: `These were likely internal transfers, not real expenses. Examples: ${sampleTransactions.map(t => `₹${t.amount} - ${t.description}`).join('; ')}`
  };
}

// Analyze finance data (diagnostic tool)
async function analyzeFinanceData(supabase: any, userId: string) {
  console.log('📊 Analyzing finance data...');
  
  const { data: metrics } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', userId);

  if (!metrics || metrics.length === 0) {
    return {
      message: 'No data to analyze',
      deletedCount: 0,
      details: 'Database is empty',
      analysis: { totalRecords: 0 }
    };
  }

  // Categorize metrics
  const expenses = metrics.filter(m => m.type === 'expense');
  const income = metrics.filter(m => m.type === 'income');
  const crypto = metrics.filter(m => m.type === 'crypto_value');

  // Analyze expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const largeTransactions = expenses.filter(e => e.value > 20000);
  const internalTransfers = expenses.filter(e => {
    const desc = (e.metadata?.description || '').toLowerCase();
    return desc.includes('transfer to pot') || desc.includes('ifn/neosiexeddd');
  });

  // Category breakdown
  const categoryMap = new Map();
  for (const expense of expenses) {
    const category = expense.metadata?.category || 'Other';
    categoryMap.set(category, (categoryMap.get(category) || 0) + expense.value);
  }

  const topCategories = Array.from(categoryMap.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  // Date range
  const dates = metrics.map(m => m.recorded_at.split('T')[0]).sort();
  const dateRange = dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'No dates';

  // Potential issues
  const issues = [];
  if (largeTransactions.length > 0) {
    issues.push(`${largeTransactions.length} transactions over ₹20k (likely internal transfers)`);
  }
  if (internalTransfers.length > 0) {
    issues.push(`${internalTransfers.length} Jupiter internal transfers found`);
  }
  if (totalExpenses > 200000) {
    issues.push(`Monthly expenses of ₹${totalExpenses.toLocaleString()} seem unrealistic`);
  }

  const analysis = {
    totalRecords: metrics.length,
    expenses: {
      count: expenses.length,
      total: totalExpenses,
      average: expenses.length > 0 ? totalExpenses / expenses.length : 0
    },
    income: {
      count: income.length,
      total: income.reduce((sum, i) => sum + i.value, 0)
    },
    crypto: {
      count: crypto.length,
      totalValue: crypto.reduce((sum, c) => sum + c.value, 0)
    },
    dateRange,
    topCategories,
    issues,
    largeTransactions: largeTransactions.length,
    internalTransfers: internalTransfers.length,
    recommendations: generateRecommendations(issues, totalExpenses, largeTransactions.length)
  };

  return {
    message: `Analysis complete: ${metrics.length} total records`,
    deletedCount: 0,
    details: `Found ${issues.length} potential issues`,
    analysis
  };
}

// Generate cleanup recommendations
function generateRecommendations(issues: string[], totalExpenses: number, largeTransactionCount: number): string[] {
  const recommendations = [];

  if (largeTransactionCount > 0) {
    recommendations.push('🧹 Run "Clean Large Amounts" to remove transactions over ₹20k');
  }

  if (totalExpenses > 150000) {
    recommendations.push('🚫 Run "Clean Internal Transfers" to remove pot transfers');
  }

  if (issues.length === 0) {
    recommendations.push('✅ Data looks clean! No cleanup needed.');
  }

  recommendations.push('📊 Use "Smart Import" for future CSV imports to prevent these issues');

  return recommendations;
}