import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

const SimplePrivyTest: React.FC = () => {
  const { ready, authenticated, user, login } = usePrivy();
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    const info = {
      ready,
      authenticated,
      userId: user?.id,
      userEmail: user?.linkedAccounts?.find(acc => acc.type === 'email')?.address,
      timestamp: new Date().toISOString(),
      appId: import.meta.env.PUBLIC_PRIVY_APP_ID
    };
    
    setDebugInfo(info);
    console.log('🔍 Privy State Update:', info);
    
    // Force update every 2 seconds if not ready
    if (!ready) {
      const timeout = setTimeout(() => {
        console.log('⚠️ Still not ready after timeout, forcing re-render');
        setDebugInfo({...info, forceUpdate: Date.now()});
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [ready, authenticated, user]);

  // If not ready after 10 seconds, show error
  useEffect(() => {
    if (!ready) {
      const timeout = setTimeout(() => {
        console.error('🚨 PRIVY FAILED TO INITIALIZE - Check network and app configuration');
        setDebugInfo(prev => ({...prev, error: 'Failed to initialize after 10 seconds'}));
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [ready]);

  return (
    <div className="space-y-4">
      {/* Status Display */}
      <div className="bg-gray-900 p-4 rounded-lg border">
        <h3 className="text-white font-bold mb-2">🔍 Privy Status</h3>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-300">Ready:</span>
            <span className={ready ? "text-green-400" : "text-red-400"}>
              {ready ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Authenticated:</span>
            <span className={authenticated ? "text-green-400" : "text-yellow-400"}>
              {authenticated ? '✅ Yes' : '⏳ No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">App ID:</span>
            <span className="text-blue-400 font-mono text-xs">
              {debugInfo.appId || 'Missing'}
            </span>
          </div>
          {debugInfo.userEmail && (
            <div className="flex justify-between">
              <span className="text-gray-300">Email:</span>
              <span className="text-green-400">{debugInfo.userEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {debugInfo.error && (
        <div className="bg-red-900/20 border border-red-500 p-4 rounded-lg">
          <h4 className="text-red-400 font-bold">❌ Error</h4>
          <p className="text-red-300 text-sm">{debugInfo.error}</p>
          <p className="text-red-200 text-xs mt-2">
            Check browser console for detailed logs
          </p>
        </div>
      )}

      {/* Loading State */}
      {!ready && !debugInfo.error && (
        <div className="bg-yellow-900/20 border border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
            <span className="text-yellow-300">Initializing Privy...</span>
          </div>
          <p className="text-yellow-200 text-xs mt-2">
            This should take less than 5 seconds
          </p>
        </div>
      )}

      {/* Login Button */}
      {ready && !authenticated && (
        <div className="bg-blue-900/20 border border-blue-500 p-4 rounded-lg">
          <h4 className="text-blue-300 font-bold mb-2">🚀 Ready to Login</h4>
          <button
            onClick={() => {
              console.log('🎯 Login button clicked');
              login();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
          >
            Test Login with Email
          </button>
        </div>
      )}

      {/* Success State */}
      {ready && authenticated && (
        <div className="bg-green-900/20 border border-green-500 p-4 rounded-lg">
          <h4 className="text-green-300 font-bold">✅ Authentication Successful!</h4>
          <p className="text-green-200 text-sm">
            User: {debugInfo.userEmail || debugInfo.userId}
          </p>
        </div>
      )}

      {/* Debug Info */}
      <details className="bg-gray-800 p-4 rounded-lg">
        <summary className="text-gray-300 cursor-pointer">🔧 Debug Info</summary>
        <pre className="text-xs text-gray-400 mt-2 overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default SimplePrivyTest;