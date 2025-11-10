// src/components/tokens/TokenBalance.tsx - Token Balance UI Component
// Shows user's token balance, usage statistics, and transaction history

import React, { useState, useEffect } from 'react';
// TokenBalance now uses API endpoints instead of direct auth service calls
import { tokenUsageTracker } from '../../lib/tokens/usage-tracker';

interface TokenBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  last_transaction_at?: string;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  balance_after: number;
}

interface TokenBalanceProps {
  userId: string;
  showDetailedStats?: boolean;
  compact?: boolean;
  onTopUpClick?: () => void;
}

interface UsageStats {
  totalSessions: number;
  totalMessages: number;
  totalTokensSpent: number;
  totalActionsExecuted: number;
  averageCostPerSession: number;
  dailyUsage: Array<{ date: string; sessions: number; cost: number }>;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({
  userId,
  showDetailedStats = false,
  compact = false,
  onTopUpClick
}) => {
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'balance' | 'history' | 'stats'>('balance');

  useEffect(() => {
    loadTokenData();
    const interval = setInterval(loadTokenData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [userId]);

  const loadTokenData = async () => {
    try {
      setError(null);
      
      // Load balance and recent transactions via API calls
      const [balanceResponse, transactionResponse, statsData] = await Promise.all([
        fetch('/api/user/balance'),
        fetch(`/api/user/transactions?limit=20`),
        showDetailedStats ? tokenUsageTracker.getUserUsageStats(userId, 7) : null
      ]);
      
      const balanceData = balanceResponse.ok ? await balanceResponse.json() : null;
      const transactionData = transactionResponse.ok ? await transactionResponse.json() : [];

      setBalance(balanceData);
      setTransactions(transactionData);
      if (statsData) setUsageStats(statsData);
    } catch (error) {
      console.error('Error loading token data:', error);
      setError('Failed to load token information');
    } finally {
      setLoading(false);
    }
  };

  const formatTokenAmount = (tokens: number): string => {
    return tokens.toLocaleString();
  };

  const formatCurrency = (tokens: number): string => {
    const rupees = tokens / 10; // 10 tokens = ₹1
    return `₹${rupees.toFixed(2)}`;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance >= 1000) return 'text-green-400';
    if (balance >= 500) return 'text-yellow-400';
    if (balance >= 100) return 'text-orange-400';
    return 'text-red-400';
  };

  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'earn': return '💰';
      case 'spend': return '💸';
      case 'purchase': return '🛒';
      case 'bonus': return '🎁';
      case 'refund': return '↩️';
      default: return '💳';
    }
  };

