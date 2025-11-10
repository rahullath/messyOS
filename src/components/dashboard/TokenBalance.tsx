import React, { useState, useEffect } from 'react';

interface TokenData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isNewUser?: boolean;
  isExpired?: boolean;
  daysRemaining?: number;
  createdAt?: string;
  expiresAt?: string;
}

export default function TokenBalance() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenBalance = async () => {
      try {
        const response = await fetch('/api/user/balance');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch balance');
        }
        
        setTokenData(data.tokens);
      } catch (err) {
        console.error('Error fetching token balance:', err);
        setError(err instanceof Error ? err.message : 'Failed to load balance');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenBalance();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
        <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
        <span className="text-sm text-cyan-300">Loading balance...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-3 px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-red-300">Balance unavailable</span>
      </div>
    );
  }

  if (!tokenData) {
    return null;
  }

  // Convert tokens to INR (10 tokens = ₹1)
  const balanceInINR = (tokenData.balance / 10).toFixed(2);
  const isNewUser = tokenData.isNewUser || (tokenData.balance === 5000 && tokenData.totalSpent === 0);
  const isExpired = tokenData.isExpired || false;
  const daysRemaining = tokenData.daysRemaining !== undefined ? tokenData.daysRemaining : 30;

  return (
    <div className="relative">
      {/* Token Balance Display */}
      <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
        {/* Token Icon */}
        <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
          </svg>
        </div>

        {/* Balance Info */}
        <div className="flex flex-col">
          <div className="flex items-center space-x-2">
            <span className={`text-lg font-bold bg-gradient-to-r ${isExpired ? 'from-red-400 to-orange-400' : 'from-green-400 to-cyan-400'} bg-clip-text text-transparent`}>
              {tokenData.balance.toLocaleString()} tokens
            </span>
            {isExpired && (
              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                Expired
              </span>
            )}
            {isNewUser && !isExpired && (
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                {daysRemaining}d left
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            ≈ ₹{balanceInINR} • {isExpired ? 'Trial expired' : tokenData.totalSpent > 0 ? `Spent ${tokenData.totalSpent}` : `${daysRemaining} days remaining`}
          </span>
        </div>

        {/* Dropdown Arrow */}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Welcome Badge for New Users */}
      {isNewUser && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">!</span>
        </div>
      )}
    </div>
  );
}