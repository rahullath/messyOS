// src/components/expenses/SmartExpenseNutritionWidget.tsx - Smart Integration Widget
import React, { useState, useEffect } from 'react';

interface NutritionExpenseData {
  grocery_expenses: Array<{
    id: string;
    date: string;
    merchant: string;
    amount: number;
    category: string;
    has_nutrition_link: boolean;
    nutrition_value?: number;
  }>;
  nutrition_logs: Array<{
    id: string;
    food_name: string;
    calories: number;
    protein: number;
    meal_type: string;
    logged_at: string;
  }>;
  analysis: {
    total_spent: number;
    total_calories: number;
    total_protein: number;
    calories_per_currency: number;
    protein_per_currency: number;
    efficiency_rating: string;
    meals_logged: number;
    grocery_transactions: number;
  };
  historical_trends: {
    trend: string;
    average_nutrition_value: number;
    best_merchants: Array<{
      name: string;
      avg_nutrition_value: number;
      transaction_count: number;
    }>;
    spending_pattern: string;
  };
  suggestions: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }>;
}

export default function SmartExpenseNutritionWidget() {
  const [data, setData] = useState<NutritionExpenseData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'suggestions'>('overview');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/expenses/nutrition-link?date=${selectedDate}&analysis=daily`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch nutrition expense data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const linkExpenseToNutrition = async (expenseId: string, nutritionLogIds: string[]) => {
    try {
      const response = await fetch('/api/expenses/nutrition-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: expenseId,
          nutrition_log_ids: nutritionLogIds,
          estimated_nutrition_value: data ? data.analysis.calories_per_currency : 0
        })
      });

      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to link expense:', error);
    }
  };

  const getEfficiencyColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'text-green-400';
      case 'Good': return 'text-blue-400';
      case 'Average': return 'text-yellow-400';
      case 'Poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-500 bg-opacity-10';
      case 'medium': return 'border-yellow-500 bg-yellow-500 bg-opacity-10';
      case 'low': return 'border-blue-500 bg-blue-500 bg-opacity-10';
      default: return 'border-gray-500 bg-gray-500 bg-opacity-10';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <div className="text-center py-8">
          <span className="text-6xl block mb-4">🔗</span>
          <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
          <p className="text-gray-400 mb-4">
            Start logging both expenses and nutrition to see intelligent insights
          </p>
          <div className="flex space-x-4 justify-center">
            <button className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700">
              Upload Bank Statement
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Log Food
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { analysis, grocery_expenses, nutrition_logs, historical_trends, suggestions } = data;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-green-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h2 className="text-xl font-bold text-white">Smart Expense + Nutrition</h2>
              <p className="text-cyan-100 text-sm">
                Connecting your spending with your health goals
              </p>
            </div>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white bg-opacity-20 text-white px-3 py-2 rounded border border-white border-opacity-30 focus:border-opacity-60 focus:outline-none"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'insights', label: 'Insights', icon: '💡' },
          { id: 'suggestions', label: 'Suggestions', icon: '🎯' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white border-b-2 border-cyan-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-750'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  £{analysis.total_spent.toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">Grocery Spending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {Math.round(analysis.total_calories)}
                </div>
                <div className="text-gray-400 text-sm">Calories Logged</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {Math.round(analysis.total_protein)}g
                </div>
                <div className="text-gray-400 text-sm">Protein Logged</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getEfficiencyColor(analysis.efficiency_rating)}`}>
                  {analysis.efficiency_rating}
                </div>
                <div className="text-gray-400 text-sm">Efficiency</div>
              </div>
            </div>

            {/* Value Analysis */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-white mb-3">Nutrition Value Analysis</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Calories per £:</span>
                  <span className="text-white font-medium ml-2">
                    {analysis.calories_per_currency.toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Protein per £:</span>
                  <span className="text-white font-medium ml-2">
                    {analysis.protein_per_currency.toFixed(1)}g
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                Higher values indicate better nutritional value for money spent
              </div>
            </div>

            {/* Unlinked Items */}
            {grocery_expenses.some(e => !e.has_nutrition_link) && (
              <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-400 mb-2">
                  🔗 Link Missing Expenses
                </h4>
                <div className="space-y-2">
                  {grocery_expenses
                    .filter(e => !e.has_nutrition_link)
                    .slice(0, 3)
                    .map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-white text-sm">{expense.merchant}</span>
                          <span className="text-gray-400 text-xs ml-2">£{expense.amount.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => linkExpenseToNutrition(expense.id, nutrition_logs.map(n => n.id))}
                          className="bg-yellow-600 text-black px-3 py-1 rounded text-xs hover:bg-yellow-700"
                        >
                          Auto Link
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* Historical Trends */}
            <div>
              <h4 className="font-medium text-white mb-3">📈 Historical Trends</h4>
              <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Average Nutrition Value:</span>
                  <span className="text-white font-medium">
                    {historical_trends.average_nutrition_value.toFixed(1)} cal/£
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Spending Pattern:</span>
                  <span className="text-white font-medium">{historical_trends.spending_pattern}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Data Quality:</span>
                  <span className={`font-medium ${
                    historical_trends.trend === 'sufficient_data' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {historical_trends.trend === 'sufficient_data' ? 'Good' : 'Building...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Best Merchants */}
            {historical_trends.best_merchants.length > 0 && (
              <div>
                <h4 className="font-medium text-white mb-3">🏆 Best Value Merchants</h4>
                <div className="space-y-2">
                  {historical_trends.best_merchants.map((merchant, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="text-white">{merchant.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-medium">
                          {merchant.avg_nutrition_value.toFixed(1)} cal/£
                        </div>
                        <div className="text-gray-400 text-xs">
                          {merchant.transaction_count} purchases
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Breakdown */}
            <div>
              <h4 className="font-medium text-white mb-3">📅 Today's Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 p-3 rounded-lg">
                  <h5 className="text-cyan-400 font-medium mb-2">Grocery Expenses</h5>
                  <div className="text-sm text-gray-300">
                    {analysis.grocery_transactions} transactions
                  </div>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <h5 className="text-green-400 font-medium mb-2">Nutrition Logs</h5>
                  <div className="text-sm text-gray-300">
                    {analysis.meals_logged} meals logged
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <div key={index} className={`border p-4 rounded-lg ${getPriorityColor(suggestion.priority)}`}>
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl mt-1">
                      {suggestion.type === 'linking' ? '🔗' :
                       suggestion.type === 'cost_optimization' ? '💰' :
                       suggestion.type === 'nutrition_optimization' ? '🥗' :
                       suggestion.type === 'uk_specific' ? '🇬🇧' : '💡'}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="font-medium text-white">{suggestion.message}</h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          suggestion.priority === 'high' ? 'bg-red-600 text-white' :
                          suggestion.priority === 'medium' ? 'bg-yellow-600 text-black' :
                          'bg-blue-600 text-white'
                        }`}>
                          {suggestion.priority}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{suggestion.action}</p>
                      <button className="bg-cyan-600 text-white px-3 py-1 rounded text-xs hover:bg-cyan-700">
                        Take Action
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl block mb-2">🎯</span>
                <p className="text-gray-400">
                  No suggestions available yet. Keep tracking both expenses and nutrition!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}