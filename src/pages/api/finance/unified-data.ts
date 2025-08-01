import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    

    // Get all finance metrics
    const { data: metrics, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['expense', 'income', 'crypto_value'])
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    interface CryptoHolding {
      symbol: string;
      quantity: number;
      price: number;
      currentValue: number;
      change: number;
      network: string;
    }

    interface Transaction {
      id: string;
      date: string;
      description: string;
      amount: number;
      category: string;
      vendor: string;
      source: string;
    }

    const transactions: Transaction[] = [];
    const crypto: CryptoHolding[] = [];

    // Process metrics without duplicates
    for (const metric of metrics || []) {
      if (metric.type === 'crypto_value') {
        crypto.push({
          symbol: metric.metadata?.symbol || 'Unknown',
          quantity: parseFloat(metric.metadata?.quantity || '0'),
          price: parseFloat(metric.metadata?.price || '0'),
          currentValue: parseFloat(metric.value || '0'),
          change: parseFloat(metric.metadata?.change || '0'),
          network: metric.metadata?.network || 'Unknown'
        });
      } else if (['expense', 'income'].includes(metric.type)) {
        transactions.push({
          id: metric.id,
          date: metric.recorded_at.split('T')[0],
          description: metric.metadata?.description || 'Unknown',
          amount: metric.type === 'expense' ? -parseFloat(metric.value) : parseFloat(metric.value),
          category: metric.metadata?.category || 'Other',
          vendor: metric.metadata?.vendor || 'Unknown',
          source: metric.metadata?.source || 'manual'
        });
      }
    }

    // Remove duplicate crypto holdings (keep latest for each symbol+network)
    const uniqueCrypto = crypto.reduce((acc: CryptoHolding[], curr) => {
      const existing = acc.find(c => c.symbol === curr.symbol && c.network === curr.network);
      if (!existing) {
        acc.push(curr);
      }
      return acc;
    }, []);

    // Calculate accurate summary
    const totalExpenses = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const cryptoValue = uniqueCrypto.reduce((sum, c) => sum + c.currentValue, 0);

    // Calculate monthly expenses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlyExpenses = transactions
      .filter(t => t.amount < 0 && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    console.log(`📊 Unified data: ${transactions.length} transactions, ${uniqueCrypto.length} crypto holdings, ${cryptoValue.toFixed(2)} crypto value`);

    return new Response(JSON.stringify({
      success: true,
      transactions: transactions.slice(0, 50), // Limit for performance
      crypto: uniqueCrypto,
      summary: {
        totalTransactions: transactions.length,
        totalExpenses,
        totalIncome,
        cryptoValue,
        monthlyExpenses,
        cryptoCount: uniqueCrypto.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
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
