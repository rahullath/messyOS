// Budget Breakdown Component - Category-wise spending visualization
import React from 'react';

interface BudgetCategory {
  category: string;
  spent: number;
  limit: number;
  color: string;
  icon: string;
}

interface BudgetBreakdownProps {
  totalSpent: number;
  totalBudget: number;
  categories?: BudgetCategory[];
}

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  totalSpent,
  totalBudget,
  categories = []
}) => {
  const percentage = (totalSpent / totalBudget) * 100;
  const remaining = totalBudget - totalSpent;

  const getStatusColor = (spent: number, limit: number) => {
    const pct = (spent / limit) * 100;
    if (pct >= 100) return 'text-red-600 bg-red-50';
    if (pct >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressColor = (spent: number, limit: number) => {
    const pct = (spent / limit) * 100;
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Budget Breakdown</h3>

      {/* Overall Progress */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-gray-600">Total This Week</div>
            <div className="text-3xl font-bold text-gray-900">
              £{totalSpent.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Remaining</div>
            <div className={`text-2xl font-bold ${
              remaining >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              £{Math.abs(remaining).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className={`h-4 rounded-full transition-all ${
              percentage >= 100 ? 'bg-red-500' :
              percentage >= 70 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-gray-600">
          <span>£0</span>
          <span className="font-medium">{percentage.toFixed(0)}%</span>
          <span>£{totalBudget.toFixed(0)}</span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 mb-3">By Category</h4>

        {categories.length > 0 ? (
          categories.map((cat, idx) => {
            const catPercentage = (cat.spent / cat.limit) * 100;
            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {cat.category}
                      </div>
                      <div className="text-xs text-gray-600">
                        £{cat.spent.toFixed(2)} of £{cat.limit.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    getStatusColor(cat.spent, cat.limit)
                  }`}>
                    {catPercentage.toFixed(0)}%
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      getProgressColor(cat.spent, cat.limit)
                    }`}
                    style={{ width: `${Math.min(catPercentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">💰</div>
            <p className="text-sm text-gray-600">No spending categories set up</p>
            <button
              onClick={() => window.location.href = '#budget-setup'}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Set up categories
            </button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {categories.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Categories</div>
              <div className="text-lg font-bold text-gray-900">{categories.length}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Over Budget</div>
              <div className="text-lg font-bold text-red-600">
                {categories.filter(c => c.spent > c.limit).length}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">On Track</div>
              <div className="text-lg font-bold text-green-600">
                {categories.filter(c => c.spent <= c.limit * 0.7).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
