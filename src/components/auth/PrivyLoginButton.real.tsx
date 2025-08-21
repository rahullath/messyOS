// src/components/auth/PrivyLoginButton.real.tsx - Real Privy Login Button
// Uses actual Privy authentication with your API keys

import React from 'react';
import { usePrivyAuth } from './RealPrivyProvider';

interface RealPrivyLoginButtonProps {
  className?: string;
  showBalance?: boolean;
  compact?: boolean;
}

const RealPrivyLoginButton: React.FC<RealPrivyLoginButtonProps> = ({ 
  className = '', 
  showBalance = false,
  compact = false 
}) => {
  const { 
    ready, 
    authenticated, 
    user, 
    login, 
    logout, 
    tokenBalance, 
    embeddedWallet 
  } = usePrivyAuth();

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
        onClick={login}
        className={`
          flex items-center justify-center space-x-2 px-4 py-2 
          bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700
          text-white font-semibold rounded-lg transition-all duration-200
          ${className}
        `}
      >
        <span className="text-lg">🔐</span>
        {!compact && <span>Login with Privy</span>}
      </button>
    );
  }

  // Get user info
  const email = user?.linkedAccounts?.find(account => account.type === 'email')?.address;
  const displayName = email?.split('@')[0] || 'User';

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-white text-sm font-medium">
            {displayName}
          </span>
        </div>
        {showBalance && tokenBalance && (
          <div className="bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded text-xs font-medium">
            {Math.round(tokenBalance.balance / 10)} ₹
          </div>
        )}
        {embeddedWallet && (
          <div className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs font-medium">
            👛 {embeddedWallet.address.slice(0, 6)}...
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
              {displayName}
            </div>
            <div className="text-gray-400 text-xs">
              {email || 'Connected via Privy'}
            </div>
          </div>
        </div>

        {/* Wallet Info */}
        {embeddedWallet && (
          <div className="border-l border-white/10 pl-3">
            <div className="text-xs text-gray-400">Wallet</div>
            <div className="font-mono text-xs text-cyan-400">
              {embeddedWallet.address.slice(0, 6)}...{embeddedWallet.address.slice(-4)}
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
        onClick={logout}
        className="
          flex items-center justify-center p-3
          bg-red-600/20 hover:bg-red-600/30 
          border border-red-600/30 hover:border-red-600/50
          text-red-400 hover:text-red-300
          rounded-xl transition-all duration-200
        "
        title="Logout"
      >
        <span className="text-lg">🚪</span>
      </button>
    </div>
  );
};

export default RealPrivyLoginButton;