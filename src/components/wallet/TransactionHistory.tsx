// src/components/wallet/TransactionHistory.tsx - Transaction History Component
import React, { useState } from 'react';
import type { TokenTransaction } from '../../lib/tokens/types';

interface TransactionHistoryProps {
  transactions: TokenTransaction[];
  formatAmount: (amount: number) => string;
  onRefresh?: () => void;
  showPagination?: boolean;
  itemsPerPage?: number;
}

export function TransactionHistory({ 
  transactions, 
  formatAmount, 
  onRefresh,
  showPagination = true,
  itemsPerPage = 10
}: TransactionHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'earn' | 'spend' | 'bonus'>('all');

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'earn') return tx.transaction_type === 'earn' || tx.transaction_type === 'bonus';
    if (filter === 'spend') return tx.transaction_type === 'spend';
    return tx.transaction_type === filter;
  });

  // Paginate transactions
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = showPagination 
    ? filteredTransactions.slice(startIndex, startIndex + itemsPerPage)
    : filteredTransactions;

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      switch (type) {
        case 'bonus':
          return '🎁';
        case 'earn':
          return '💰';
        case 'purchase':
          return '💳';
        case 'refund':
          return '↩️';
        default:
          return '📈';
      }
    } else {
      return '📉';
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-400' : 'text-red-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="transaction-history-empty">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💸</div>
          <h3 className="text-white font-semibold mb-2">No transactions yet</h3>
          <p className="text-gray-400 text-sm mb-6">
            Your token transactions will appear here once you start using AI features.
          </p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-semibold">Transaction History</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh transactions"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter buttons */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {[
          { key: 'all', label: 'All', count: transactions.length },
          { key: 'earn', label: 'Earned', count: transactions.filter(tx => tx.amount > 0).length },
          { key: 'spend', label: 'Spent', count: transactions.filter(tx => tx.amount < 0).length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => {
              setFilter(key as any);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="space-y-3">
        {paginatedTransactions.map((transaction) => (
          <div key={transaction.id} className="transaction-item">
            <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.amount > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  <span className="text-lg">
                    {getTransactionIcon(transaction.transaction_type, transaction.amount)}
                  </span>
                </div>
              </div>

              {/* Transaction details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium truncate">
                    {transaction.description}
                  </h4>
                  <div className={`font-bold ${getTransactionColor(transaction.amount)}`}>
                    {transaction.amount > 0 ? '+' : ''}{formatAmount(Math.abs(transaction.amount))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span className="capitalize">{transaction.transaction_type}</span>
                    {transaction.related_entity_type && (
                      <>
                        <span>•</span>
                        <span>{transaction.related_entity_type.replace('_', ' ')}</span>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(transaction.created_at)}
                  </span>
                </div>

                {/* Balance change indicator */}
                <div className="mt-2 text-xs text-gray-500">
                  Balance: {formatAmount(transaction.balance_before)} → {formatAmount(transaction.balance_after)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      currentPage === page
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// CSS for transaction history
const transactionStyles = `
  .transaction-item {
    transition: all 0.2s ease;
  }

  .transaction-item:hover {
    transform: translateX(2px);
  }

  .transaction-history-empty {
    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
    border: 1px solid #4a5568;
    border-radius: 12px;
  }

  @media (max-width: 640px) {
    .transaction-item .flex {
      flex-direction: column;
      align-items: flex-start;
      space-x: 0;
      space-y: 0.75rem;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = transactionStyles;
  document.head.appendChild(styleSheet);
}