  const formatTransactionTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`${compact ? 'p-3' : 'p-6'} bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded mb-2"></div>
          <div className="h-8 bg-gray-600 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-600 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${compact ? 'p-3' : 'p-6'} bg-red-900/20 border border-red-800 rounded-xl`}>
        <div className="text-red-200 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="font-medium">{error}</div>
          <button 
            onClick={loadTokenData}
            className="text-red-300 hover:text-red-100 text-sm underline mt-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-gray-300 text-sm">Token Balance</div>
            <div className={`text-2xl font-bold ${getBalanceColor(balance?.balance || 0)}`}>
              {formatTokenAmount(balance?.balance || 0)}
            </div>
            <div className="text-gray-400 text-xs">
              {formatCurrency(balance?.balance || 0)}
            </div>
          </div>
          <div className="text-right">
            <button
              onClick={onTopUpClick}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              Top Up
            </button>
          </div>
        </div>
        
        {balance && balance.balance < 100 && (
          <div className="mt-3 p-2 bg-orange-900/30 border border-orange-800 rounded-lg">
            <div className="text-orange-200 text-xs">
              ⚠️ Low balance. Consider topping up to continue using AI features.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">💎 Messy Tokens</h2>
            <p className="text-gray-400 text-sm">Your AI interaction credits</p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getBalanceColor(balance?.balance || 0)}`}>
              {formatTokenAmount(balance?.balance || 0)}
            </div>
            <div className="text-gray-300 text-sm">
              {formatCurrency(balance?.balance || 0)} available
            </div>
          </div>
        </div>

        {/* Balance warning */}
        {balance && balance.balance < 100 && (
          <div className="mt-4 p-3 bg-orange-900/30 border border-orange-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-orange-200 text-sm">
                ⚠️ Low balance. Top up to continue using AI features.
              </div>
              <button
                onClick={onTopUpClick}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium"
              >
                Top Up Now
              </button>
            </div>
          </div>
        )}

        {/* Quick stats */}
        {balance && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-green-400 font-semibold">{formatTokenAmount(balance.total_earned)}</div>
              <div className="text-gray-400 text-xs">Total Earned</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-red-400 font-semibold">{formatTokenAmount(balance.total_spent)}</div>
              <div className="text-gray-400 text-xs">Total Spent</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-blue-400 font-semibold">
                {balance.total_earned > 0 ? Math.round((balance.total_spent / balance.total_earned) * 100) : 0}%
              </div>
              <div className="text-gray-400 text-xs">Usage Rate</div>
            </div>
            <div className="text-center p-3 bg-gray-800/50 rounded-lg">
              <div className="text-purple-400 font-semibold">
                {balance.last_transaction_at ? formatTransactionTime(balance.last_transaction_at) : 'N/A'}
              </div>
              <div className="text-gray-400 text-xs">Last Activity</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(['balance', 'history', 'stats'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab === 'balance' && '💰 Balance'}
            {tab === 'history' && '📋 History'}
            {tab === 'stats' && '📊 Stats'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'balance' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">💎</div>
              <h3 className="text-xl font-semibold text-white mb-2">Current Balance</h3>
              <div className={`text-4xl font-bold ${getBalanceColor(balance?.balance || 0)} mb-2`}>
                {formatTokenAmount(balance?.balance || 0)} tokens
              </div>
              <div className="text-gray-300 mb-6">
                Equivalent to {formatCurrency(balance?.balance || 0)}
              </div>
              
              {onTopUpClick && (
                <button
                  onClick={onTopUpClick}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  🛒 Buy More Tokens
                </button>
              )}
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Token Usage Guide</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>💬 AI Message</span>
                  <span>10 tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>🤖 Autonomous Action</span>
                  <span>5 tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>📝 100 Response Tokens</span>
                  <span>1 token</span>
                </div>
                <div className="flex justify-between">
                  <span>⭐ Premium Features</span>
                  <span>2x cost</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Recent Transactions</h3>
              <button
                onClick={loadTokenData}
                className="text-cyan-400 hover:text-cyan-300 text-sm"
              >
                🔄 Refresh
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">📜</div>
                <div>No transactions yet</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getTransactionIcon(tx.type)}</span>
                      <div>
                        <div className="text-white font-medium text-sm">{tx.description}</div>
                        <div className="text-gray-400 text-xs">{formatTransactionTime(tx.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatTokenAmount(tx.amount)}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Balance: {formatTokenAmount(tx.balance_after)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && showDetailedStats && usageStats && (
          <div className="space-y-6">
            <h3 className="text-white font-semibold">7-Day Usage Statistics</h3>
            
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-cyan-400 text-2xl font-bold">{usageStats.totalSessions}</div>
                <div className="text-gray-400 text-sm">AI Sessions</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-green-400 text-2xl font-bold">{usageStats.totalMessages}</div>
                <div className="text-gray-400 text-sm">Messages</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-purple-400 text-2xl font-bold">{usageStats.totalActionsExecuted}</div>
                <div className="text-gray-400 text-sm">AI Actions</div>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4 text-center">
                <div className="text-red-400 text-2xl font-bold">{Math.round(usageStats.averageCostPerSession)}</div>
                <div className="text-gray-400 text-sm">Avg Cost/Session</div>
              </div>
            </div>

            {/* Daily usage chart */}
            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3">Daily Usage</h4>
              <div className="space-y-2">
                {usageStats.dailyUsage.map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex items-center space-x-4">
                      <span className="text-cyan-400 text-sm">{day.sessions} sessions</span>
                      <span className="text-red-400 text-sm">{day.cost} tokens</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenBalance;