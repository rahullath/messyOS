// src/components/expenses/ExpenseDashboard.tsx - Comprehensive Expense Dashboard
import React, { useState, useEffect } from 'react';

interface ExpenseSummary {
  total_spent: number;
  daily_average: number;
  transaction_count: number;
  currency: string;
  secondary_currency?: string;
  trend_percentage: number;
  timeframe: string;
  date_range: { start: string; end: string };
}

interface CategoryData {
  name: string;
  amount: number;
  icon: string;
  color: string;
  percentage: number;
}

interface Transaction {
  id: string;
  date: string;
  merchant?: string;
  description: string;
  amount: number;
  category?: string;
  category_icon?: string;
  secondary_amount?: number;
}

interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  category?: string;
  category_icon?: string;
  is_exceeded: boolean;
}

interface PriceInsight {
  type: string;
  merchant: string;
  message: string;
  date: string;
  severity: 'low' | 'medium' | 'high';
}

interface DashboardData {
  summary: ExpenseSummary;
  categories: CategoryData[];
  daily_spending: Array<{ date: string; amount: number }>;
  recent_transactions: Transaction[];
  top_merchants: Array<{ name: string; amount: number }>;
  budgets: Budget[];
  price_insights: PriceInsight[];
  user_settings: {
    country?: string;
    is_uk_user: boolean;
    is_first_month: boolean;
    currency_symbol: string;
  };
}

