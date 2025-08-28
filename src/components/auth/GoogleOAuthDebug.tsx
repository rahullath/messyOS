import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const GoogleOAuthDebug: React.FC = () => {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
    console.log('GoogleOAuthDebug:', message);
  };

  useEffect(() => {
    if (ready) {
      addLog(`Privy ready: ${ready}, Authenticated: ${authenticated}`);
      
      const info = {
        ready,
        authenticated,
        userId: user?.id,
        linkedAccounts: user?.linkedAccounts || [],
        wallets: wallets.length,
        userAgent: navigator.userAgent,
        currentUrl: window.location.href,
        cookiesEnabled: navigator.cookieEnabled,
      };
      
      setDebugInfo(info);
      
      if (authenticated && user) {
        const googleAccount = user.linkedAccounts?.find(acc => acc.type === 'google_oauth');
        if (googleAccount) {
          addLog('✅ Google OAuth account found');
        } else {
          addLog('❌ No Google OAuth account found');
        }
      }
    }
  }, [ready, authenticated, user, wallets]);

  const handleGoogleLogin = async () => {
    addLog('🔄 Initiating Google OAuth login...');
    try {
      await login();
    } catch (error: any) {
      addLog(`❌ Login error: ${error.message}`);
      console.error('Google OAuth login error:', error);
    }
  };

  const testNetworkConnectivity = async () => {
    addLog('🌐 Testing network connectivity...');
    try {
      // Test Privy API connectivity
      const response = await fetch('https://auth.privy.io/health');
      if (response.ok) {
        addLog('✅ Privy API accessible');
      } else {
        addLog(`❌ Privy API error: ${response.status}`);
      }
    } catch (error: any) {
      addLog(`❌ Network error: ${error.message}`);
    }
  };

  const testAccessToken = async () => {
    if (!authenticated) {
      addLog('❌ Not authenticated - cannot test access token');
      return;
    }
    
    try {
      addLog('🔐 Getting access token...');
      const token = await getAccessToken();
      if (token) {
        addLog('✅ Access token retrieved successfully');
        addLog(`Token preview: ${token.substring(0, 20)}...`);
      } else {
        addLog('❌ Failed to get access token');
      }
    } catch (error: any) {
      addLog(`❌ Access token error: ${error.message}`);
    }
  };

  if (!ready) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-yellow-400 font-bold text-lg mb-4">
          🔄 Initializing Privy...
        </h3>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-6">
      <h3 className="text-blue-400 font-bold text-xl mb-4">
        🔍 Google OAuth Debug Console
      </h3>

      {/* Status Section */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <h4 className="text-white font-semibold mb-3">Authentication Status</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Ready:</span>
            <span className={ready ? "text-green-400 ml-2" : "text-red-400 ml-2"}>
              {ready ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Authenticated:</span>
            <span className={authenticated ? "text-green-400 ml-2" : "text-red-400 ml-2"}>
              {authenticated ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">User ID:</span>
            <span className="text-cyan-400 ml-2">
              {debugInfo.userId ? `${debugInfo.userId.substring(0, 20)}...` : 'None'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Linked Accounts:</span>
            <span className="text-blue-400 ml-2">
              {debugInfo.linkedAccounts?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Linked Accounts Details */}
      {debugInfo.linkedAccounts && debugInfo.linkedAccounts.length > 0 && (
        <div className="bg-gray-900 p-4 rounded-lg">
          <h4 className="text-white font-semibold mb-3">Linked Accounts</h4>
          {debugInfo.linkedAccounts.map((account: any, index: number) => (
            <div key={index} className="mb-2 p-2 bg-gray-800 rounded">
              <div className="text-sm">
                <span className="text-gray-400">Type:</span>
                <span className="text-white ml-2">{account.type}</span>
                {account.type === 'google_oauth' && (
                  <span className="text-green-400 ml-2">🎯 Google OAuth!</span>
                )}
              </div>
              {account.address && (
                <div className="text-sm">
                  <span className="text-gray-400">Address:</span>
                  <span className="text-cyan-400 ml-2">{account.address}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {!authenticated ? (
          <button
            onClick={handleGoogleLogin}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            🔐 Login with Google OAuth
          </button>
        ) : (
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
          >
            🚪 Logout
          </button>
        )}
        
        <button
          onClick={testNetworkConnectivity}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
        >
          🌐 Test Network
        </button>
        
        {authenticated && (
          <button
            onClick={testAccessToken}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
          >
            🔐 Test Access Token
          </button>
        )}
      </div>

      {/* Debug Logs */}
      <div className="bg-black p-4 rounded-lg">
        <h4 className="text-green-400 font-semibold mb-3">Debug Logs</h4>
        <div className="space-y-1 text-sm font-mono">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-gray-300">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-gray-900 p-4 rounded-lg">
        <h4 className="text-white font-semibold mb-3">Environment Info</h4>
        <div className="text-sm space-y-1">
          <div>
            <span className="text-gray-400">App ID:</span>
            <span className="text-green-400 ml-2">
              {import.meta.env.PUBLIC_PRIVY_APP_ID ? 
                `${import.meta.env.PUBLIC_PRIVY_APP_ID.substring(0, 15)}...` : 
                '❌ Not set'
              }
            </span>
          </div>
          <div>
            <span className="text-gray-400">Mode:</span>
            <span className="text-blue-400 ml-2">{import.meta.env.MODE}</span>
          </div>
          <div>
            <span className="text-gray-400">Cookies Enabled:</span>
            <span className={debugInfo.cookiesEnabled ? "text-green-400 ml-2" : "text-red-400 ml-2"}>
              {debugInfo.cookiesEnabled ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Current URL:</span>
            <span className="text-cyan-400 ml-2 text-xs">{debugInfo.currentUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleOAuthDebug;