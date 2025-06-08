// Fixed Unified Finance Data API
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

    // Get all finance metrics with deduplication
    const { data: metrics, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .in('type', ['expense', 'income', 'crypto_value', 'bank_transaction'])
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    // Process and deduplicate data
    const { transactions, crypto, summary } = await processFinanceData(metrics || []);

    console.log(`📊 Unified data: ${transactions.length} transactions, ${crypto.length} crypto holdings`);

    return new Response(JSON.stringify({
      success: true,
      transactions,
      crypto,
      summary
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

async function processFinanceData(metrics: any[]) {
  const transactions: any[] = [];
  const cryptoHoldings: any[] = [];
  const duplicateTracker = new Set<string>();
  const bankTransactionTracker = new Set<string>();

  // First pass: collect all bank transaction signatures to avoid double counting
  for (const metric of metrics) {
    if (metric.type === 'bank_transaction' || (metric.metadata?.source === 'bank')) {
      const description = metric.metadata?.description || '';
      const amount = Math.abs(parseFloat(metric.value || '0'));
      const date = metric.recorded_at.split('T')[0];
      
      // Create signature for bank transactions
      const bankSignature = `${date}-${amount}`;
      bankTransactionTracker.add(bankSignature);
    }
  }

  for (const metric of metrics) {
    if (metric.type === 'crypto_value') {
      // Process crypto holdings - deduplicate by symbol+network
      const existing = cryptoHoldings.find(c => 
        c.symbol === metric.metadata?.symbol && c.network === metric.metadata?.network
      );
      
      if (!existing || new Date(metric.recorded_at) > new Date(existing.lastUpdated)) {
        if (existing) {
          cryptoHoldings.splice(cryptoHoldings.indexOf(existing), 1);
        }
        
        cryptoHoldings.push({
          symbol: metric.metadata?.symbol || 'Unknown',
          quantity: parseFloat(metric.metadata?.quantity || '0'),
          price: parseFloat(metric.metadata?.price || '0'),
          currentValue: parseFloat(metric.value || '0'),
          change: parseFloat(metric.metadata?.change || '0'),
          network: metric.metadata?.network || 'Unknown',
          lastUpdated: metric.recorded_at
        });
      }
      
    } else if (['expense', 'income', 'bank_transaction'].includes(metric.type)) {
      const description = metric.metadata?.description || 'Unknown';
      const amount = parseFloat(metric.value || '0');
      const date = metric.recorded_at.split('T')[0];
      const source = metric.metadata?.source || 'unknown';
      
      // Skip pot transfers (internal savings, not expenses)
      if (description.toLowerCase().includes('transfer to pot') || 
          description.toLowerCase().includes('withdraw from') && description.toLowerCase().includes('pot')) {
        console.log(`💰 Skipping pot transfer: ${description}`);
        continue;
      }
      
      // Enhanced deduplication logic
      const bankSignature = `${date}-${Math.abs(amount)}`;
      
      // If this is a manual expense but we have a bank transaction for the same amount/date, skip it
      if (source !== 'bank' && bankTransactionTracker.has(bankSignature)) {
        console.log(`🔄 Skipping manual expense (covered by bank): ${description} - ${amount}`);
        continue;
      }
      
      // Create duplicate key
      const duplicateKey = `${date}-${description.substring(0, 40)}-${amount}-${source}`;
      
      if (duplicateTracker.has(duplicateKey)) {
        console.log(`🔄 Skipping exact duplicate: ${duplicateKey}`);
        continue;
      }
      
      duplicateTracker.add(duplicateKey);
      
      // Enhanced categorization with your specific patterns
      const { category, subcategory } = enhancedCategorization(description, amount, metric.metadata);
      
      transactions.push({
        id: metric.id,
        date: date,
        description: description,
        amount: (metric.type === 'expense' || amount < 0) ? -Math.abs(amount) : Math.abs(amount),
        category: category,
        subcategory: subcategory,
        source: source,
        vendor: metric.metadata?.vendor || extractVendor(description),
        metadata: metric.metadata
      });
    }
  }

  // Sort transactions by date (newest first)
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate summary stats
  const expenses = transactions.filter(t => t.amount < 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const cryptoValue = cryptoHoldings.reduce((sum, c) => sum + c.currentValue, 0);

  console.log(`📊 Processed: ${transactions.length} transactions, ${cryptoHoldings.length} crypto, ₹${totalExpenses.toLocaleString()} expenses`);

  return {
    transactions,
    crypto: cryptoHoldings,
    summary: {
      totalTransactions: transactions.length,
      totalExpenses,
      totalIncome,
      cryptoValue,
      cryptoCount: cryptoHoldings.length,
      monthlyExpenses: calculateMonthlyExpenses(transactions)
    }
  };
}

function enhancedCategorization(description: string, amount: number, metadata: any) {
  const desc = description.toLowerCase();
  const source = metadata?.source?.toLowerCase() || '';
  
  // Pet Care (your major expense category)
  if (desc.includes('royal canin') || desc.includes('carniwel') || desc.includes('pet') || 
      desc.includes('supertails') || desc.includes('poop bags') || desc.includes('cat') || 
      desc.includes('litter') || desc.includes('petcrux') || desc.includes('petscentricpriv')) {
    if (desc.includes('food') || desc.includes('royal canin') || desc.includes('carniwel')) {
      return { category: 'Pet Care', subcategory: 'Food' };
    } else if (desc.includes('litter') || desc.includes('poop bags') || desc.includes('petcrux')) {
      return { category: 'Pet Care', subcategory: 'Hygiene' };
    } else if (desc.includes('treats') || desc.includes('anxiety') || desc.includes('matatabi')) {
      return { category: 'Pet Care', subcategory: 'Treats & Health' };
    }
    return { category: 'Pet Care', subcategory: 'General' };
  }
  
  // Food & Grocery with detailed subcategories
  if (desc.includes('zepto') || desc.includes('blinkit') || desc.includes('swiggy instamart') || 
      desc.includes('groceries') || source.includes('zepto') || source.includes('blinkit') ||
      desc.includes('zeptonow') || desc.includes('zeptoonline') || desc.includes('grofers')) {
    if (desc.includes('mk retail') || source.includes('mk retail') || desc.includes('mkretailcompany')) {
      return { category: 'Food & Grocery', subcategory: 'MK Retail' };
    } else if (desc.includes('bread') || desc.includes('milk') || desc.includes('eggs') || 
               desc.includes('paneer') || desc.includes('curd') || desc.includes('atta')) {
      return { category: 'Food & Grocery', subcategory: 'Staples' };
    } else if (desc.includes('snacks') || desc.includes('chips') || desc.includes('mountain dew') || 
               desc.includes('chupa chups') || desc.includes('aloha') || desc.includes('sting') ||
               desc.includes('candy') || desc.includes('chocolate') || desc.includes('ice cream')) {
      return { category: 'Food & Grocery', subcategory: 'Snacks & Beverages' };
    } else if (desc.includes('vegetables') || desc.includes('fruits') || desc.includes('cabbage') ||
               desc.includes('carrot') || desc.includes('coconut') || desc.includes('gobi')) {
      return { category: 'Food & Grocery', subcategory: 'Fresh Produce' };
    } else if (desc.includes('protein') || desc.includes('creatine') || desc.includes('pre workout') ||
               desc.includes('peanut butter') || desc.includes('makhana')) {
      return { category: 'Food & Grocery', subcategory: 'Health & Fitness' };
    }
    return { category: 'Food & Grocery', subcategory: 'General' };
  }
  
  // Food Delivery
  if ((desc.includes('swiggy') && !desc.includes('instamart')) || desc.includes('zomato') || 
      desc.includes('dominos') || desc.includes('pizza') || desc.includes('hrx rolls') ||
      desc.includes('crusto') || desc.includes('biggies burger') || desc.includes('leon')) {
    return { category: 'Food Delivery', subcategory: 'Meals' };
  }
  
  // Rent & Housing
  if (desc.includes('rent') || desc.includes('shettyarjun') || amount === 10872 || amount === 12875) {
    return { category: 'Housing', subcategory: 'Rent' };
  }
  
  // Healthcare & Medicine
  if (desc.includes('bupropion') || desc.includes('medicine') || desc.includes('apollo') || 
      desc.includes('pharmacy') || desc.includes('amahahealth')) {
    return { category: 'Healthcare', subcategory: 'Medicine' };
  }
  
  // Transportation
  if (desc.includes('yulu') || desc.includes('uber') || desc.includes('ola') || 
      desc.includes('olamoney') || desc.includes('ixigo') || desc.includes('abhibus')) {
    return { category: 'Transportation', subcategory: 'Rides' };
  }
  
  // Subscriptions & Entertainment
  if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('google one') || 
      desc.includes('apple') || desc.includes('jio') || desc.includes('playstore') ||
      desc.includes('subscription') || desc.includes('appleservices')) {
    if (desc.includes('spotify') || desc.includes('netflix')) {
      return { category: 'Subscriptions', subcategory: 'Entertainment' };
    } else if (desc.includes('google') || desc.includes('apple')) {
      return { category: 'Subscriptions', subcategory: 'Productivity' };
    }
    return { category: 'Subscriptions', subcategory: 'General' };
  }
  
  // Domestic Help
  if (desc.includes('cook') || desc.includes('maid') || desc.includes('domestic')) {
    return { category: 'Domestic Help', subcategory: 'Salary' };
  }
  
  // Furniture & Home
  if (desc.includes('fabrento') || desc.includes('furniture') || desc.includes('airwick') ||
      desc.includes('glade') || desc.includes('flush matic') || desc.includes('ceiling fan')) {
    return { category: 'Home & Furniture', subcategory: 'Furniture & Appliances' };
  }
  
  // Personal Care
  if (desc.includes('shampoo') || desc.includes('conditioner') || desc.includes('shower gel') ||
      desc.includes('toothpaste') || desc.includes('pilgrim')) {
    return { category: 'Personal Care', subcategory: 'Hygiene' };
  }
  
  // Fitness & Gym
  if (desc.includes('gym') || desc.includes('fitness') || desc.includes('protein') ||
      desc.includes('shorts') || desc.includes('shirt') || desc.includes('pant')) {
    return { category: 'Health & Fitness', subcategory: 'Gym & Equipment' };
  }
  
  // Shopping & E-commerce
  if (desc.includes('amazon') || desc.includes('ekart') || desc.includes('flipkart')) {
    return { category: 'Shopping', subcategory: 'E-commerce' };
  }
  
  // ATM & Cash
  if (desc.includes('atm') || desc.includes('withdrawal') || desc.includes('cash')) {
    return { category: 'Cash Withdrawal', subcategory: 'ATM' };
  }
  
  // UPI Transfers (better categorization)
  if (desc.includes('upi') || desc.includes('transfer')) {
    if (desc.includes('pot') || desc.includes('ifn/neo')) {
      return { category: 'Savings/Investment', subcategory: 'Pot Transfer' };
    } else if (desc.includes('friend') || desc.includes('personal')) {
      return { category: 'UPI Transfer', subcategory: 'Personal' };
    }
    return { category: 'UPI Transfer', subcategory: 'General' };
  }
  
  // Income
  if (amount > 0 && (desc.includes('salary') || desc.includes('credit') || desc.includes('refund'))) {
    return { category: 'Income', subcategory: 'Salary' };
  }
  
  return { category: 'Other', subcategory: 'Uncategorized' };
}

function extractVendor(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('zepto')) return 'Zepto';
  if (desc.includes('swiggy')) return 'Swiggy';
  if (desc.includes('blinkit')) return 'Blinkit';
  if (desc.includes('supertails')) return 'Supertails';
  if (desc.includes('mk retail')) return 'MK Retail';
  if (desc.includes('yulu')) return 'Yulu';
  if (desc.includes('spotify')) return 'Spotify';
  if (desc.includes('apollo')) return 'Apollo';
  
  return 'Unknown';
}

function calculateMonthlyExpenses(transactions: any[]): number {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  const recentExpenses = transactions.filter(t => 
    t.amount < 0 && new Date(t.date) >= thirtyDaysAgo
  );
  
  return recentExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
}
