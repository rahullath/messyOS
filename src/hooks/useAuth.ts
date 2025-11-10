// src/hooks/useAuth.ts - Supabase auth hook
import { useState, useEffect } from 'react';
import { createServerAuth } from '../lib/auth/simple-multi-user';
import { supabase } from '../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    simulated_wallet_address?: string;
    wallet_created_at?: string;
  };
  tokenBalance?: {
    balance: number;
    total_earned: number;
    total_spent: number;
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [tokenBalance, setTokenBalance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state
  useEffect(() => {
    checkAuthState();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setTokenBalance(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        await loadTokenBalance(session.user.id);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        await loadTokenBalance(session.user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadTokenBalance = async (userId: string) => {
    try {
      // First try from localStorage for quick loading
      const cached = localStorage.getItem('meshOS_tokenBalance');
      if (cached) {
        setTokenBalance(JSON.parse(cached));
      }

      // Create a client-side auth instance to get token balance
      const response = await fetch('/api/user/balance');
      if (response.ok) {
        const data = await response.json();
        if (data.success !== false) {
          const balance = {
            balance: data.balance,
            total_earned: data.total_earned,
            total_spent: data.total_spent
          };
          setTokenBalance(balance);
          localStorage.setItem('meshOS_tokenBalance', JSON.stringify(balance));
        }
      }
    } catch (error) {
      console.error('Error loading token balance:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        await loadTokenBalance(data.user.id);
      }
      return data.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || email.split('@')[0] } }
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        await loadTokenBalance(data.user.id);
      }
      return data.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setTokenBalance(null);
      setIsAuthenticated(false);
      localStorage.removeItem('meshOS_tokenBalance');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
      if (data.url) {
        window.location.href = data.url;
      }
      return data;
    } catch (error) {
      console.error('OAuth error:', error);
      throw error;
    }
  };

  const refreshTokenBalance = async () => {
    if (user) {
      await loadTokenBalance(user.id);
    }
  };

  // Transform to our AuthUser format for backwards compatibility
  const authUser: AuthUser | null = user ? {
    id: user.id,
    email: user.email!,
    profile: {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      simulated_wallet_address: user.user_metadata?.simulated_wallet_address,
      wallet_created_at: user.user_metadata?.wallet_created_at,
    },
    tokenBalance
  } : null;

  return {
    // Auth state
    isReady: !isLoading,
    isAuthenticated,
    isLoading,
    user: authUser,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    
    // Token management
    tokenBalance,
    refreshTokenBalance,
    
    // Wallet info (simulated)
    hasWallet: !!user?.profile.simulated_wallet_address,
    walletAddress: user?.profile.simulated_wallet_address,
    
    // Backwards compatibility
    login: () => signInWithOAuth('google'),
    logout: signOut
  };
}

export default useAuth;