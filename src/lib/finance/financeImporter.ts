// src/lib/finance/financeImporter.ts
import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';

export interface FinanceData {
  expenses: Array<{
    date: string;
    amount: number;
    description: string;
    category: string;
    vendor: string;
    type: 'expense' | 'income';
  }>;
  cryptoHoldings: Array<{
    symbol: string;
    quantity: number;
    currentPrice?: number;
    value: number;
    chain: string;
    change24h?: number;
  }>;
  bankTransactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    category: string;
    balance: number;
  }>;
}

export async function importFinanceData(
  files: { expenses?: string; crypto?: string; bankStatement?: string },
  userId: string,
  cookies: AstroCookies
): Promise<{ success: boolean; message: string; imported: { expenses: number; crypto: number; bank: number } }> {
  
  console.log('💰 Starting finance data import for user:', userId);
  
  const supabase = createServerClient(cookies);
  
  try {
    let expenseData: FinanceData['expenses'] = [];
    let cryptoData: FinanceData['cryptoHoldings'] = [];
    let bankData: FinanceData['bankTransactions'] = [];
    
    // Parse expenses if provided
    if (files.expenses) {
      expenseData = parseExpenseData(files.expenses);
    }
    
    // Parse crypto holdings if provided  
    if (files.crypto) {
      cryptoData = parseCryptoHoldings(files.crypto);
    }
    
    // Parse bank statement if provided
    if (files.bankStatement) {
      bankData = parseBankStatement(files.bankStatement);
    }
    
    console.log('📊 Parsed finance data:', {
      expenses: expenseData.length,
      crypto: cryptoData.length,
      bank: bankData.length
    });
    
    // Clear existing finance metrics
    await supabase
      .from('metrics')
      .delete()
      .eq('user_id', userId)
      .in('type', [
        'expense', 'income', 'crypto_holding', 'bank_transaction',
        'monthly_budget', 'cash_flow', 'net_worth'
      ]);
    
    // Convert to metrics format
    const allMetrics = [
      // Expense metrics
      ...expenseData.map(expense => ({
        user_id: userId,
        type: expense.type as string,
        value: expense.amount,
        unit: 'INR',
        metadata: {
          description: expense.description,
          category: expense.category,
          vendor: expense.vendor,
          originalAmount: expense.amount
        },
        recorded_at: new Date(expense.date).toISOString()
      })),
      
      // Crypto holdings
      ...cryptoData.map(holding => ({
        user_id: userId,
        type: 'crypto_holding',
        value: holding.value,
        unit: 'USD',
        metadata: {
          symbol: holding.symbol,
          quantity: holding.quantity,
          currentPrice: holding.currentPrice,
          chain: holding.chain,
          change24h: holding.change24h
        },
        recorded_at: new Date().toISOString()
      })),
      
      // Bank transactions
      ...bankData.map(transaction => ({
        user_id: userId,
        type: 'bank_transaction',
        value: transaction.amount,
        unit: 'INR',
        metadata: {
          description: transaction.description,
          category: transaction.category,
          transactionType: transaction.type,
          balance: transaction.balance
        },
        recorded_at: new Date(transaction.date).toISOString()
      }))
    ];
    
    // Batch insert all metrics
    console.log(`📥 Inserting ${allMetrics.length} finance metrics...`);
    const { error } = await supabase
      .from('metrics')
      .insert(allMetrics);
    
    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }
    
    // Calculate financial insights
    await calculateFinancialInsights(userId, cookies);
    
    return {
      success: true,
      message: `Successfully imported ${expenseData.length} expenses, ${cryptoData.length} crypto holdings, and ${bankData.length} bank transactions`,
      imported: {
        expenses: expenseData.length,
        crypto: cryptoData.length,
        bank: bankData.length
      }
    };
    
  } catch (error: any) {
    console.error('❌ Finance import error:', error);
    return {
      success: false,
      message: `Finance import failed: ${error.message}`,
      imported: { expenses: 0, crypto: 0, bank: 0 }
    };
  }
}

