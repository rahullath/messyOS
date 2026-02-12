// UK Student Budget Manager Component
// Manages budgets, tracks spending, and displays budget health

import React, { useState, useEffect } from 'react';
import type { 
  UKStudentBudget, 
  BudgetHealth, 
  BudgetTemplate,
  BudgetManagerProps 
} from '../../types/uk-student-finance';
import { ukFinanceService } from '../../lib/uk-student/uk-finance-service';

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  userId,
  budgets,
  expenses,
  budgetHealth,
  onBudgetUpdate,
  onExpenseAdd
}) => {
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [budgetTemplates, setBudgetTemplates] = useState<BudgetTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<BudgetTemplate | null>(null);
  const [newBudget, setNewBudget] = useState({
    category: '',
    budgetType: 'monthly' as const,
    limitAmount: 0,
    alertThreshold: 0.8
  });

  useEffect(() => {
    loadBudgetTemplates();
  }, []);

  const loadBudgetTemplates = async () => {
    try {
      const templates = await ukFinanceService.getBudgetTemplates();
      setBudgetTemplates(templates);
    } catch (error) {
      console.error('Error loading budget templates:', error);
    }
  };

  const handleCreateBudget = async () => {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      if (newBudget.budgetType === 'weekly') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        periodStart.setTime(startOfWeek.getTime());
        periodEnd.setTime(endOfWeek.getTime());
      }

      const budget = await ukFinanceService.createBudget({
        userId,
        category: newBudget.category,
        budgetType: newBudget.budgetType,
        limitAmount: newBudget.limitAmount,
        periodStart,
        periodEnd,
        alertThreshold: newBudget.alertThreshold,
        isActive: true
      });

      onBudgetUpdate(budget);
      setShowCreateBudget(false);
      setNewBudget({
        category: '',
        budgetType: 'monthly',
        limitAmount: 0,
        alertThreshold: 0.8
      });
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const handleTemplateSelect = (template: BudgetTemplate) => {
    setSelectedTemplate(template);
    setNewBudget({
      category: template.category,
      budgetType: 'monthly',
      limitAmount: template.suggestedMonthlyAmount,
      alertThreshold: 0.8
    });
  };

  const getBudgetStatusColor = (status: 'under' | 'near' | 'over') => {
    switch (status) {
      case 'under': return 'text-green-600';
      case 'near': return 'text-yellow-600';
      case 'over': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getBudgetProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Budget Health Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Budget Health</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            budgetHealth.status === 'good' ? 'bg-green-100 text-green-800' :
            budgetHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {budgetHealth.status.charAt(0).toUpperCase() + budgetHealth.status.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {budgetHealth.overallScore}/100
            </div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              £{budgetHealth.totalSpent.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              £{budgetHealth.remainingBudget.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Remaining</div>
          </div>
        </div>

        {/* Recommendations */}
        {budgetHealth.recommendations.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Recommendations</h3>
            <ul className="space-y-1">
              {budgetHealth.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-blue-800">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Category Budgets */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Category Budgets</h2>
          <button
            onClick={() => setShowCreateBudget(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Budget
          </button>
        </div>

        <div className="space-y-4">
          {budgetHealth.categoryBreakdown.map((category) => (
            <div key={category.category} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium text-gray-900 capitalize">
                    {category.category.replace('_', ' ')}
                  </h3>
                  <span className={`text-sm font-medium ${getBudgetStatusColor(category.status)}`}>
                    {category.status === 'under' ? 'On Track' :
                     category.status === 'near' ? 'Near Limit' : 'Over Budget'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    £{category.spent.toFixed(2)} / £{category.budgeted.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {category.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getBudgetProgressColor(category.percentage)}`}
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>

              <div className="mt-2 text-sm text-gray-600">
                £{category.remaining.toFixed(2)} remaining
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Budget Modal */}
      {showCreateBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Budget</h3>

            {/* Budget Templates */}
            {!selectedTemplate && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose from templates:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {budgetTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-sm capitalize">
                        {template.category.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-600">
                        £{template.suggestedMonthlyAmount}/month
                      </div>
                      {template.isEssential && (
                        <div className="text-xs text-blue-600 font-medium">Essential</div>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedTemplate({} as BudgetTemplate)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Create custom budget
                </button>
              </div>
            )}

            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., groceries, transport"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Type
                  </label>
                  <select
                    value={newBudget.budgetType}
                    onChange={(e) => setNewBudget({ ...newBudget, budgetType: e.target.value as 'weekly' | 'monthly' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget Limit (£)
                  </label>
                  <input
                    type="number"
                    value={newBudget.limitAmount}
                    onChange={(e) => setNewBudget({ ...newBudget, limitAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alert Threshold ({Math.round(newBudget.alertThreshold * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={newBudget.alertThreshold}
                    onChange={(e) => setNewBudget({ ...newBudget, alertThreshold: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-600">
                    Get alerts when you reach {Math.round(newBudget.alertThreshold * 100)}% of your budget
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleCreateBudget}
                    disabled={!newBudget.category || newBudget.limitAmount <= 0}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Budget
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateBudget(false);
                      setSelectedTemplate(null);
                      setNewBudget({
                        category: '',
                        budgetType: 'monthly',
                        limitAmount: 0,
                        alertThreshold: 0.8
                      });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};