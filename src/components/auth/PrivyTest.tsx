import React, { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export const PrivyTest: React.FC = () => {
  const privy = usePrivy();
  
  useEffect(() => {
    console.log('🧪 Privy Test Component - State:', {
      ready: privy.ready,
      authenticated: privy.authenticated,
      user: privy.user,
      // Log the entire privy object to see what's available
      privyKeys: Object.keys(privy)
    });
  }, [privy.ready, privy.authenticated]);

  return (
    <div className="p-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-bold mb-4">🧪 Privy Debug Panel</h3>
      <div className="space-y-2 text-sm">
        <div>Ready: {privy.ready ? '✅' : '❌'}</div>
        <div>Authenticated: {privy.authenticated ? '✅' : '❌'}</div>
        <div>User ID: {privy.user?.id || 'None'}</div>
        <div>App ID: {import.meta.env.PUBLIC_PRIVY_APP_ID || 'Not set'}</div>
      </div>
      
      {!privy.ready && (
        <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded">
          <p className="text-yellow-200">⏳ Privy is initializing...</p>
          <p className="text-xs text-yellow-300 mt-1">Check console for detailed logs</p>
        </div>
      )}
      
      {privy.ready && !privy.authenticated && (
        <div className="mt-4">
          <button
            onClick={() => {
              console.log('🚀 Test login triggered');
              privy.login();
            }}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Test Login
          </button>
        </div>
      )}
    </div>
  );
};

export default PrivyTest;