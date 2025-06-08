import React, { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  source: string;
  vendor: string;
}

interface CryptoHolding {
  symbol: string;
  quantity: number;
  price: number;
  currentValue: number;
  change: number;
  network: string;
}

interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  subcategories?: { [key: string]: number };
}

export default function EnhancedFinanceDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      const response = await fetch('/api/finance/unified-data');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        console.log('✅ Finance data loaded:', result.summary);
      } else {
        console.error('Failed to load finance data:', result.error);
      }
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryBreakdown = (): CategoryBreakdown[] => {
    if (!data?.transactions) return [];
    
    const categoryMap = new Map<string, { total: number; subcategories: Map<string, number> }>();
    const expenses = data.transactions.filter((t: Transaction) => t.amount < 0);
    
    for (const transaction of expenses) {
      const category = transaction.category;
      const subcategory = transaction.subcategory || 'General';
      const amount = Math.abs(transaction.amount);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { total: 0, subcategories: new Map() });
      }
      
      const categoryData = categoryMap.get(category)!;
      categoryData.total += amount;
      categoryData.subcategories.set(subcategory, (categoryData.subcategories.get(subcategory) || 0) + amount);
    }
    
    const totalExpenses = data.summary?.totalExpenses || 1;
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        percentage: (data.total / totalExpenses) * 100,
        subcategories: Object.fromEntries(data.subcategories)
      }))
      .sort((a, b) => b.total - a.total);
  };

  const formatCurrency = (amount: number, currency = '₹') => {
    return `${currency}${amount.toLocaleString('en-IN')}`;
  };

  const formatUSD = (amount: number) => {
    return `${amount.toFixed(2)}`;
  };

  const calculateRunway = () => {
    const currentBalance = 94300; // From your financial analysis
    const monthlyExpenses = data?.summary?.monthlyExpenses || 40546;
    return (currentBalance / monthlyExpenses).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading finance data...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No finance data available. Please import your data first.</p>
      </div>
    );
  }

  const categories = calculateCategoryBreakdown();
  const runway = calculateRunway();

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary?.monthlyExpenses || 0)}
              </p>
            </div>
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600">💸</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Crypto Portfolio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatUSD(data.summary?.cryptoValue || 0)}
              </p>
              <p className="text-xs text-gray-500">{formatCurrency(data.summary?.cryptoValue * 83 || 0)}</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600">₿</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Financial Runway</p>
              <p className="text-2xl font-bold text-gray-900">{runway}</p>
              <p className="text-xs text-gray-500">months left</p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-yellow-600">⏱️</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{data.summary?.totalTransactions || 0}</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'categories', 'crypto', 'transactions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Expense Categories</h3>
            <div className="space-y-4">
              {categories.slice(0, 6).map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{category.category}</span>
                      <span className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatCurrency(category.total)}</span>
                      <span>{formatCurrency(category.total / 30)}/day avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Health */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 AI Budget Recommendations</h3>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Critical:</strong> Less than 3 months runway. Find job immediately or reduce expenses by 30%
                </p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>MK Retail Optimization:</strong> Reduce from ₹3,053 to ₹1,500/month saves ₹1,553
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Convenience Cuts:</strong> Reduce snacks/beverages by 50% saves ₹500/month
                </p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Positive:</strong> Crypto diversified across {data.summary?.cryptoCount || 0} holdings
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div key={category.category} className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{category.category}</h3>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(category.total)}</p>
                  <p className="text-sm text-gray-500">{category.percentage.toFixed(1)}% of total</p>
                </div>
              </div>
              
              {category.subcategories && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Breakdown:</h4>
                  {Object.entries(category.subcategories)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .map(([subcat, amount]) => (
                      <div key={subcat} className="flex justify-between text-sm">
                        <span className="text-gray-600">{subcat}</span>
                        <span className="font-medium">{formatCurrency(amount as number)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'crypto' && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crypto Portfolio</h3>
          {data.crypto && data.crypto.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">24h Change</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.crypto.map((holding: CryptoHolding, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{holding.symbol}</div>
                          <div className="text-sm text-gray-500">{holding.network}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {holding.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatUSD(holding.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatUSD(holding.currentValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`${holding.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No crypto holdings found. Import your crypto data to see portfolio.</p>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.transactions.slice(0, 20).map((transaction: Transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.vendor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex space-x-4">
        <button
          onClick={loadFinanceData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Refresh Data
        </button>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          📊 Export Report
        </button>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          🤖 AI Analysis
        </button>
      </div>
    </div>
  );
}