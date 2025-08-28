// src/components/auth/HybridAuth.tsx - Supabase-first auth with Privy wallet management
// Uses Supabase for authentication and Privy only for crypto wallet creation

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase/client';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

interface HybridAuthProps {
  onAuthSuccess?: (userData: any) => void;
  onError?: (error: string) => void;
}

// Privy configuration for custom auth with Supabase
const privyConfig = {
  appId: import.meta.env.PUBLIC_PRIVY_APP_ID,
  config: {
    // Use custom auth with Supabase JWT tokens
    customAuth: {
      enabled: true,
      // This function will be called to get the custom access token (Supabase JWT)
      getCustomAccessToken: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
      }
    },
    // Only enable wallet creation, disable other login methods
    loginMethods: ['wallet'],
    // Optional: Enable embedded wallets
    embeddedWallets: {
      createOnLogin: 'users-without-wallets'
    }
  }
};

function PrivyWalletManager({ user, onWalletCreated }: { user: any, onWalletCreated: (wallet: any) => void }) {
  const { authenticated, user: privyUser, createWallet } = usePrivy();

  useEffect(() => {
    if (user && !authenticated) {
      // User is authenticated with Supabase but not connected to Privy for wallet
      // This is where we'd trigger wallet creation if needed
    }
  }, [user, authenticated]);

  const handleCreateWallet = async () => {
    try {
      const wallet = await createWallet();
      onWalletCreated(wallet);
    } catch (error) {
      console.error('Failed to create wallet:', error);
    }
  };

  return (
    <div>
      {!privyUser?.wallet && (
        <button onClick={handleCreateWallet} className="btn-primary">
          Create Crypto Wallet
        </button>
      )}
    </div>
  );
}

export default function HybridAuth({ onAuthSuccess, onError }: HybridAuthProps = {}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectExecuted = useRef(false);

  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await handleSuccessfulAuth(session.user, session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        redirectExecuted.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await handleSuccessfulAuth(session.user, session);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setLoading(false);
    }
  };

  const handleSuccessfulAuth = async (supabaseUser: any, session: any) => {
    try {
      setLoading(true);
      
      // Get or create user profile in our database
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      let userProfile = profile;

      // Create profile if it doesn't exist
      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: supabaseUser.id,
            email: supabaseUser.email,
            full_name: supabaseUser.user_metadata?.full_name || '',
            avatar_url: supabaseUser.user_metadata?.avatar_url || '',
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }
        userProfile = newProfile;
      } else if (error) {
        throw error;
      }

      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        profile: userProfile,
        session: session,
        supabaseUser: supabaseUser
      };

      setUser(userData);
      
      // Handle redirect
      if (!redirectExecuted.current) {
        redirectExecuted.current = true;
        if (onAuthSuccess) {
          onAuthSuccess(userData);
        } else {
          // Default behavior - redirect to dashboard
          window.location.href = '/dashboard';
        }
      }
      
    } catch (error) {
      console.error('Error handling successful auth:', error);
      if (onError) {
        onError('Failed to setup user profile');
      } else {
        alert('Failed to setup user profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        const message = error.message.includes('Invalid login credentials') 
          ? 'Invalid email or password' 
          : error.message;
        if (onError) {
          onError(message);
        } else {
          alert(message);
        }
      }
    } catch (error) {
      if (onError) {
        onError('An unexpected error occurred');
      } else {
        alert('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        if (onError) {
          onError(error.message);
        } else {
          alert(error.message);
        }
      } else if (data.user && !data.user.email_confirmed_at) {
        if (onError) {
          onError('Please check your email for a confirmation link');
        } else {
          alert('Please check your email for a confirmation link');
        }
      }
    } catch (error) {
      if (onError) {
        onError('An unexpected error occurred');
      } else {
        alert('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      console.log('🚀 Starting Google OAuth flow...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('❌ OAuth initiation error:', error);
        if (onError) {
          onError('Google authentication failed');
        } else {
          alert('Google authentication failed');
        }
      } else {
        console.log('✅ OAuth flow initiated successfully');
      }
    } catch (error) {
      console.error('❌ OAuth exception:', error);
      if (onError) {
        onError('Google authentication failed');
      } else {
        alert('Google authentication failed');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, show wallet management
  if (user) {
    return (
      <PrivyProvider {...privyConfig}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Welcome to meshOS</h2>
            <PrivyWalletManager 
              user={user} 
              onWalletCreated={(wallet) => {
                console.log('Wallet created:', wallet);
                // Continue with the auth flow
              }} 
            />
          </div>
        </div>
      </PrivyProvider>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">meshOS</h1>
          <p className="text-gray-300">Your AI-powered operating system</p>
        </div>

        <div className="flex mb-6 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setAuthMode('signin')}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              authMode === 'signin'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthMode('signup')}
            className={`flex-1 py-2 px-4 rounded-md transition-all ${
              authMode === 'signup'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4 mb-6">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? 'Please wait...' : (authMode === 'signin' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-gray-400">or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleAuth}
          className="w-full py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Google</span>
        </button>
      </div>
    </div>
  );
}