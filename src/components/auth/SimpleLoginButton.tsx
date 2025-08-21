// src/components/auth/SimpleLoginButton.tsx - Simple working login button
import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

export const SimpleLoginButton: React.FC = () => {
  const { ready, authenticated, login, user } = usePrivy();

  // Redirect if already authenticated
  if (ready && authenticated && user) {
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 100);
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8 text-center">
        <p className="text-green-400">✓ Authenticated! Redirecting...</p>
      </div>
    );
  }

  // Loading state
  if (!ready) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Privy...</p>
        </div>
      </div>
    );
  }

  // Login button
  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-4">Sign in to your account</h3>
        <p className="text-gray-300 mb-6 text-sm">
          Email and Google login available. Wallet creation is optional.
        </p>
        
        <button
          onClick={login}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          <span>Sign In with Privy</span>
        </button>
        
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>• Email and Google login supported</p>
          <p>• Wallet creation is optional</p>
          <p>• Existing accounts will be migrated</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLoginButton;