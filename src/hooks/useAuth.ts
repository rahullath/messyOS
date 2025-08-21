// src/hooks/useAuth.ts - Unified auth hook for production
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  walletAddress?: string;
  hasEmbeddedWallet: boolean;
  linkedAccounts: any[];
  tokenBalance?: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
}

export function useAuth() {
  const { 
    ready, 
    authenticated, 
    user, 
    login, 
    logout, 
    getAccessToken,
    linkEmail,
    linkGoogle,
    createWallet 
  } = usePrivy();
  
  const { wallets } = useWallets();
  const [tokenBalance, setTokenBalance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Transform Privy user to our AuthUser format
  const authUser: AuthUser | null = user ? {
    id: user.id,
    email: user.linkedAccounts?.find(account => account.type === 'email')?.address,
    phone: user.linkedAccounts?.find(account => account.type === 'phone')?.address,
    walletAddress: wallets[0]?.address,
    hasEmbeddedWallet: wallets.some(wallet => wallet.walletClientType === 'privy'),
    linkedAccounts: user.linkedAccounts || [],
    tokenBalance
  } : null;

  // Load token balance when user is authenticated
  useEffect(() => {
    if (ready && authenticated && user) {
      loadTokenBalance();
      setIsLoading(false);
    } else if (ready) {
      setIsLoading(false);
    }
  }, [ready, authenticated, user]);

  const loadTokenBalance = async () => {
    if (!user) return;

    try {
      // First try from localStorage for quick loading
      const cached = localStorage.getItem('meshOS_tokenBalance');
      if (cached) {
        setTokenBalance(JSON.parse(cached));
      }

      // Then fetch fresh data
      const response = await fetch(`/api/tokens/balance?privy_user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.balance) {
        setTokenBalance(data.balance);
        localStorage.setItem('meshOS_tokenBalance', JSON.stringify(data.balance));
      }
    } catch (error) {
      console.error('Error loading token balance:', error);
    }
  };

  const refreshTokenBalance = async () => {
    await loadTokenBalance();
  };

  // Enhanced login that handles migration
  const loginWithMigration = async () => {
    try {
      await login();
      // Migration is handled automatically by ProductionPrivyAuth component
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Create wallet for user (optional)
  const createEmbeddedWallet = async () => {
    try {
      await createWallet();
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  };

  // Link additional authentication methods
  const linkAdditionalAuth = async (method: 'email' | 'google') => {
    try {
      if (method === 'email') {
        await linkEmail();
      } else if (method === 'google') {
        await linkGoogle();
      }
    } catch (error) {
      console.error(`Error linking ${method}:`, error);
      throw error;
    }
  };

  return {
    // Auth state
    isReady: ready,
    isAuthenticated: authenticated,
    isLoading,
    user: authUser,
    
    // Auth actions
    login: loginWithMigration,
    logout,
    getAccessToken,
    
    // Additional features
    createWallet: createEmbeddedWallet,
    linkEmail: () => linkAdditionalAuth('email'),
    linkGoogle: () => linkAdditionalAuth('google'),
    
    // Token management
    tokenBalance,
    refreshTokenBalance,
    
    // Wallet info
    wallets,
    hasWallet: wallets.length > 0,
    embeddedWallet: wallets.find(wallet => wallet.walletClientType === 'privy'),
    
    // Migration status (could be expanded)
    isMigrated: !!user?.linkedAccounts?.length
  };
}

export default useAuth;