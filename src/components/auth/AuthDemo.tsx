// src/components/auth/AuthDemo.tsx - Demo component to test authentication infrastructure
import React from 'react';
import { AuthProvider, useAuth, useTokens } from '../../lib/auth';

// Demo component that uses the auth context
function AuthDemoContent() {
  const auth = useAuth();
  const tokens = useTokens();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Authentication Demo
        </h2>
        
        <div className="space-y-4">
          <button
            onClick={() => auth.signInWithEmail('test@example.com', 'password123')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Demo Sign In
          </button>
          
          <button
            onClick={() => auth.signInWithOAuth('google')}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign In with Google
          </button>
        </div>

        {auth.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{auth.error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* User Info */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome!</h2>
            <p className="text-gray-600">{auth.user?.email}</p>
            <p className="text-sm text-gray-500">
              Profile: {auth.user?.profile.full_name || 'Not set'}
            </p>
          </div>
          <button
            onClick={auth.signOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Token Balance */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Token Balance</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">{tokens.balance}</div>
            <div className="text-sm opacity-90">Available</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{tokens.totalEarned}</div>
            <div className="text-sm opacity-90">Total Earned</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{tokens.totalSpent}</div>
            <div className="text-sm opacity-90">Total Spent</div>
          </div>
        </div>
        
        {tokens.trialStatus && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <div className="text-sm opacity-90">Trial Status</div>
            <div className="font-semibold">
              {tokens.trialStatus.isActive 
                ? `${tokens.trialStatus.daysRemaining} days remaining`
                : 'Trial expired'
              }
            </div>
          </div>
        )}
      </div>

      {/* Demo Actions */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => tokens.deductTokens(10, 'Demo token deduction')}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Deduct 10 Tokens
          </button>
          
          <button
            onClick={tokens.refreshBalance}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh Balance
          </button>
          
          <button
            onClick={() => auth.updateProfile({ full_name: 'Updated Name' })}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Update Profile
          </button>
        </div>
      </div>

      {/* Error Display */}
      {auth.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{auth.error}</p>
        </div>
      )}
    </div>
  );
}

// Main demo component with provider
export function AuthDemo() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Authentication Infrastructure Demo
            </h1>
            <p className="text-gray-600 mt-2">
              Testing Supabase client configuration, React context provider, and TypeScript interfaces
            </p>
          </div>
          
          <AuthDemoContent />
        </div>
      </div>
    </AuthProvider>
  );
}