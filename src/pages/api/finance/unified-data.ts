// src/pages/api/finance/unified-data.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all metrics (bank transactions, manual expenses, crypto)
    const { data: metrics, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    // Separate and process different types of data
    const transactions = [];
    const crypto = [];

    for (const metric of metrics || []) {
      if (metric.type === 'crypto_value') {
        // Process crypto holdings
        crypto.push({
          symbol: metric.metadata?.symbol || 'Unknown',
          quantity: metric.metadata?.quantity || 0,
          price: metric.metadata?.price || 0,
          currentValue: metric.value || 0,
          change: metric.metadata?.change || 0,
          network: metric.metadata?.network || 'Unknown'
        });
      } else if (['expense', 'income'].includes(metric.type)) {
        // Process transactions (both bank and manual)
        transactions.push({
          id: metric.id,
          date: metric.recorded_at.split('T')[0],
          description: metric.metadata?.description || 'Unknown',
          amount: metric.type === 'expense' ? -metric.value : metric.value,
          category: metric.metadata?.category || 'Other',
          source: metric.metadata?.source || 'bank',
          metadata: metric.metadata
        });
      }
    }

    // Deduplicate crypto holdings (keep latest for each symbol)
    const latestCrypto = crypto.reduce((acc, curr) => {
      const existing = acc.find(c => c.symbol === curr.symbol && c.network === curr.network);
      if (!existing || curr.currentValue > existing.currentValue) {
        acc = acc.filter(c => !(c.symbol === curr.symbol && c.network === curr.network));
        acc.push(curr);
      }
      return acc;
    }, [] as any[]);

    console.log(`📊 Unified data: ${transactions.length} transactions, ${latestCrypto.length} crypto holdings`);

    return new Response(JSON.stringify({
      success: true,
      transactions,
      crypto: latestCrypto,
      summary: {
        totalTransactions: transactions.length,
        totalExpenses: transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
        totalIncome: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        cryptoValue: latestCrypto.reduce((sum, c) => sum + c.currentValue, 0)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Unified finance data error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};