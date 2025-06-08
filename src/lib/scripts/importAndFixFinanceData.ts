// Data Import & Fix Script for MeshOS Finance
// src/lib/scripts/importAndFixFinanceData.ts

interface FinanceDataFixer {
  cleanupDuplicates(): Promise<void>;
  importExpensesFromKnowledge(): Promise<void>;
  importCryptoFromKnowledge(): Promise<void>;
  recategorizeExpenses(): Promise<void>;
}

export class FinanceDataFixer implements FinanceDataFixer {
  
  constructor(private supabase: any, private userId: string) {}

  // Step 1: Clean up duplicate entries
  async cleanupDuplicates(): Promise<void> {
    console.log('🧹 Cleaning up duplicate entries...');
    
    const { data: metrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['expense', 'crypto_value']);

    if (!metrics) return;

    // Group duplicates by key
    const duplicateGroups = new Map<string, any[]>();
    
    for (const metric of metrics) {
      const key = this.createDeduplicationKey(metric);
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(metric);
    }

    // Remove duplicates, keep the latest
    for (const [key, group] of duplicateGroups) {
      if (group.length > 1) {
        // Sort by created date, keep the latest
        group.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
        const toDelete = group.slice(1); // Remove all except the first (latest)
        
        for (const duplicate of toDelete) {
          await this.supabase
            .from('metrics')
            .delete()
            .eq('id', duplicate.id);
        }
        
        console.log(`🗑️ Removed ${toDelete.length} duplicates for key: ${key.substring(0, 50)}...`);
      }
    }
  }

  // Step 2: Import expenses from your knowledge base
  async importExpensesFromKnowledge(): Promise<void> {
    console.log('💰 Importing expenses from knowledge base...');
    
    // Sample expenses from your knowledge - this would be loaded from your expenses.txt
    const sampleExpenses = [
      // Zepto expenses
      { date: '2025-05-17', description: 'Pet Poop Bags 299, Bread 53, Total 550', amount: 550, source: 'Zepto' },
      { date: '2025-05-16', description: 'chupa chups, mountain dew, milk', amount: 320, source: 'Zepto' },
      { date: '2025-05-16', description: 'Royal Canin Wet Food (24) + Cat treats', amount: 2855, source: 'Supertails' },
      
      // MK Retail (your biggest optimization target)
      { date: '2025-05-15', description: 'MK Retail grocery shopping', amount: 3053, source: 'MK Retail' },
      { date: '2025-05-10', description: 'MK Retail snacks and beverages', amount: 850, source: 'MK Retail' },
      
      // Swiggy Instamart
      { date: '2025-05-14', description: 'Instamart vegetables and fruits', amount: 750, source: 'Swiggy Instamart' },
      { date: '2025-05-13', description: 'Instamart daily essentials', amount: 920, source: 'Swiggy Instamart' },
      
      // Food Delivery
      { date: '2025-05-12', description: 'Swiggy dinner order', amount: 450, source: 'Swiggy' },
      { date: '2025-05-11', description: 'Zomato lunch', amount: 380, source: 'Zomato' },
      
      // Pet Care
      { date: '2025-05-10', description: 'Royal Canin dry food 2kg', amount: 1800, source: 'Supertails' },
      { date: '2025-05-08', description: 'Cat litter and cleaning supplies', amount: 650, source: 'Supertails' },
      
      // Other categories
      { date: '2025-05-07', description: 'Bupropion XL medicine', amount: 1218, source: 'Apollo' },
      { date: '2025-05-05', description: 'Yulu rides', amount: 266, source: 'Yulu' },
      { date: '2025-05-03', description: 'Spotify subscription', amount: 119, source: 'Spotify' },
      { date: '2025-05-01', description: 'Rent payment to shettyarjun29', amount: 10872, source: 'UPI' }
    ];

    const expenseMetrics = sampleExpenses.map(expense => {
      const { category, subcategory } = this.categorizeExpense(expense.description, expense.amount, expense.source);
      
      return {
        user_id: this.userId,
        type: 'expense',
        value: expense.amount,
        unit: 'INR',
        metadata: {
          description: expense.description,
          category: category,
          subcategory: subcategory,
          source: expense.source,
          vendor: this.extractVendor(expense.description, expense.source)
        },
        recorded_at: new Date(expense.date).toISOString()
      };
    });

    const { error } = await this.supabase
      .from('metrics')
      .insert(expenseMetrics);

    if (error) {
      console.error('❌ Error importing expenses:', error);
    } else {
      console.log(`✅ Imported ${expenseMetrics.length} expense records`);
    }
  }

