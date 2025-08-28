import React, { useEffect, useRef } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

function AuthInterface() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const redirectExecuted = useRef(false);

  // Immediate redirect on authentication - no loading screens
  useEffect(() => {
    if (ready && authenticated && user && !redirectExecuted.current) {
      redirectExecuted.current = true;
      
      // Set user ID cookie for API access
      document.cookie = `privy_user_id=${user.id}; path=/; max-age=604800; SameSite=Lax`;
      
      // Set auth token cookie for middleware (if available)
      if (typeof user.getAccessToken === 'function') {
        user.getAccessToken().then(accessToken => {
          document.cookie = `privy-auth-token=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
        }).catch(err => {
          console.warn('Failed to set auth token cookie:', err);
        });
      }
      
      // Sync with backend in background (don't wait for it)
      syncUserInBackground(user);
      
      // Immediate redirect to dashboard
      window.location.href = '/dashboard';
    }
  }, [ready, authenticated, user]);

  // Background sync function
  const syncUserInBackground = async (privyUser: any) => {
    try {
      let accessToken = null;
      
      // Try to get access token if available
      if (typeof privyUser.getAccessToken === 'function') {
        try {
          accessToken = await privyUser.getAccessToken();
        } catch (err) {
          console.warn('Could not get access token:', err);
        }
      }
      
      fetch('/api/auth/privy-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            id: privyUser.id,
            linkedAccounts: privyUser.linkedAccounts,
            createdAt: privyUser.createdAt
          },
          token: accessToken
        })
      }).catch(error => {
        console.warn('Background sync failed:', error);
      });
    } catch (error) {
      console.warn('Background sync error:', error);
    }
  };

  // Show minimal loading only while Privy initializes
  if (!ready) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If authenticated, this component should never render (due to redirect above)
  // But just in case, show a minimal redirect message
  if (authenticated && user) {
    return (
      <div className="text-center p-6">
        <p className="text-white">Redirecting to dashboard...</p>
      </div>
    );
  }

  // Login interface - clean and simple
  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to meshOS</h2>
        <p className="text-gray-300">Your AI-powered life optimization system</p>
      </div>

      {/* Login options */}
      <div className="space-y-4">
        {/* Google Login */}
        <button
          onClick={login}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Email Login */}
        <button
          onClick={login}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
          </svg>
          <span>Continue with Email</span>
        </button>

        {/* Wallet Login */}
        <button
          onClick={login}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-3"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 4a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
          </svg>
          <span>Connect Wallet</span>
        </button>
      </div>

      {/* Features */}
      <div className="mt-8 p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg border border-cyan-500/30">
        <div className="text-center">
          <h3 className="text-cyan-300 font-semibold mb-2">🎁 Free Trial Included</h3>
          <p className="text-cyan-200 text-sm">
            Get <strong>5,000 tokens</strong> (₹500 value) to explore all meshOS features
          </p>
        </div>
      </div>

      {/* Terms */}
      <div className="text-center text-xs text-gray-400">
        <p>
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-cyan-400 hover:text-cyan-300 underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

export default function StreamlinedAuth() {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg">
        <h3 className="text-red-300 font-bold">❌ Configuration Error</h3>
        <p className="text-red-200">Authentication service not configured. Please contact support.</p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
        },
        legal: {
          termsAndConditionsUrl: '/terms',
          privacyPolicyUrl: '/privacy',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <AuthInterface />
    </PrivyProvider>
  );
}