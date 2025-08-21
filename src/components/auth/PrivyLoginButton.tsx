// src/components/auth/PrivyLoginButton.tsx - Privy Authentication Button
// Login/logout component using Privy authentication

import React, { useState } from 'react';
import { usePrivy, useWallets, useTokenBalance } from './PrivyProvider';

interface PrivyLoginButtonProps {
  className?: string;
  showBalance?: boolean;
  compact?: boolean;
}

const PrivyLoginButton: React.FC<PrivyLoginButtonProps> = ({ 
  className = '', 
  showBalance = false,
  compact = false 
}) => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { tokenBalance } = useTokenBalance();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
        {!compact && <span className="ml-2 text-gray-400">Loading...</span>}
      </div>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`
          flex items-center justify-center space-x-2 px-4 py-2 
          bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700
          text-white font-semibold rounded-lg transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <>
            <span className="text-lg">🔐</span>
            {!compact && <span>Login with Privy</span>}
          </>
        )}
      </button>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-white text-sm font-medium">
            {user?.email?.split('@')[0] || 'User'}
          </span>
        </div>
        {showBalance && tokenBalance && (
          <div className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs font-medium">
            {Math.round(tokenBalance.balance / 10)} ₹
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* User Info */}
      <div className="flex items-center space-x-3 bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div className="text-white">
            <div className="font-semibold text-sm">
              {user?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-gray-400 text-xs">
              {user?.email || 'Connected'}
            </div>
          </div>
        </div>

        {/* Wallet Info */}
        {wallets.length > 0 && (
          <div className="border-l border-white/10 pl-3">
            <div className="text-xs text-gray-400">Wallet</div>
            <div className="font-mono text-xs text-cyan-400">
              {wallets[0].address.slice(0, 6)}...{wallets[0].address.slice(-4)}
            </div>
          </div>
        )}

        {/* Token Balance */}
        {showBalance && tokenBalance && (
          <div className="border-l border-white/10 pl-3">
            <div className="text-xs text-gray-400">Balance</div>
            <div className="font-semibold text-sm text-green-400">
              {tokenBalance.balance.toLocaleString()} tokens
            </div>
            <div className="text-xs text-gray-400">
              ₹{Math.round(tokenBalance.balance / 10)}
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="
          flex items-center justify-center p-3
          bg-red-600/20 hover:bg-red-600/30 
          border border-red-600/30 hover:border-red-600/50
          text-red-400 hover:text-red-300
          rounded-xl transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="Logout"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
        ) : (
          <span className="text-lg">🚪</span>
        )}
      </button>
    </div>
  );
};

export default PrivyLoginButton;