export default function ExpenseDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeframe]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/expenses/dashboard?timeframe=${selectedTimeframe}`);
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch expense data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadStatement = async () => {
    if (!uploadFile) return;
    
    setUploadProgress(10);
    
    const formData = new FormData();
    formData.append('file', uploadFile);
    
    try {
      setUploadProgress(50);
      
      const response = await fetch('/api/expenses/upload-statement', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      setUploadProgress(100);
      
      if (result.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadProgress(0);
        fetchDashboardData(); // Refresh dashboard
        
        // Show success message with summary
        alert(`Successfully imported ${result.summary.total_transactions} transactions totaling ${dashboardData?.user_settings.currency_symbol}${result.summary.total_amount.toFixed(2)}`);
      } else {
        alert(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    }
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const symbol = dashboardData?.user_settings.currency_symbol || '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatSecondaryCurrency = (amount?: number) => {
    if (!amount || !dashboardData?.summary.secondary_currency) return '';
    const symbols: Record<string, string> = { 'INR': '₹', 'USD': '$', 'EUR': '€' };
    const symbol = symbols[dashboardData.summary.secondary_currency] || dashboardData.summary.secondary_currency;
    return ` (${symbol}${amount.toFixed(0)})`;
  };

  const getTrendIcon = (percentage: number) => {
    if (percentage > 10) return { icon: '📈', color: 'text-messy-error', text: 'up' };
    if (percentage < -10) return { icon: '📉', color: 'text-messy-success', text: 'down' };
    return { icon: '➡️', color: 'text-messy-secondary', text: 'stable' };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-messy-error';
      case 'medium': return 'text-messy-warning';
      case 'low': return 'text-messy-success';
      default: return 'text-messy-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 min-h-screen p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-800 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-800 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-800 rounded-lg"></div>
            <div className="h-64 bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="bg-gray-900 min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💳</div>
          <h2 className="text-2xl font-bold text-white mb-2">No expense data found</h2>
          <p className="text-gray-400 mb-6">Upload your first bank statement to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-cyan-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-cyan-700"
          >
            Upload Bank Statement
          </button>
        </div>
      </div>
    );
  }

  const { summary, categories, recent_transactions, top_merchants, budgets, price_insights, user_settings } = dashboardData;
  const trend = getTrendIcon(summary.trend_percentage);

  return (
    <div className="bg-gray-900 min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">💰 Expense Dashboard</h1>
          <p className="text-gray-400">
            {user_settings.is_uk_user ? 'UK' : 'Global'} tracking • {summary.timeframe} view
            {user_settings.is_first_month && (
              <span className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">First Month</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Timeframe Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedTimeframe(period)}
                className={`px-4 py-2 rounded capitalize ${
                  selectedTimeframe === period
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-700"
          >
            Upload Statement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Total Spent</span>
            <span className={`${trend.color} text-sm`}>
              {trend.icon} {Math.abs(summary.trend_percentage).toFixed(1)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(summary.total_spent)}
            {user_settings.is_uk_user && summary.secondary_currency && (
              <div className="text-lg text-gray-400">
                ≈ ₹{(summary.total_spent * 104.5).toFixed(0)}
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <span className="text-gray-400">Daily Average</span>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(summary.daily_average)}
          </div>
          <div className="text-sm text-gray-400">
            {summary.transaction_count} transactions
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <span className="text-gray-400">Top Category</span>
          <div className="flex items-center space-x-2 mt-2">
            <span className="text-2xl">{categories[0]?.icon}</span>
            <div>
              <div className="text-lg font-bold text-white">{categories[0]?.name}</div>
              <div className="text-sm text-gray-400">
                {categories[0]?.percentage.toFixed(1)}% of spending
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Insights (UK Users) */}
      {price_insights.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">💡 Price Insights</h3>
          <div className="space-y-3">
            {price_insights.slice(0, 3).map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-700 rounded-lg">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className={`font-medium ${getSeverityColor(insight.severity)}`}>
                    {insight.message}
                  </p>
                  <p className="text-sm text-gray-400">{insight.merchant} • {insight.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Category Breakdown */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">📊 Spending by Category</h3>
          <div className="space-y-4">
            {categories.slice(0, 6).map((category, index) => (
              <div key={index} className="flex items-center space-x-4">
                <span className="text-2xl">{category.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium">{category.name}</span>
                    <span className="text-gray-400 text-sm">
                      {formatCurrency(category.amount)} ({category.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${category.percentage}%`,
                        backgroundColor: category.color
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">📝 Recent Transactions</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recent_transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center space-x-4 p-3 bg-gray-700 rounded-lg">
                <span className="text-lg">{transaction.category_icon || '💳'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-medium truncate">
                        {transaction.merchant || transaction.description}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {new Date(transaction.date).toLocaleDateString()} • {transaction.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatCurrency(transaction.amount)}
                      </div>
                      {transaction.secondary_amount && (
                        <div className="text-gray-400 text-xs">
                          {formatSecondaryCurrency(transaction.secondary_amount)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Merchants */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">🏪 Top Merchants</h3>
          <div className="space-y-3">
            {top_merchants.map((merchant, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏪'}</span>
                  <span className="text-white font-medium">{merchant.name}</span>
                </div>
                <span className="text-gray-400">{formatCurrency(merchant.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budgets */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">🎯 Budget Progress</h3>
          {budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.slice(0, 4).map((budget) => (
                <div key={budget.id} className="p-3 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <span>{budget.category_icon || '🎯'}</span>
                      <span className="text-white font-medium">{budget.name}</span>
                    </div>
                    <span className={`text-sm font-medium ${
                      budget.is_exceeded ? 'text-red-400' : 
                      budget.percentage > 80 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {budget.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>{formatCurrency(budget.spent)} spent</span>
                    <span>{formatCurrency(budget.remaining)} left</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        budget.is_exceeded ? 'bg-red-500' :
                        budget.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <span className="text-4xl block mb-2">🎯</span>
              <p>No budgets set up yet</p>
              <button className="mt-2 text-cyan-400 hover:text-cyan-300">
                Create your first budget
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Upload Bank Statement</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Select CSV file from your bank
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full bg-gray-700 text-white p-3 rounded border border-gray-600 file:bg-cyan-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:mr-3"
                />
              </div>
              
              {uploadProgress > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-cyan-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              
              <div className="text-sm text-gray-400">
                <p>Supported formats:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>UK banks: Barclays, HSBC, Santander, Lloyds, NatWest</li>
                  <li>US banks: Chase, Bank of America</li>
                  <li>Indian banks: HDFC, ICICI</li>
                  <li>Generic CSV with date, description, amount columns</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={uploadStatement}
                  disabled={!uploadFile || uploadProgress > 0}
                  className="flex-1 bg-cyan-600 text-white py-2 rounded font-medium hover:bg-cyan-700 disabled:opacity-50"
                >
                  {uploadProgress > 0 ? 'Uploading...' : 'Upload & Process'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadProgress(0);
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}