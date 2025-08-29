// src/components/wallet/SimulatedWallet.tsx - Simulated Web3 Wallet Experience
import { useState, useEffect } from 'react';
import { authService } from '../../lib/auth/supabase-auth';

interface WalletProps {
  userId: string;
  walletAddress?: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
  balance_after: number;
  metadata?: any;
}

export function SimulatedWallet({ userId, walletAddress }: WalletProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<{ balance: number; total_earned: number; total_spent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);
  const [simulateTransactionLoading, setSimulateTransactionLoading] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, [userId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [balanceData, transactionData] = await Promise.all([
        authService.getUserTokenBalance(userId),
        loadTransactionHistory()
      ]);

      setBalance(balanceData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionHistory = async (): Promise<Transaction[]> => {
    try {
      const { data, error } = await authService['supabase']
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error loading transaction history:', error);
      return [];
    }
  };

  const simulateTransaction = async (type: 'earn' | 'spend') => {
    setSimulateTransactionLoading(true);
    try {
      const amounts = {
        earn: [100, 250, 500, 750, 1000], // ₹10-100
        spend: [50, 150, 300, 200, 400]   // ₹5-40
      };
      
      const descriptions = {
        earn: [
          'AI Task Completion Bonus',
          'Daily Login Reward', 
          'Integration Connection Reward',
          'Referral Bonus',
          'Achievement Unlock'
        ],
        spend: [
          'AI Query Processing',
          'Data Analysis Request',
          'Document Generation',
          'Integration Sync',
          'Premium Feature Usage'
        ]
      };

      const randomAmount = amounts[type][Math.floor(Math.random() * amounts[type].length)];
      const randomDescription = descriptions[type][Math.floor(Math.random() * descriptions[type].length)];

      let success;
      if (type === 'earn') {
        success = await authService.addTokens(userId, randomAmount, randomDescription, {
          simulated: true,
          transaction_source: 'wallet_simulation'
        });
      } else {
        success = await authService.deductTokens(userId, randomAmount, randomDescription, {
          simulated: true,
          transaction_source: 'wallet_simulation'
        });
      }

      if (success) {
        await loadWalletData(); // Refresh data
      } else {
        alert(type === 'spend' ? 'Insufficient balance!' : 'Failed to add tokens');
      }
    } catch (error) {
      console.error('Error simulating transaction:', error);
    } finally {
      setSimulateTransactionLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${(Math.abs(amount) / 10).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'bonus':
      case 'credit':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'deduction':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Wallet Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">meshOS Wallet</h3>
            <p className="text-sm opacity-90">Simulated Web3 Experience</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {balance ? formatAmount(balance.balance) : '₹0.00'}
            </div>
            <div className="text-sm opacity-90">Available Balance</div>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <div className="text-sm opacity-90 mb-1">Wallet Address</div>
          <div className="font-mono text-sm break-all">
            {walletAddress || 'No wallet address'}
          </div>
        </div>
      </div>

      {/* Wallet Actions */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => simulateTransaction('earn')}
            disabled={simulateTransactionLoading}
            className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Simulate Earn
          </button>
          
          <button
            onClick={() => simulateTransaction('spend')}
            disabled={simulateTransactionLoading || !balance || balance.balance <= 0}
            className="flex items-center justify-center px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Simulate Spend
          </button>
        </div>
        
        <p className="text-sm text-gray-500 mt-3 text-center">
          These buttons simulate earning and spending tokens to test the wallet experience
        </p>
      </div>

      {/* Wallet Stats */}
      {balance && (
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatAmount(balance.balance)}</div>
              <div className="text-sm text-gray-500">Current Balance</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatAmount(balance.total_earned)}</div>
              <div className="text-sm text-gray-500">Total Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{formatAmount(balance.total_spent)}</div>
              <div className="text-sm text-gray-500">Total Spent</div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Toggle */}
      <div className="p-4">
        <button
          onClick={() => setShowTransactions(!showTransactions)}
          className="w-full flex items-center justify-between px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg"
        >
          <span className="font-medium">Transaction History</span>
          <svg 
            className={`w-5 h-5 transform transition-transform ${showTransactions ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Transaction List */}
      {showTransactions && (
        <div className="border-t max-h-96 overflow-y-auto">
          {transactions.length > 0 ? (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTransactionIcon(tx.transaction_type)}
                      <div>
                        <div className="font-medium text-gray-900">{tx.description}</div>
                        <div className="text-sm text-gray-500">{formatDate(tx.created_at)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Balance: {formatAmount(tx.balance_after)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No transactions yet</p>
              <p className="text-sm">Use the simulate buttons to create some transactions</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}