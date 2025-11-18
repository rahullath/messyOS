// UK Student Expense Tracker Component
// Tracks expenses, categorizes spending, and provides quick expense entry

import React, { useState, useEffect } from 'react';
import type { 
  UKStudentExpense, 
  ExpenseTrackerProps,
  PaymentMethod 
} from '../../types/uk-student-finance';
import { ukFinanceService } from '../../lib/uk-student/uk-finance-service';

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  userId,
  expenses,
  categories,
  onExpenseAdd,
  onExpenseUpdate,
  onExpenseDelete
}) => {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<UKStudentExpense | null>(null);
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    description: '',
    category: '',
    store: '',
    paymentMethod: 'card' as PaymentMethod,
    transactionDate: new Date().toISOString().split('T')[0],
    tags: [] as string[],
    notes: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');

  const paymentMethods: PaymentMethod[] = ['monzo', 'iq-prepaid', 'icici-uk', 'cash', 'card', 'other'];

  const handleAddExpense = async () => {
    try {
      const expense = await ukFinanceService.addExpense({
        userId,
        amount: newExpense.amount,
        currency: 'GBP',
        description: newExpense.description,
        category: newExpense.category,
        store: newExpense.store || undefined,
        paymentMethod: newExpense.paymentMethod,
        transactionDate: new Date(newExpense.transactionDate),
        isRecurring: false,
        tags: newExpense.tags,
        notes: newExpense.notes || undefined
      });

      onExpenseAdd(expense);
      resetForm();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;

    try {
      const updatedExpense = await ukFinanceService.updateExpense(editingExpense.id, {
        amount: newExpense.amount,
        description: newExpense.description,
        category: newExpense.category,
        store: newExpense.store || undefined,
        paymentMethod: newExpense.paymentMethod,
        transactionDate: new Date(newExpense.transactionDate),
        tags: newExpense.tags,
        notes: newExpense.notes || undefined
      });

      onExpenseUpdate(updatedExpense);
      setEditingExpense(null);
      resetForm();
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await ukFinanceService.deleteExpense(expenseId);
      onExpenseDelete(expenseId);
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const resetForm = () => {
    setNewExpense({
      amount: 0,
      description: '',
      category: '',
      store: '',
      paymentMethod: 'card',
      transactionDate: new Date().toISOString().split('T')[0],
      tags: [],
      notes: ''
    });
    setTagInput('');
    setShowAddExpense(false);
  };

  const startEditing = (expense: UKStudentExpense) => {
    setEditingExpense(expense);
    setNewExpense({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      store: expense.store || '',
      paymentMethod: expense.paymentMethod,
      transactionDate: expense.transactionDate.toISOString().split('T')[0],
      tags: expense.tags,
      notes: expense.notes || ''
    });
    setShowAddExpense(true);
  };

  const addTag = () => {
    if (tagInput.trim() && !newExpense.tags.includes(tagInput.trim())) {
      setNewExpense({
        ...newExpense,
        tags: [...newExpense.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewExpense({
      ...newExpense,
      tags: newExpense.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const filteredAndSortedExpenses = expenses
    .filter(expense => !filterCategory || expense.category === filterCategory)
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'category':
          return a.category.localeCompare(b.category);
        case 'date':
        default:
          return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
      }
    });

  const totalExpenses = filteredAndSortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getCategoryColor = (category: string) => {
    const colors = {
      groceries: 'bg-green-100 text-green-800',
      transport: 'bg-blue-100 text-blue-800',
      food_out: 'bg-orange-100 text-orange-800',
      entertainment: 'bg-purple-100 text-purple-800',
      utilities: 'bg-yellow-100 text-yellow-800',
      education: 'bg-indigo-100 text-indigo-800',
      fitness: 'bg-red-100 text-red-800',
      personal_care: 'bg-pink-100 text-pink-800',
      household: 'bg-gray-100 text-gray-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Expense Tracker</h2>
            <p className="text-sm text-gray-600">
              Total: £{totalExpenses.toFixed(2)} ({filteredAndSortedExpenses.length} expenses)
            </p>
          </div>
          <button
            onClick={() => setShowAddExpense(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Expense
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Date (Newest First)</option>
              <option value="amount">Amount (Highest First)</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="divide-y divide-gray-200">
          {filteredAndSortedExpenses.map((expense) => (
            <div key={expense.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{expense.description}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                          {expense.category.replace('_', ' ')}
                        </span>
                        {expense.store && (
                          <span className="text-xs text-gray-600">at {expense.store}</span>
                        )}
                        <span className="text-xs text-gray-600">
                          via {expense.paymentMethod}
                        </span>
                      </div>
                      {expense.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {expense.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        £{expense.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(expense.transactionDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => startEditing(expense)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {expense.notes && (
                <div className="mt-2 text-sm text-gray-600">
                  {expense.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredAndSortedExpenses.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No expenses found. Add your first expense to get started!
          </div>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (£)
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What did you buy?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.replace('_', ' ').charAt(0).toUpperCase() + category.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store (Optional)
                </label>
                <input
                  type="text"
                  value={newExpense.store}
                  onChange={(e) => setNewExpense({ ...newExpense, store: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Aldi, Tesco"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={newExpense.paymentMethod}
                  onChange={(e) => setNewExpense({ ...newExpense, paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {paymentMethods.map(method => (
                    <option key={method} value={method}>
                      {method.charAt(0).toUpperCase() + method.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newExpense.transactionDate}
                  onChange={(e) => setNewExpense({ ...newExpense, transactionDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add tag"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                {newExpense.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newExpense.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded flex items-center space-x-1"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={editingExpense ? handleUpdateExpense : handleAddExpense}
                  disabled={!newExpense.amount || !newExpense.description || !newExpense.category}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
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
};