// src/lib/tokens/hooks.ts - Token Management Hooks
import { useState, useEffect, useCallback } from 'react';
import { tokenService } from './service';
import { useAuth } from '../auth/context';
import type { 
  TokenBalance, 
  TokenTransaction, 
  TrialStatus, 
  WalletState,
  TokenDeductionResult 
} from './types';

/**
 * Hook for managing user's token wallet state
 */
export function useTokenWallet() {
  const { user } = useAuth();
  const [state, setState] = useState<WalletState>({
    balance: 0,
    isLoading: true,
    error: null,
    transactions: [],
    trialStatus: null
  });

  const refreshBalance = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false, error: 'User not authenticated' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [balance, transactions, trialStatus] = await Promise.all([
        tokenService.getTokenBalance(user.id),
        tokenService.getTransactionHistory(user.id, 20),
        tokenService.getTrialStatus(user.id)
      ]);

      if (!balance) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'Failed to load token balance' 
        }));
        return;
      }

      setState({
        balance: balance.balance,
        isLoading: false,
        error: null,
        transactions,
        trialStatus
      });
    } catch (error) {
      console.error('Error refreshing token wallet:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load wallet data' 
      }));
    }
  }, [user]);

  const deductTokens = useCallback(async (
    amount: number,
    description: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<TokenDeductionResult> => {
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        current_balance: 0
      };
    }

    const result = await tokenService.deductTokens(
      user.id,
      amount,
      description,
      entityType,
      entityId,
      metadata
    );

    if (result.success) {
      // Update local state immediately for better UX
      setState(prev => ({
        ...prev,
        balance: result.new_balance || prev.balance
      }));
      
      // Refresh full state in background
      setTimeout(refreshBalance, 100);
    }

    return result;
  }, [user, refreshBalance]);

  const addTokens = useCallback(async (
    amount: number,
    description: string,
    transactionType: 'earn' | 'bonus' | 'purchase' | 'refund' = 'earn',
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<TokenDeductionResult> => {
    if (!user) {
      return {
        success: false,
        error: 'User not authenticated',
        current_balance: 0
      };
    }

    const result = await tokenService.addTokens(
      user.id,
      amount,
      description,
      transactionType,
      entityType,
      entityId,
      metadata
    );

    if (result.success) {
      // Update local state immediately
      setState(prev => ({
        ...prev,
        balance: result.new_balance || prev.balance
      }));
      
      // Refresh full state in background
      setTimeout(refreshBalance, 100);
    }

    return result;
  }, [user, refreshBalance]);

  // Load initial data
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Set up real-time updates (optional - can be enhanced with websockets)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(refreshBalance, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user, refreshBalance]);

  return {
    ...state,
    refreshBalance,
    deductTokens,
    addTokens,
    formatAmount: tokenService.formatTokenAmount,
    toINR: tokenService.tokensToINR
  };
}

/**
 * Hook for getting token balance only (lighter weight)
 */
export function useTokenBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setError('User not authenticated');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const tokenBalance = await tokenService.getTokenBalance(user.id);
      
      if (!tokenBalance) {
        setError('Failed to load token balance');
        return;
      }

      setBalance(tokenBalance);
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError('Failed to load token balance');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    balance: balance?.balance || 0,
    totalEarned: balance?.total_earned || 0,
    totalSpent: balance?.total_spent || 0,
    isLoading,
    error,
    refreshBalance,
    formatAmount: tokenService.formatTokenAmount,
    toINR: tokenService.tokensToINR
  };
}

/**
 * Hook for trial status
 */
export function useTrialStatus() {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchTrialStatus = async () => {
      try {
        const status = await tokenService.getTrialStatus(user.id);
        setTrialStatus(status);
      } catch (error) {
        console.error('Error fetching trial status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrialStatus();
  }, [user]);

  return {
    trialStatus,
    isLoading,
    isTrialActive: trialStatus?.isActive || false,
    daysRemaining: trialStatus?.daysRemaining || 0,
    tokensRemaining: trialStatus?.tokensRemaining || 0
  };
}