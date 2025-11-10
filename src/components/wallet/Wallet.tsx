// src/components/wallet/Wallet.tsx - Main Wallet Component
import React, { useState } from 'react';
import { useTokenWallet } from '../../lib/tokens/hooks';
import { WalletBalance } from './WalletBalance';
import { TransactionHistory } from './TransactionHistory';
import { TrialStatus } from './TrialStatus';
import { TokenCosts } from './TokenCosts';
import { LoadingSpinner } from '../auth/LoadingSpinner';

interface WalletProps {
  className?: string;
  showTransactions?: boolean;
  showTrialStatus?: boolean;
  showTokenCosts?: boolean;
}

export function Wallet({ 
  className = '', 
  showTransactions = true,
  showTrialStatus = true,
  showTokenCosts = false
}: WalletProps) {
  const wallet = useTokenWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'costs'>('overview');

  if (wallet.isLoading) {
    return (
      <div className={`wallet-container ${className}`}>
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
          <span className="ml-3 text-gray-400">Loading wallet...</span>
        </div>
      </div>
    );
  }

  if (wallet.error) {
    return (
      <div className={`wallet-container ${className}`}>
        <div className="p-6 text-center">
          <div className="text-red-400 mb-2">⚠️ Wallet Error</div>
          <p className="text-gray-400 text-sm">{wallet.error}</p>
          <button 
            onClick={wallet.refreshBalance}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-container ${className}`}>
      {/* Wallet Header */}
      <div className="wallet-header">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">₹</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">MessyOS Wallet</h2>
              <p className="text-gray-400 text-sm">Off-chain token balance</p>
            </div>
          </div>
          <button 
            onClick={wallet.refreshBalance}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh balance"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Balance Display */}
        <WalletBalance 
          balance={wallet.balance}
          formatAmount={wallet.formatAmount}
          toINR={wallet.toINR}
        />

        {/* Trial Status */}
        {showTrialStatus && wallet.trialStatus && (
          <TrialStatus trialStatus={wallet.trialStatus} />
        )}
      </div>

      {/* Navigation Tabs */}
      {(showTransactions || showTokenCosts) && (
        <div className="wallet-tabs">
          <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Overview
            </button>
            {showTransactions && (
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'transactions'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                History
              </button>
            )}
            {showTokenCosts && (
              <button
                onClick={() => setActiveTab('costs')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'costs'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Costs
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="wallet-content">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Earned</div>
                <div className="text-green-400 font-bold text-lg">
                  {wallet.formatAmount(wallet.transactions.reduce((sum, tx) => 
                    tx.transaction_type === 'earn' || tx.transaction_type === 'bonus' ? sum + tx.amount : sum, 0
                  ))}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Total Spent</div>
                <div className="text-red-400 font-bold text-lg">
                  {wallet.formatAmount(Math.abs(wallet.transactions.reduce((sum, tx) => 
                    tx.transaction_type === 'spend' ? sum + tx.amount : sum, 0
                  )))}
                </div>
              </div>
            </div>

            {/* Recent Transactions Preview */}
            {wallet.transactions.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {wallet.transactions.slice(0, 3).map((transaction) => (
                    <div key={transaction.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.amount > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.amount > 0 ? '+' : '-'}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{transaction.description}</div>
                          <div className="text-gray-400 text-xs">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {transaction.amount > 0 ? '+' : ''}{wallet.formatAmount(Math.abs(transaction.amount))}
                      </div>
                    </div>
                  ))}
                </div>
                {showTransactions && wallet.transactions.length > 3 && (
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="w-full mt-3 py-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                  >
                    View all transactions →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && showTransactions && (
          <TransactionHistory 
            transactions={wallet.transactions}
            formatAmount={wallet.formatAmount}
            onRefresh={wallet.refreshBalance}
          />
        )}

        {activeTab === 'costs' && showTokenCosts && (
          <TokenCosts />
        )}
      </div>
    </div>
  );
}

// CSS-in-JS styles for Web3 aesthetic
const walletStyles = `
  .wallet-container {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #2d3748;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .wallet-header {
    border-bottom: 1px solid #2d3748;
    padding-bottom: 24px;
    margin-bottom: 24px;
  }

  @media (max-width: 640px) {
    .wallet-container {
      padding: 16px;
      border-radius: 12px;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = walletStyles;
  document.head.appendChild(styleSheet);
}