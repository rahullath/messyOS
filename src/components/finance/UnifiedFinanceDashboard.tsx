// src/components/finance/UnifiedFinanceDashboard.tsx
import React, { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  source: 'bank' | 'manual' | 'crypto';
  metadata?: any;
}

interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  transactions: Transaction[];
  subcategories?: { [key: string]: number };
}

export default function UnifiedFinanceDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [cryptoPortfolio, setCryptoPortfolio] = useState<any[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [cryptoValue, setCryptoValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      const response = await fetch('/api/finance/unified-data');
      const data = await response.json();
      
      if (data.success) {
        const unifiedTransactions = processTransactions(data.transactions);
        setTransactions(unifiedTransactions);
        
        const categoryData = calculateCategories(unifiedTransactions);
        setCategories(categoryData);
        
        setCryptoPortfolio(data.crypto);
        setTotalExpenses(unifiedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0));
        setCryptoValue(data.crypto.reduce((sum: number, c: any) => sum + c.currentValue, 0));
      }
    } catch (error) {
      console.error('Failed to load finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (rawTransactions: any[]): Transaction[] => {
    // Deduplicate and categorize transactions
    const processed: Transaction[] = [];
    const seen = new Set<string>();

    for (const tx of rawTransactions) {
      // Create unique key to avoid duplicates
      const key = `${tx.date}-${tx.description.substring(0, 20)}-${Math.abs(tx.amount)}`;
      
      if (seen.has(key)) continue;
      seen.add(key);

      // Enhanced categorization
      const category = enhancedCategorization(tx.description, tx.amount, tx.metadata);
      
      processed.push({
        id: tx.id || `tx-${processed.length}`,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: category.main,
        subcategory: category.sub,
        source: tx.source || 'bank',
        metadata: tx.metadata
      });
    }

    return processed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const enhancedCategorization = (description: string, amount: number, metadata: any) => {
    const desc = description.toLowerCase();
    
    // Priority categorization with subcategories
    if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('apple') || desc.includes('jio')) {
      return { main: 'Subscriptions', sub: getSubscriptionType(desc) };
    }
    
    if (desc.includes('transfer to pot') || desc.includes('ifn/neo')) {
      return { main: 'Savings/Investment', sub: 'Jupiter Pots' };
    }
    
    if (desc.includes('pet') || desc.includes('carniwel') || desc.includes('royal canin') || desc.includes('litter')) {
      return { main: 'Pet Care', sub: getPetCareType(desc) };
    }
    
    if (desc.includes('zepto') || desc.includes('blinkit') || desc.includes('instamart') || desc.includes('grocery')) {
      return { main: 'Groceries', sub: getGroceryType(desc) };
    }
    
    if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('dominos') || desc.includes('pizza')) {
      return { main: 'Food Delivery', sub: 'Restaurant' };
    }
    
    if (desc.includes('gym') || desc.includes('fitness') || desc.includes('protein')) {
      return { main: 'Health & Fitness', sub: 'Gym/Supplements' };
    }
    
    if (desc.includes('yulu') || desc.includes('uber') || desc.includes('ola')) {
      return { main: 'Transportation', sub: getTransportType(desc) };
    }
    
    if (desc.includes('rent') || desc.includes('shettyarjun')) {
      return { main: 'Housing', sub: 'Rent' };
    }
    
    if (desc.includes('cook') || desc.includes('maid') || desc.includes('domestic')) {
      return { main: 'Domestic Help', sub: 'Cook/Maid' };
    }
    
    if (desc.includes('medicine') || desc.includes('apollo') || desc.includes('pharmacy')) {
      return { main: 'Healthcare', sub: 'Medicine' };
    }
    
    if (desc.includes('atm') || desc.includes('withdrawal')) {
      return { main: 'Cash Withdrawal', sub: 'ATM' };
    }
    
    if (amount > 0) {
      return { main: 'Income', sub: 'Credit' };
    }
    
    return { main: 'Other', sub: 'Miscellaneous' };
  };

  const getSubscriptionType = (desc: string) => {
    if (desc.includes('spotify')) return 'Music';
    if (desc.includes('netflix') || desc.includes('apple')) return 'Entertainment';
    if (desc.includes('jio')) return 'Telecom';
    return 'Other';
  };

  const getPetCareType = (desc: string) => {
    if (desc.includes('food') || desc.includes('carniwel') || desc.includes('royal canin')) return 'Food';
    if (desc.includes('litter')) return 'Litter';
    if (desc.includes('treats')) return 'Treats';
    return 'Other';
  };

  const getGroceryType = (desc: string) => {
    if (desc.includes('zepto')) return 'Zepto';
    if (desc.includes('blinkit')) return 'Blinkit';
    if (desc.includes('instamart')) return 'Instamart';
    return 'Other';
  };

  const getTransportType = (desc: string) => {
    if (desc.includes('yulu')) return 'Bike';
    if (desc.includes('uber') || desc.includes('ola')) return 'Cab';
    return 'Other';
  };

  const calculateCategories = (transactions: Transaction[]): CategoryBreakdown[] => {
    const categoryMap = new Map<string, CategoryBreakdown>();

    transactions.forEach(tx => {
      if (tx.amount >= 0) return; // Skip income

      const amount = Math.abs(tx.amount);
      const category = tx.category;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          total: 0,
          percentage: 0,
          transactions: [],
          subcategories: {}
        });
      }

      const cat = categoryMap.get(category)!;
      cat.total += amount;
      cat.transactions.push(tx);
      
      if (tx.subcategory) {
        cat.subcategories = cat.subcategories || {};
        cat.subcategories[tx.subcategory] = (cat.subcategories[tx.subcategory] || 0) + amount;
      }
    });

    const totalExpenses = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.total, 0);
    
    return Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: (cat.total / totalExpenses) * 100
      }))
      .sort((a, b) => b.total - a.total);
  };

  const financialRunway = totalExpenses > 0 ? (94300 / totalExpenses) * 12 : 0; // months

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-surface-hover rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-surface-hover rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-text-primary mb-2">Finance Dashboard</h1>
        <p className="text-text-secondary">
          Track expenses, manage crypto portfolio, and optimize your financial runway
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-text-muted">Monthly Expenses</p>
              <p className="text-2xl font-bold text-text-primary">₹{totalExpenses.toLocaleString()}</p>
              <p className="text-sm text-accent-error">High</p>
            </div>
            <span className="text-2xl">💸</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-text-muted">Crypto Portfolio</p>
              <p className="text-2xl font-bold text-text-primary">${cryptoValue.toFixed(2)}</p>
              <p className="text-sm text-text-muted">₹{(cryptoValue * 83).toLocaleString()}</p>
            </div>
            <span className="text-2xl">₿</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-text-muted">Financial Runway</p>
              <p className="text-2xl font-bold text-text-primary">{financialRunway.toFixed(1)}</p>
              <p className="text-sm text-text-muted">months left</p>
            </div>
            <span className="text-2xl">⏱️</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-text-muted">Budget Health</p>
              <p className="text-2xl font-bold text-accent-warning">50/100</p>
              <p className="text-sm text-accent-warning">warning</p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      {/* Job Search Strategy */}
      <div className="card p-6 bg-gradient-to-r from-accent-primary/10 to-accent-purple/10 border border-accent-primary/20">
        <h3 className="text-lg font-semibold text-text-primary mb-4">🎯 Job Search Financial Strategy</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-error">{financialRunway.toFixed(1)}</div>
            <div className="text-sm text-text-muted">Months Remaining</div>
            <div className="text-xs text-text-muted">At current spending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-warning">Jul 31</div>
            <div className="text-sm text-text-muted">Target Job Date</div>
            <div className="text-xs text-text-muted">For September comfort</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-primary">₹{(totalExpenses * 0.8).toLocaleString()}</div>
            <div className="text-sm text-text-muted">Optimized Budget</div>
            <div className="text-xs text-text-muted">20% reduction target</div>
          </div>
        </div>
        <p className="text-sm text-text-secondary mt-4">
          <strong>Strategy:</strong> Your Y Combinator background + Web3 expertise positions you well. 
          Reduce MK Retail spending (₹3,053→₹1,500) and convenience purchases to extend runway to {(financialRunway * 1.2).toFixed(1)} months.
        </p>
      </div>

      {/* Expense Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Top Expense Categories</h3>
          <div className="space-y-4">
            {categories.slice(0, 6).map((category, index) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary">{category.category}</span>
                  <span className="text-text-primary">₹{category.total.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-surface-hover rounded-full h-2">
                    <div 
                      className="bg-accent-primary rounded-full h-2 transition-all"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-text-muted">{category.percentage.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-text-muted">
                  {category.percentage.toFixed(1)}% of total • ₹{Math.round(category.total / 30)}/day avg
                </div>
                
                {/* Subcategory breakdown */}
                {category.subcategories && Object.keys(category.subcategories).length > 1 && (
                  <div className="ml-4 space-y-1">
                    {Object.entries(category.subcategories)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([sub, amount]) => (
                        <div key={sub} className="flex justify-between text-xs">
                          <span className="text-text-muted">• {sub}</span>
                          <span className="text-text-muted">₹{amount.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.slice(0, 10).map((tx, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getCategoryIcon(tx.category)}</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {tx.description.length > 30 ? tx.description.substring(0, 30) + '...' : tx.description}
                    </p>
                    <p className="text-xs text-text-muted">
                      {tx.subcategory} • {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`font-medium ${tx.amount < 0 ? 'text-accent-error' : 'text-accent-success'}`}>
                  {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">💡 AI Budget Recommendations</h3>
        <div className="space-y-3">
          {[
            `Reduce monthly expenses from ₹${totalExpenses.toLocaleString()} to ₹35,000 target`,
            `Critical: Less than ${financialRunway.toFixed(1)} months runway. Find job immediately or reduce expenses by 50%`,
            `Consider diversifying crypto portfolio beyond current ${cryptoPortfolio.length} holdings`,
            'Target MK Retail reduction: from ₹3,053 to ₹1,500/month saves ₹1,553',
            'Cut convenience purchases (energy drinks, candy) by 50% saves ₹500/month'
          ].map((rec, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-accent-primary/5 rounded-lg">
              <span className="text-accent-primary font-bold text-sm">{index + 1}</span>
              <span className="text-sm text-text-secondary">{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: { [key: string]: string } = {
    'Pet Care': '🐱',
    'Groceries': '🛒',
    'Food Delivery': '🍕',
    'Subscriptions': '📱',
    'Transportation': '🚗',
    'Savings/Investment': '💰',
    'Healthcare': '⚕️',
    'Housing': '🏠',
    'Domestic Help': '👩‍🍳',
    'Health & Fitness': '💪',
    'Cash Withdrawal': '💳',
    'Income': '💵',
    'Other': '📊'
  };
  return icons[category] || '📊';
}