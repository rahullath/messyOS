import React from 'react';
import { usePrivy, useLogin } from '@privy-io/react-auth';

export const WorkingLoginButton: React.FC = () => {
  const { ready, authenticated, user, logout } = usePrivy();
  const { login } = useLogin({
    onComplete: ({user, isNewUser, wasAlreadyAuthenticated, loginMethod, linkedAccount}) => {
      console.log('✅ Login successful:', { 
        userId: user.id, 
        isNewUser, 
        wasAlreadyAuthenticated, 
        loginMethod,
        linkedAccount: linkedAccount?.address 
      });
    },
    onError: (error) => {
      console.error('❌ Login error:', error);
    }
  });

  console.log('🔍 Privy State:', { ready, authenticated, userId: user?.id });
  
  // Add a timeout to check if Privy is stuck
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!ready) {
        console.error('🚨 PRIVY STUCK: Not ready after 10 seconds - check network or configuration');
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [ready]);

  if (!ready) {
    return (
      <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Initializing Privy...</p>
          <p className="text-xs text-gray-500 mt-2">If this takes too long, check console for errors</p>
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
          <h3 className="text-lg font-semibold text-white mb-2">✅ Logged In!</h3>
          <p className="text-gray-300 mb-4">
            {user.linkedAccounts?.find(account => account.type === 'email')?.address || 'User'}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={logout}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-4">Sign in to meshOS</h3>
        <p className="text-gray-300 mb-6 text-sm">
          Simple email authentication - no wallet required
        </p>
        
        <button
          onClick={() => {
            console.log('🚀 Attempting Privy login...');
            login();
          }}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Sign In with Email
        </button>
        
        <div className="mt-4 text-xs text-gray-400">
          <p>• Email authentication only</p>
          <p>• No cryptocurrency wallet needed</p>
          <p>• Quick and secure login</p>
        </div>
      </div>
    </div>
  );
};
export default WorkingLoginButton;