// src/components/wallet/WalletBalance.tsx - Balance Display Component
import React from 'react';

interface WalletBalanceProps {
  balance: number;
  formatAmount: (amount: number) => string;
  toINR: (tokens: number) => string;
  showINRValue?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function WalletBalance({ 
  balance, 
  formatAmount, 
  toINR, 
  showINRValue = true,
  size = 'large'
}: WalletBalanceProps) {
  const sizeClasses = {
    small: {
      container: 'p-4',
      balance: 'text-2xl',
      label: 'text-sm',
      inr: 'text-sm'
    },
    medium: {
      container: 'p-6',
      balance: 'text-3xl',
      label: 'text-base',
      inr: 'text-base'
    },
    large: {
      container: 'p-8',
      balance: 'text-4xl md:text-5xl',
      label: 'text-lg',
      inr: 'text-lg'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`wallet-balance-card ${classes.container}`}>
      {/* Balance Display */}
      <div className="text-center">
        <div className="mb-2">
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">
            Token Balance
          </span>
        </div>
        
        <div className={`font-bold text-white mb-2 ${classes.balance}`}>
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            {formatAmount(balance)}
          </span>
          <span className="text-gray-400 ml-2 text-lg">TOKENS</span>
        </div>

        {showINRValue && (
          <div className={`text-gray-400 ${classes.inr}`}>
            ≈ {toINR(balance)} value
          </div>
        )}

        {/* Balance Status Indicator */}
        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            balance > 1000 ? 'bg-green-400' : 
            balance > 100 ? 'bg-yellow-400' : 
            'bg-red-400'
          }`} />
          <span className={`text-xs font-medium ${
            balance > 1000 ? 'text-green-400' : 
            balance > 100 ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {balance > 1000 ? 'Healthy Balance' : 
             balance > 100 ? 'Low Balance' : 
             'Critical Balance'}
          </span>
        </div>
      </div>

      {/* Balance Actions */}
      <div className="mt-6 flex space-x-3">
        <button className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Buy Tokens</span>
          </div>
        </button>
        
        <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Earn More</span>
          </div>
        </button>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactWalletBalance({ balance, formatAmount }: Pick<WalletBalanceProps, 'balance' | 'formatAmount'>) {
  return (
    <div className="compact-wallet-balance">
      <div className="flex items-center space-x-3 bg-gray-800 rounded-lg p-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">₹</span>
        </div>
        <div>
          <div className="text-white font-bold text-lg">
            {formatAmount(balance)}
          </div>
          <div className="text-gray-400 text-xs">tokens</div>
        </div>
        <div className={`w-2 h-2 rounded-full ml-auto ${
          balance > 1000 ? 'bg-green-400' : 
          balance > 100 ? 'bg-yellow-400' : 
          'bg-red-400'
        }`} />
      </div>
    </div>
  );
}

// CSS for the balance card
const balanceStyles = `
  .wallet-balance-card {
    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
    border: 1px solid #4a5568;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
  }

  .wallet-balance-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
  }

  .compact-wallet-balance {
    transition: all 0.2s ease;
  }

  .compact-wallet-balance:hover {
    transform: translateY(-1px);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = balanceStyles;
  document.head.appendChild(styleSheet);
}