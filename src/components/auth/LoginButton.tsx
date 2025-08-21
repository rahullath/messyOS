// src/components/auth/LoginButton.tsx - Simple login button for production
import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

export const LoginButton: React.FC = () => {
  const { ready, authenticated, login, user } = usePrivy();

  if (!ready) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-12 bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (authenticated && user) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Welcome back!</h3>
          <p className="text-gray-300 mb-4">
            {user.linkedAccounts?.find(account => account.type === 'email')?.address || 'User'}
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-4">Sign in to your account</h3>
        <p className="text-gray-300 mb-6 text-sm">
          Use email, Google, or wallet to sign in. Existing accounts will be automatically migrated.
        </p>
        
        <button
          onClick={login}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span>Sign In</span>
        </button>
        
        <div className="mt-4 text-xs text-gray-400">
          <p>• Email and Google login available</p>
          <p>• Wallet creation is optional</p>
          <p>• Existing accounts preserved</p>
        </div>
      </div>
    </div>
  );
};

export default LoginButton;