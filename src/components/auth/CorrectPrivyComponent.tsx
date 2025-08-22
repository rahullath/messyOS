import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

const CorrectPrivyComponent: React.FC = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();

  // CRITICAL: Do nothing while Privy initializes
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

  // Now Privy is ready - check authentication
  if (ready && !authenticated) {
    return (
      <div className="bg-blue-900/20 border border-blue-500 p-6 rounded-lg">
        <h3 className="text-blue-300 font-bold text-xl mb-4">🔐 Ready to Sign In</h3>
        <p className="text-blue-200 mb-6">
          Privy has initialized successfully. Click below to authenticate with your email.
        </p>
        <button
          onClick={() => {
            console.log('🚀 Login initiated');
            login();
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Sign In with Email
        </button>
        <div className="mt-4 text-xs text-blue-300">
          <p>✅ Privy Status: Ready</p>
          <p>⏳ Authentication: Pending</p>
        </div>
      </div>
    );
  }

  // User is authenticated
  if (ready && authenticated) {
    const emailAccount = user?.linkedAccounts?.find(account => account.type === 'email');
    
    return (
      <div className="bg-green-900/20 border border-green-500 p-6 rounded-lg">
        <h3 className="text-green-300 font-bold text-xl mb-4">✅ Successfully Authenticated!</h3>
        <div className="space-y-2 mb-6">
          <p className="text-green-200">
            <strong>User ID:</strong> {user?.id}
          </p>
          {emailAccount && (
            <p className="text-green-200">
              <strong>Email:</strong> {emailAccount.address}
            </p>
          )}
          <p className="text-green-200">
            <strong>Privy Status:</strong> Ready & Authenticated
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

  // This should never happen, but just in case
  return (
    <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg">
      <h3 className="text-red-300 font-bold">⚠️ Unexpected State</h3>
      <p className="text-red-200">Please refresh the page</p>
    </div>
  );
};

export default CorrectPrivyComponent;