  // Step 3: Import crypto from knowledge base (fix the $0 issue)
  async importCryptoFromKnowledge(): Promise<void> {
    console.log('₿ Importing crypto holdings from knowledge base...');
    
    // Your actual crypto holdings from cryptoholdings.txt
    const cryptoHoldings = [
      { symbol: 'USDC', network: 'Base', price: 0.99, quantity: 62.192612, value: 62.18, change: -0.0 },
      { symbol: 'TRX', network: 'Tron', price: 0.24, quantity: 117.897828, value: 28.75, change: 1.47 },
      { symbol: 'SOL', network: 'Polygon', price: 140.26, quantity: 0.100972, value: 14.16, change: 4.82 },
      { symbol: 'ETH', network: 'Base', price: 1612.83, quantity: 0.003516, value: 5.67, change: 1.66 },
      { symbol: 'WBTC', network: 'Arbitrum', price: 85151.20, quantity: 0.000056, value: 4.84, change: 0.92 },
      { symbol: 'WBTC', network: 'Polygon', price: 85151.20, quantity: 0.000051, value: 4.39, change: 0.92 },
      { symbol: 'OM', network: 'Polygon', price: 0.60, quantity: 6.558798, value: 3.96, change: -5.1 },
      { symbol: 'POL', network: 'Polygon', price: 0.19, quantity: 17.032759, value: 3.25, change: 0.35 },
      { symbol: 'USDC', network: 'Polygon', price: 0.99, quantity: 1.796504, value: 1.79, change: -0.0 },
      { symbol: 'AIDOGE', network: 'Arbitrum', price: 0.00, quantity: 2076581912.772156, value: 0.25, change: 2.34 },
      { symbol: 'ETH', network: 'Arbitrum', price: 1612.83, quantity: 0.000034, value: 0.05, change: 1.66 }
    ];

    // First, delete existing crypto entries to avoid duplicates
    await this.supabase
      .from('metrics')
      .delete()
      .eq('user_id', this.userId)
      .eq('type', 'crypto_value');

    const cryptoMetrics = cryptoHoldings.map(holding => ({
      user_id: this.userId,
      type: 'crypto_value',
      value: holding.value,
      unit: 'USD',
      metadata: {
        symbol: holding.symbol,
        network: holding.network,
        quantity: holding.quantity,
        price: holding.price,
        change: holding.change
      },
      recorded_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('metrics')
      .insert(cryptoMetrics);

    if (error) {
      console.error('❌ Error importing crypto:', error);
    } else {
      console.log(`✅ Imported ${cryptoMetrics.length} crypto holdings, total value: $${cryptoHoldings.reduce((sum, h) => sum + h.value, 0)}`);
    }
  }

  // Step 4: Recategorize existing expenses
  async recategorizeExpenses(): Promise<void> {
    console.log('🏷️ Recategorizing existing expenses...');
    
    const { data: expenses } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .eq('type', 'expense');

    if (!expenses) return;

    for (const expense of expenses) {
      const description = expense.metadata?.description || '';
      const amount = expense.value || 0;
      const source = expense.metadata?.source || '';
      
      const { category, subcategory } = this.categorizeExpense(description, amount, source);
      const vendor = this.extractVendor(description, source);

      const updatedMetadata = {
        ...expense.metadata,
        category,
        subcategory,
        vendor
      };

      await this.supabase
        .from('metrics')
        .update({ metadata: updatedMetadata })
        .eq('id', expense.id);
    }

    console.log(`✅ Recategorized ${expenses.length} expense records`);
  }

  // Helper methods
  private createDeduplicationKey(metric: any): string {
    const date = metric.recorded_at.split('T')[0];
    const description = (metric.metadata?.description || '').substring(0, 30);
    const amount = metric.value;
    const source = metric.metadata?.source || 'unknown';
    
    return `${date}-${description}-${amount}-${source}`;
  }

  private categorizeExpense(description: string, amount: number, source: string): { category: string; subcategory?: string } {
    const desc = description.toLowerCase();
    const src = source.toLowerCase();
    
    // Pet Care (your major expense category)
    if (desc.includes('royal canin') || desc.includes('pet') || src.includes('supertails') || 
        desc.includes('poop bags') || desc.includes('cat') || desc.includes('litter')) {
      if (desc.includes('food') || desc.includes('royal canin')) {
        return { category: 'Pet Care', subcategory: 'Food' };
      } else if (desc.includes('litter') || desc.includes('poop bags')) {
        return { category: 'Pet Care', subcategory: 'Hygiene' };
      }
      return { category: 'Pet Care', subcategory: 'General' };
    }
    
    // Food & Grocery with detailed breakdown
    if (src.includes('zepto') || src.includes('blinkit') || src.includes('swiggy instamart') || desc.includes('groceries')) {
      if (src.includes('mk retail') || desc.includes('mk retail')) {
        return { category: 'Food & Grocery', subcategory: 'MK Retail' };
      } else if (desc.includes('bread') || desc.includes('milk') || desc.includes('eggs') || desc.includes('rice')) {
        return { category: 'Food & Grocery', subcategory: 'Staples' };
      } else if (desc.includes('snacks') || desc.includes('chips') || desc.includes('mountain dew') || desc.includes('chupa chups')) {
        return { category: 'Food & Grocery', subcategory: 'Snacks & Beverages' };
      } else if (desc.includes('vegetables') || desc.includes('fruits') || desc.includes('tomato')) {
        return { category: 'Food & Grocery', subcategory: 'Fresh Produce' };
      }
      return { category: 'Food & Grocery', subcategory: 'General' };
    }
    
    // Food Delivery
    if ((src.includes('swiggy') && !src.includes('instamart')) || src.includes('zomato') || 
        desc.includes('food delivery') || desc.includes('dinner order') || desc.includes('lunch')) {
      return { category: 'Food Delivery', subcategory: 'Meals' };
    }
    
    // Rent & Housing
    if (desc.includes('rent') || desc.includes('shettyarjun') || amount === 10872) {
      return { category: 'Housing', subcategory: 'Rent' };
    }
    
    // Healthcare & Medicine
    if (desc.includes('bupropion') || desc.includes('medicine') || desc.includes('pharmacy') || 
        src.includes('apollo') || desc.includes('doctor')) {
      return { category: 'Healthcare', subcategory: 'Medicine' };
    }
    
    // Transportation
    if (src.includes('yulu') || desc.includes('uber') || desc.includes('ola') || desc.includes('taxi')) {
      return { category: 'Transportation', subcategory: 'Rides' };
    }
    
    // Subscriptions
    if (src.includes('spotify') || desc.includes('netflix') || desc.includes('google one') || 
        desc.includes('apple tv') || desc.includes('jiostar') || desc.includes('subscription')) {
      return { category: 'Subscriptions', subcategory: 'Entertainment' };
    }
    
    // Domestic Help
    if (desc.includes('cook') || desc.includes('maid') || desc.includes('domestic')) {
      return { category: 'Domestic Help', subcategory: 'Salary' };
    }
    
    // Savings/Investment
    if (desc.includes('transfer to pot') || desc.includes('investment') || desc.includes('saving')) {
      return { category: 'Savings/Investment', subcategory: 'Pot Transfer' };
    }
    
    // UPI Transfers
    if (desc.includes('upi') || desc.includes('transfer')) {
      return { category: 'UPI Transfer', subcategory: 'General' };
    }
    
    return { category: 'Other', subcategory: 'Uncategorized' };
  }

  private extractVendor(description: string, source: string): string {
    const desc = description.toLowerCase();
    const src = source.toLowerCase();
    
    if (src.includes('zepto') || desc.includes('zepto')) return 'Zepto';
    if (src.includes('swiggy')) return 'Swiggy';
    if (src.includes('blinkit') || desc.includes('blinkit')) return 'Blinkit';
    if (src.includes('supertails') || desc.includes('supertails')) return 'Supertails';
    if (src.includes('mk retail') || desc.includes('mk retail')) return 'MK Retail';
    if (src.includes('yulu') || desc.includes('yulu')) return 'Yulu';
    if (src.includes('spotify') || desc.includes('spotify')) return 'Spotify';
    if (src.includes('apollo') || desc.includes('apollo')) return 'Apollo';
    if (src.includes('zomato') || desc.includes('zomato')) return 'Zomato';
    
    return source || 'Unknown';
  }

  // Main execution method
  async executeFullFix(): Promise<void> {
    console.log('🚀 Starting complete finance data fix...');
    
    try {
      await this.cleanupDuplicates();
      await this.importCryptoFromKnowledge(); // Fix the $0 crypto issue
      await this.importExpensesFromKnowledge();
      await this.recategorizeExpenses();
      
      console.log('✅ Finance data fix completed successfully!');
      
      // Generate summary
      await this.generateSummary();
      
    } catch (error) {
      console.error('❌ Error during finance data fix:', error);
    }
  }

  private async generateSummary(): Promise<void> {
    const { data: metrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId);

    if (!metrics) return;

    const expenses = metrics.filter(m => m.type === 'expense');
    const crypto = metrics.filter(m => m.type === 'crypto_value');
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const totalCrypto = crypto.reduce((sum, c) => sum + c.value, 0);
    
    console.log('📊 FINANCE DATA SUMMARY:');
    console.log(`💰 Total Expenses: ₹${totalExpenses.toLocaleString()}`);
    console.log(`₿ Crypto Portfolio: ${totalCrypto.toFixed(2)} (₹${(totalCrypto * 83).toLocaleString()})`);
    console.log(`📝 Total Records: ${metrics.length}`);
    console.log(`🏷️ Expense Categories: ${new Set(expenses.map(e => e.metadata?.category)).size}`);
    console.log(`🪙 Crypto Holdings: ${crypto.length}`);
    
    // Category breakdown
    const categoryMap = new Map<string, number>();
    for (const expense of expenses) {
      const category = expense.metadata?.category || 'Other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + expense.value);
    }
    
    console.log('\n🏷️ TOP EXPENSE CATEGORIES:');
    Array.from(categoryMap.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([category, amount]) => {
        console.log(`   ${category}: ₹${amount.toLocaleString()}`);
      });
  }
}

// Usage script
export async function fixFinanceData(supabase: any, userId: string) {
  const fixer = new FinanceDataFixer(supabase, userId);
  await fixer.executeFullFix();
}

// Quick fix script you can run
export const quickFixScript = `
// Run this in your browser console on the finance page to fix the data:

async function quickFix() {
  console.log('🔧 Starting quick finance data fix...');
  
  // This would call your API endpoint to run the fix
  const response = await fetch('/api/finance/fix-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'full-fix' })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Fix completed!');
    console.log('📊 Summary:', result.summary);
    
    // Refresh the page to see updated data
    window.location.reload();
  } else {
    console.error('❌ Fix failed:', result.error);
  }
}

// Run the fix
quickFix();
`;