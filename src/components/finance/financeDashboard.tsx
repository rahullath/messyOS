// src/components/finance/FinanceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface FinanceStats {
  monthlyExpenses: number;
  cryptoValue: number;
  currentBalance: number;
  runway: number;
  topCategories: Array<{ category: string; amount: number; percentage: number }>;
  expensesTrend: Array<{ month: string; amount: number }>;
  cryptoHoldings: Array<{ symbol: string; value: number; quantity: number; chain: string; change24h: number }>;
  recentTransactions: Array<{ date: string; description: string; amount: number; category: string; vendor: string }>;
  budgetHealth: {
    score: number;
    status: 'excellent' | 'good' | 'warning' | 'critical';
    recommendations: string[];
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function FinanceDashboard({ userId }: { userId: string }) {
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3m');

  useEffect(() => {
    loadFinanceData();
  }, [userId, timeRange]);

  const loadFinanceData = async () => {
    try {
      const response = await fetch(`/api/finance/dashboard?userId=${userId}&range=${timeRange}`);
      const data = await response.json();
      setFinanceStats(data);
    } catch (error) {
      console.error('Failed to load finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="h-6 bg-surface-hover rounded mb-4"></div>
            <div className="h-32 bg-surface-hover rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!financeStats) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 bg-accent-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">💰</span>
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Financial Data</h3>
        <p className="text-text-muted mb-4">Import your expense data, crypto holdings, and bank statements to start tracking your finances.</p>
        <button 
          onClick={() => window.location.href = '/import'}
          className="px-4 py-2 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 transition-colors"
        >
          Import Financial Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Monthly Expenses */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Monthly Expenses</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                ₹{financeStats.monthlyExpenses.toLocaleString()}
              </p>
              <p className={`text-sm mt-1 ${
                financeStats.monthlyExpenses > 45000 ? 'text-accent-error' :
                financeStats.monthlyExpenses > 35000 ? 'text-accent-warning' : 'text-accent-success'
              }`}>
                {financeStats.monthlyExpenses > 45000 ? 'High' : 
                 financeStats.monthlyExpenses > 35000 ? 'Moderate' : 'Optimized'}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-error/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💸</span>
            </div>
          </div>
        </div>

        {/* Crypto Portfolio */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Crypto Portfolio</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                ${financeStats.cryptoValue.toFixed(2)}
              </p>
              <p className="text-sm text-text-muted mt-1">₹{(financeStats.cryptoValue * 83).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-accent-warning/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">₿</span>
            </div>
          </div>
        </div>

        {/* Financial Runway */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Financial Runway</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                {financeStats.runway.toFixed(1)}
              </p>
              <p className={`text-sm mt-1 ${
                financeStats.runway >= 3 ? 'text-accent-success' :
                financeStats.runway >= 2 ? 'text-accent-warning' : 'text-accent-error'
              }`}>
                months left
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
          </div>
        </div>

        {/* Budget Health */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Budget Health</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                {financeStats.budgetHealth.score}/100
              </p>
              <p className={`text-sm mt-1 capitalize ${
                financeStats.budgetHealth.status === 'excellent' ? 'text-accent-success' :
                financeStats.budgetHealth.status === 'good' ? 'text-accent-primary' :
                financeStats.budgetHealth.status === 'warning' ? 'text-accent-warning' : 'text-accent-error'
              }`}>
                {financeStats.budgetHealth.status}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-success/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expense Categories */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={financeStats.topCategories}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
                label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
              >
                {financeStats.topCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                contentStyle={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #262626',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Monthly Spending Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={financeStats.expensesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="month" stroke="#737373" />
              <YAxis stroke="#737373" tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Expenses']}
                contentStyle={{ 
                  backgroundColor: '#111111', 
                  border: '1px solid #262626',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Crypto Holdings */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Crypto Portfolio</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-text-secondary">Asset</th>
                <th className="text-left py-3 px-4 font-medium text-text-secondary">Chain</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">Quantity</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">Value</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">24h Change</th>
              </tr>
            </thead>
            <tbody>
              {financeStats.cryptoHoldings.map((holding, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-accent-primary/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-accent-primary">
                          {holding.symbol.substring(0, 2)}
                        </span>
                      </div>