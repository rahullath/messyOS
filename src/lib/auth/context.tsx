// src/lib/auth/context.tsx - Authentication context provider for React components
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from './service';
import { authClient } from './config';
import type { 
  AuthContextType, 
  AuthState, 
  User, 
  TokenBalance, 
  TrialStatus,
  OAuthProvider,
  UserProfile
} from './types';

// Create authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial auth state
const initialAuthState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  tokenBalance: null,
  trialStatus: null,
  error: null
};

// Authentication provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  // Refresh user data including token balance and trial status
  const refreshUserData = useCallback(async () => {
    try {
      const user = await authService.getCurrentUser();
      
      if (!user) {
        setAuthState(prev => ({
          ...prev,
          user: null,
          session: null,
          isAuthenticated: false,
          tokenBalance: null,
          trialStatus: null,
          isLoading: false,
          error: null
        }));
        return;
      }

      // Get token balance and trial status
      const [tokenBalance, trialStatus] = await Promise.all([
        authService.getTokenBalance(user.id),
        authService.getTrialStatus(user.id)
      ]);

      setAuthState(prev => ({
        ...prev,
        user,
        session: user.session,
        isAuthenticated: true,
        tokenBalance,
        trialStatus,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load user data'
      }));
    }
  }, []);

  // Refresh token balance only
  const refreshTokenBalance = useCallback(async () => {
    if (!authState.user) return;

    try {
      const [tokenBalance, trialStatus] = await Promise.all([
        authService.getTokenBalance(authState.user.id),
        authService.getTrialStatus(authState.user.id)
      ]);

      setAuthState(prev => ({
        ...prev,
        tokenBalance,
        trialStatus,
        error: null
      }));
    } catch (error) {
      console.error('Error refreshing token balance:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh token balance'
      }));
    }
  }, [authState.user]);

  // Sign in with email and password
  const signInWithEmail = useCallback(async (email: string, password: string): Promise<User | null> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const user = await authService.signInWithEmail(email, password);
      
      if (user) {
        await refreshUserData();
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Invalid email or password'
        }));
      }
      
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      }));
      return null;
    }
  }, [refreshUserData]);

  // Sign up with email and password
  const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string): Promise<User | null> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const user = await authService.signUpWithEmail({
        email,
        password,
        fullName
      });
      
      if (user) {
        await refreshUserData();
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Sign up failed. Please check your email for verification.'
        }));
      }
      
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign up failed'
      }));
      return null;
    }
  }, [refreshUserData]);

  // Sign in with OAuth provider
  const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<{ url: string } | null> => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      
      const result = await authService.signInWithOAuth(provider);
      
      if (!result) {
        setAuthState(prev => ({
          ...prev,
          error: `Failed to sign in with ${provider}`
        }));
      }
      
      return result;
    } catch (error) {
      console.error('OAuth sign in error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : `${provider} sign in failed`
      }));
      return null;
    }
  }, []);

  // Sign out
  const signOut = useCallback(async (): Promise<boolean> => {
    try {
      const success = await authService.signOut();
      
      if (success) {
        setAuthState(initialAuthState);
      } else {
        setAuthState(prev => ({
          ...prev,
          error: 'Sign out failed'
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sign out failed'
      }));
      return false;
    }
  }, []);

  // Deduct tokens
  const deductTokens = useCallback(async (amount: number, description: string, metadata?: any): Promise<boolean> => {
    if (!authState.user) return false;

    try {
      const success = await authService.deductTokens(authState.user.id, amount, description, metadata);
      
      if (success) {
        // Refresh token balance after successful deduction
        await refreshTokenBalance();
      } else {
        setAuthState(prev => ({
          ...prev,
          error: 'Insufficient tokens or deduction failed'
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Token deduction error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Token deduction failed'
      }));
      return false;
    }
  }, [authState.user, refreshTokenBalance]);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!authState.user) return false;

    try {
      const success = await authService.updateProfile(authState.user.id, updates);
      
      if (success) {
        // Refresh user data to get updated profile
        await refreshUserData();
      } else {
        setAuthState(prev => ({
          ...prev,
          error: 'Profile update failed'
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Profile update error:', error);
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Profile update failed'
      }));
      return false;
    }
  }, [authState.user, refreshUserData]);

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    // Initial session check
    const initializeAuth = async () => {
      try {
        await refreshUserData();
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Failed to initialize authentication'
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authClient.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log(`🔄 Auth context received event: ${event}`);

      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            await refreshUserData();
          }
          break;
          
        case 'SIGNED_OUT':
          setAuthState(initialAuthState);
          break;
          
        case 'TOKEN_REFRESHED':
          if (session && authState.user) {
            // Update session in state
            setAuthState(prev => ({
              ...prev,
              session,
              user: prev.user ? { ...prev.user, session } : null
            }));
          }
          break;
          
        case 'USER_UPDATED':
          if (session) {
            await refreshUserData();
          }
          break;
      }
    });

    // Listen for custom auth events
    const handleCustomAuthEvents = (event: CustomEvent) => {
      if (!mounted) return;
      
      switch (event.type) {
        case 'auth:signed-in':
          refreshUserData();
          break;
        case 'auth:signed-out':
          setAuthState(initialAuthState);
          break;
        case 'auth:token-refreshed':
          if (event.detail?.session && authState.user) {
            setAuthState(prev => ({
              ...prev,
              session: event.detail.session,
              user: prev.user ? { ...prev.user, session: event.detail.session } : null
            }));
          }
          break;
      }
    };

    // Add event listeners for custom auth events
    if (typeof window !== 'undefined') {
      window.addEventListener('auth:signed-in', handleCustomAuthEvents as EventListener);
      window.addEventListener('auth:signed-out', handleCustomAuthEvents as EventListener);
      window.addEventListener('auth:token-refreshed', handleCustomAuthEvents as EventListener);
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
      
      // Remove event listeners
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:signed-in', handleCustomAuthEvents as EventListener);
        window.removeEventListener('auth:signed-out', handleCustomAuthEvents as EventListener);
        window.removeEventListener('auth:token-refreshed', handleCustomAuthEvents as EventListener);
      }
    };
  }, [refreshUserData, authState.user]);

  // Context value
  const contextValue: AuthContextType = {
    ...authState,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signOut,
    refreshTokenBalance,
    deductTokens,
    refreshUserData,
    updateProfile
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Hook to require authentication
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  
  if (!auth.isAuthenticated || !auth.user) {
    throw new Error('Authentication required');
  }
  
  return auth;
}

// Hook for token operations
export function useTokens() {
  const auth = useAuth();
  
  return {
    balance: auth.tokenBalance?.balance || 0,
    totalEarned: auth.tokenBalance?.total_earned || 0,
    totalSpent: auth.tokenBalance?.total_spent || 0,
    trialStatus: auth.trialStatus,
    deductTokens: auth.deductTokens,
    refreshBalance: auth.refreshTokenBalance
  };
}

// Export context for advanced usage
export { AuthContext };