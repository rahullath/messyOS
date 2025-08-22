import React, { useState } from 'react';
import { usePrivy, useLoginWithEmail } from '@privy-io/react-auth';

const ProperEmailLogin: React.FC = () => {
  const { ready, authenticated, user, logout } = usePrivy();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  
  const { sendCode, loginWithCode, state } = useLoginWithEmail({
    onComplete: ({ user, isNewUser, wasAlreadyAuthenticated, loginMethod, loginAccount }) => {
      console.log('✅ Email login successful:', { 
        userId: user.id, 
        isNewUser, 
        wasAlreadyAuthenticated, 
        loginMethod,
        loginAccount: loginAccount?.address 
      });
    },
    onError: (error) => {
      console.error('❌ Email login error:', error);
    }
  });

  // Wait for Privy to be ready
  if (!ready) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500 p-6 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
          <div>
            <h3 className="text-yellow-300 font-bold">⏳ Initializing Privy...</h3>
            <p className="text-yellow-200 text-sm">Please wait while we set up authentication</p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated
  if (ready && authenticated && user) {
    const emailAccount = user.linkedAccounts?.find(account => account.type === 'email');
    
    return (
      <div className="bg-green-900/20 border border-green-500 p-6 rounded-lg">
        <h3 className="text-green-300 font-bold text-xl mb-4">✅ Successfully Authenticated!</h3>
        <div className="space-y-2 mb-6">
          <p className="text-green-200">
            <strong>Email:</strong> {emailAccount?.address || 'Unknown'}
          </p>
          <p className="text-green-200">
            <strong>User ID:</strong> {user.id}
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Continue to Dashboard
          </button>
          
          <button
            onClick={() => {
              console.log('🚪 Logout initiated');
              logout();
            }}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // User not authenticated - show email login flow
  return (
    <div className="bg-blue-900/20 border border-blue-500 p-6 rounded-lg">
      <h3 className="text-blue-300 font-bold text-xl mb-4">📧 Sign in with Email</h3>
      
      {/* Show current flow state */}
      <div className="mb-4 text-sm">
        <p className="text-blue-200">
          Status: <span className="font-mono">{state.status}</span>
        </p>
        {state.status === 'error' && state.error && (
          <p className="text-red-300 mt-1">Error: {state.error.message}</p>
        )}
      </div>

      {/* Email input (initial or error state) */}
      {(state.status === 'initial' || state.status === 'error') && (
        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email && sendCode({ email })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={state.status === 'sending-code'}
            />
          </div>
          <button
            onClick={() => email && sendCode({ email })}
            disabled={!email || state.status === 'sending-code'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Send Verification Code
          </button>
        </div>
      )}

      {/* Sending code state */}
      {state.status === 'sending-code' && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Sending verification code to {email}...</p>
        </div>
      )}

      {/* Code input (awaiting code or submitting) */}
      {(state.status === 'awaiting-code-input' || state.status === 'submitting-code') && (
        <div className="space-y-4">
          <div>
            <p className="text-blue-200 text-sm mb-2">
              Verification code sent to <strong>{email}</strong>
            </p>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && code && loginWithCode({ code })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={state.status === 'submitting-code'}
              autoFocus
              maxLength={6}
            />
          </div>
          <button
            onClick={() => code && loginWithCode({ code })}
            disabled={!code || state.status === 'submitting-code'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
          >
            {state.status === 'submitting-code' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </button>
          <button
            onClick={() => {
              setEmail('');
              setCode('');
              // Reset to initial state by refreshing
              window.location.reload();
            }}
            className="w-full text-blue-300 hover:text-blue-200 transition-colors py-2 text-sm"
            disabled={state.status === 'submitting-code'}
          >
            ← Use different email
          </button>
        </div>
      )}

      {/* Success state */}
      {state.status === 'done' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-300">Login successful! Redirecting...</p>
        </div>
      )}
    </div>
  );
};

export default ProperEmailLogin;