// Parse your manual expense data
function parseExpenseData(content: string): FinanceData['expenses'] {
  const data: FinanceData['expenses'] = [];
  const lines = content.split('\n');
  
  let currentDate = '';
  let currentVendor = '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Parse Zepto orders: "2/4 - oil+ocean peach drink - 221 total"
    const zeptoMatch = line.match(/(\d{1,2}\/\d{1,2})\s*-\s*(.+?)\s*-\s*(\d+)\s*total/);
    if (zeptoMatch) {
      const [, dateStr, description, amount] = zeptoMatch;
      const date = parseDate(dateStr, '2025'); // Assuming 2025
      
      data.push({
        date,
        amount: parseInt(amount),
        description: description.trim(),
        category: categorizeExpense(description, 'Zepto'),
        vendor: 'Zepto',
        type: 'expense'
      });
      continue;
    }
    
    // Parse Swiggy orders with ORDER # pattern
    const swiggyMatch = line.match(/ORDER #(\d+).*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (swiggyMatch) {
      currentVendor = 'Swiggy';
      const [, orderId, dateStr] = swiggyMatch;
      currentDate = convertDate(dateStr);
      continue;
    }
    
    // Parse "Total Paid:" amounts
    const totalMatch = line.match(/Total Paid:\s*(\d+)/);
    if (totalMatch && currentDate && currentVendor) {
      const amount = parseInt(totalMatch[1]);
      data.push({
        date: currentDate,
        amount,
        description: `${currentVendor} Food Order`,
        category: 'Food Delivery',
        vendor: currentVendor,
        type: 'expense'
      });
      continue;
    }
    
    // Parse Instamart orders: "17/5 - Pet Poop Bags 299, Bread 53..."
    const instamartMatch = line.match(/(\d{1,2}\/\d{1,2})\s*-\s*(.+?);\s*Total\s*(\d+)/);
    if (instamartMatch) {
      const [, dateStr, itemsStr, total] = instamartMatch;
      const date = parseDate(dateStr, '2025');
      
      data.push({
        date,
        amount: parseInt(total),
        description: `Instamart: ${itemsStr.substring(0, 50)}...`,
        category: categorizeInstamart(itemsStr),
        vendor: 'Swiggy Instamart',
        type: 'expense'
      });
      continue;
    }
    
    // Parse Supertails orders: "13/4 - Carniwel Dry Food 2kgs - 890"
    const supertailsMatch = line.match(/(\d{1,2}\/\d{1,2})\s*-\s*(.+?)\s*-\s*(\d+)/);
    if (supertailsMatch && line.includes('Carniwel\|Royal Canin\|Duck\|Anxiety')) {
      const [, dateStr, description, amount] = supertailsMatch;
      const date = parseDate(dateStr, '2025');
      
      data.push({
        date,
        amount: parseInt(amount),
        description: description.trim(),
        category: 'Pet Care',
        vendor: 'Supertails',
        type: 'expense'
      });
      continue;
    }
  }
  
  console.log('💳 Expense data sample:', data.slice(0, 3));
  console.log('💳 Total expense entries:', data.length);
  return data;
}

// Parse crypto holdings from Trust Wallet format
function parseCryptoHoldings(content: string): FinanceData['cryptoHoldings'] {
  const data: FinanceData['cryptoHoldings'] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Parse crypto entry: "1. USDC (Base) Price: $0.99 | Change: -0.0% Quantity: 62.192612 | Value: $62.18"
    const cryptoMatch = line.match(/(\d+)\.\s*(\w+)\s*\(([^)]+)\).*?Price:\s*\$?([\d.]+).*?Change:\s*([+-]?[\d.]+)%.*?Quantity:\s*([\d,.]+).*?Value:\s*\$?([\d.]+)/);
    
    if (cryptoMatch) {
      const [, index, symbol, chain, price, change, quantity, value] = cryptoMatch;
      
      data.push({
        symbol: symbol.trim(),
        quantity: parseFloat(quantity.replace(/,/g, '')),
        currentPrice: parseFloat(price),
        value: parseFloat(value),
        chain: chain.trim(),
        change24h: parseFloat(change)
      });
    }
  }
  
  console.log('₿ Crypto holdings sample:', data.slice(0, 3));
  console.log('₿ Total crypto holdings:', data.length);
  return data;
}

// Parse bank statement CSV
function parseBankStatement(content: string): FinanceData['bankTransactions'] {
  const data: FinanceData['bankTransactions'] = [];
  const lines = content.split('\n').slice(1); // Skip header
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(',');
    if (parts.length < 8) continue;
    
    try {
      const date = parts[1]?.trim();
      const description = parts[3]?.trim();
      const withdrawals = parseFloat(parts[5]?.trim() || '0');
      const deposits = parseFloat(parts[6]?.trim() || '0');
      const balance = parseFloat(parts[7]?.trim() || '0');
      
      if (date && description) {
        const amount = withdrawals > 0 ? -withdrawals : deposits;
        const type = withdrawals > 0 ? 'debit' : 'credit';
        
        data.push({
          date: convertBankDate(date),
          description: description,
          amount: Math.abs(amount),
          type,
          category: categorizeBankTransaction(description),
          balance
        });
      }
    } catch (error) {
      console.warn('Failed to parse bank line:', line);
    }
  }
  
  console.log('🏦 Bank transaction sample:', data.slice(0, 3));
  console.log('🏦 Total bank transactions:', data.length);
  return data;
}

// Smart categorization functions
function categorizeExpense(description: string, vendor: string): string {
  const desc = description.toLowerCase();
  
  if (vendor === 'Zepto' || vendor === 'Swiggy Instamart' || vendor === 'Blinkit') {
    if (desc.includes('milk') || desc.includes('bread') || desc.includes('eggs')) return 'Groceries';
    if (desc.includes('chicken') || desc.includes('paneer') || desc.includes('meat')) return 'Protein';
    if (desc.includes('drink') || desc.includes('energy') || desc.includes('dew')) return 'Beverages';
    if (desc.includes('cat') || desc.includes('litter') || desc.includes('pet')) return 'Pet Care';
    if (desc.includes('shampoo') || desc.includes('toothpaste') || desc.includes('soap')) return 'Personal Care';
    return 'Groceries';
  }
  
  if (vendor === 'Swiggy' || vendor === 'Zomato') return 'Food Delivery';
  if (vendor === 'Supertails') return 'Pet Care';
  
  return 'Other';
}

function categorizeInstamart(itemsStr: string): string {
  const items = itemsStr.toLowerCase();
  if (items.includes('cat') || items.includes('litter') || items.includes('pet')) return 'Pet Care';
  if (items.includes('protein') || items.includes('workout') || items.includes('creatine')) return 'Fitness';
  if (items.includes('chicken') || items.includes('eggs') || items.includes('paneer')) return 'Protein';
  if (items.includes('milk') || items.includes('bread') || items.includes('curd')) return 'Groceries';
  return 'Groceries';
}

function categorizeBankTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('spotify')) return 'Subscriptions';
  if (desc.includes('blinkit') || desc.includes('zepto') || desc.includes('instamart')) return 'Groceries';
  if (desc.includes('transfer to pot')) return 'Savings';
  if (desc.includes('upi in')) return 'Income';
  if (desc.includes('shettyarjun29')) return 'Rent';
  if (desc.includes('interest')) return 'Interest';
  
  return 'Other';
}

// Date parsing utilities
function parseDate(dateStr: string, year: string): string {
  const [day, month] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function convertDate(dateStr: string): string {
  // Convert "Sun, May 11, 2025" to ISO
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

function convertBankDate(dateStr: string): string {
  // Convert "21-03-2025" to ISO
  const [day, month, year] = dateStr.split('-');
  return `${year}-${month}-${day}`;
}

// Calculate financial insights
async function calculateFinancialInsights(userId: string, cookies: AstroCookies) {
  console.log('💰 Calculating financial insights...');
  
  const supabase = createServerClient(cookies);
  
  // Get recent financial data
  const { data: financeMetrics } = await supabase
    .from('metrics')
    .select('type, value, recorded_at, metadata')
    .eq('user_id', userId)
    .in('type', ['expense', 'income', 'crypto_holding', 'bank_transaction'])
    .order('recorded_at', { ascending: false })
    .limit(500);
  
  if (!financeMetrics || financeMetrics.length === 0) return;
  
  // Calculate key metrics
  const expenses = financeMetrics.filter(m => m.type === 'expense');
  const cryptoHoldings = financeMetrics.filter(m => m.type === 'crypto_holding');
  
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const totalCrypto = cryptoHoldings.reduce((sum, c) => sum + c.value, 0);
  const monthlyExpenses = calculateMonthlyExpenses(expenses);
  
  // Store calculated insights
  const insights = [
    {
      user_id: userId,
      type: 'monthly_expenses',
      value: monthlyExpenses,
      unit: 'INR',
      metadata: {
        totalExpenses,
        expenseCount: expenses.length,
        avgExpense: totalExpenses / expenses.length,
        calculatedAt: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    },
    {
      user_id: userId,
      type: 'crypto_portfolio_value',
      value: totalCrypto,
      unit: 'USD',
      metadata: {
        holdings: cryptoHoldings.length,
        lastUpdated: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    }
  ];
  
  await supabase.from('metrics').insert(insights);
  
  console.log('✅ Financial insights calculated:', {
    monthlyExpenses: `₹${monthlyExpenses.toLocaleString()}`,
    totalCrypto: `$${totalCrypto.toFixed(2)}`,
    expenseCount: expenses.length
  });
}

function calculateMonthlyExpenses(expenses: any[]): number {
  if (expenses.length === 0) return 0;
  
  // Group by month and calculate average
  const monthlyTotals = new Map<string, number>();
  
  for (const expense of expenses) {
    const month = expense.recorded_at.substring(0, 7); // YYYY-MM
    monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + expense.value);
  }
  
  const months = Array.from(monthlyTotals.values());
  return months.reduce((sum, total) => sum + total, 0) / months.length;
}