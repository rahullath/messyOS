// src/components/auth/SupabaseAuth.tsx - Pure Supabase Authentication Component
import { useEffect, useState } from 'react';
import { authService } from '../../lib/auth/supabase-auth';
import type { User } from '../../lib/auth/supabase-auth';
import { supabase } from '../../lib/supabase/client';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  tokenBalance: {
    balance: number;
    total_earned: number;
    total_spent: number;
  } | null;
  integrations: {
    github: boolean;
    outlook: boolean;
    banking: boolean;
    fitness: boolean;
  } | null;
}

export function SupabaseAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    tokenBalance: null,
    integrations: null
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Check session on mount and listen for changes
  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserData();
      } else if (event === 'SIGNED_OUT') {
        setAuthState(prev => ({
          ...prev,
          user: null,
          tokenBalance: null,
          integrations: null
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        setAuthState(prev => ({ ...prev, user, loading: false }));
        await loadUserData();
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error checking session:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false,
        error: 'Failed to check authentication status'
      }));
    }
  };

  const loadUserData = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return;

      const [tokenBalance, integrations] = await Promise.all([
        authService.getUserTokenBalance(user.id),
        authService.getUserIntegrations(user.id)
      ]);

      setAuthState(prev => ({
        ...prev,
        user,
        tokenBalance,
        integrations,
        loading: false,
        error: null
      }));
    } catch (error) {
      console.error('Error loading user data:', error);
      setAuthState(prev => ({ 
        ...prev, 
        error: 'Failed to load user data' 
      }));
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let user;
      if (isSignUp) {
        user = await authService.signUpWithEmail(email, password, fullName);
      } else {
        user = await authService.signInWithEmail(email, password);
      }

      if (!user) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Failed to ${isSignUp ? 'sign up' : 'sign in'}. Please check your credentials.` 
        }));
      }
    } catch (error) {
      console.error('Email auth error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `${isSignUp ? 'Sign up' : 'Sign in'} failed. Please try again.` 
      }));
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      const result = await authService.signInWithOAuth(provider);
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        error: `Failed to sign in with ${provider}. Please try again.` 
      }));
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setAuthState(prev => ({ 
        ...prev, 
        error: 'Failed to sign out. Please try again.' 
      }));
    }
  };

  const formatTokenAmount = (amount: number) => {
    return `₹${(amount / 10).toFixed(2)}`;
  };

  if (authState.loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Authenticated user view
  if (authState.user) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* User Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
              <p className="text-gray-600">{authState.user.email}</p>
              {authState.user.profile.simulated_wallet_address && (
                <p className="text-sm text-gray-500 font-mono">
                  Wallet: {authState.user.profile.simulated_wallet_address.substring(0, 10)}...
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Token Balance Card */}
        {authState.tokenBalance && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">meshOS Credits</h3>
                <div className="space-y-1">
                  <div className="text-3xl font-bold">
                    {formatTokenAmount(authState.tokenBalance.balance)}
                  </div>
                  <div className="text-sm opacity-90">
                    Available Balance
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">Total Earned</div>
                <div className="text-xl font-semibold">
                  {formatTokenAmount(authState.tokenBalance.total_earned)}
                </div>
                <div className="text-sm opacity-90 mt-2">Total Spent</div>
                <div className="text-lg">
                  {formatTokenAmount(authState.tokenBalance.total_spent)}
                </div>
              </div>
            </div>
            
            {/* Simulated wallet address */}
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <div className="text-sm opacity-90 mb-1">Simulated Wallet Address</div>
              <div className="font-mono text-sm break-all">
                {authState.user.profile.simulated_wallet_address}
              </div>
            </div>
          </div>
        )}

        {/* Integrations Status */}
        {authState.integrations && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Services</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(authState.integrations).map(([service, connected]) => (
                <div
                  key={service}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    connected 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      connected ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="capitalize font-medium">{service}</span>
                  </div>
                  <span className={`text-sm ${
                    connected ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {authState.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{authState.error}</p>
          </div>
        )}
      </div>
    );
  }

  // Sign in/up form
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p className="text-gray-600">Access your meshOS account</p>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4">
        {isSignUp && (
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={authState.loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {authState.loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div className="mt-4">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOAuthSignIn('google')}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            Google
          </button>
          <button
            onClick={() => handleOAuthSignIn('github')}
            className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            GitHub
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {isSignUp 
            ? 'Already have an account? Sign in' 
            : "Don't have an account? Sign up"
          }
        </button>
      </div>

      {authState.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{authState.error}</p>
        </div>
      )}
    </div>
  );
}