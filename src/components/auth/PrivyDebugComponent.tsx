import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

const PrivyDebugComponent: React.FC = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add log function
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-10), logEntry]); // Keep last 10 logs
    console.log('🔍 Privy Debug:', logEntry);
  };

  // Monitor Privy state changes
  useEffect(() => {
    addLog(`State change: ready=${ready}, authenticated=${authenticated}, user=${user?.id || 'none'}`);
    
    // Only check authentication after Privy is ready
    if (ready) {
      addLog('🎉 PRIVY IS READY! Now we can check authentication status');
      if (authenticated) {
        addLog('✅ User is authenticated!');
      } else {
        addLog('⏳ User not authenticated, ready for login');
      }
    }
  }, [ready, authenticated, user]);

  // Set error timeout - but only if not ready
  useEffect(() => {
    if (!ready) {
      const timeout = setTimeout(() => {
        setError('Privy failed to initialize after 10 seconds');
        addLog('❌ TIMEOUT: Privy initialization failed');
      }, 10000);
      
      return () => clearTimeout(timeout);
    } else {
      setError(null);
      addLog('🚀 Privy ready state achieved - clearing any error timeouts');
    }
  }, [ready]);

  // Initial mount log
  useEffect(() => {
    addLog('✅ PrivyDebugComponent mounted successfully');
    addLog(`Environment: ${import.meta.env.MODE}, App ID: ${import.meta.env.PUBLIC_PRIVY_APP_ID?.substring(0, 10)}...`);
    
    // Test network connectivity to Privy
    fetch('https://auth.privy.io/api/v1/health', { method: 'GET' })
      .then(response => {
        addLog(`🌐 Privy API health check: ${response.status} ${response.statusText}`);
      })
      .catch(error => {
        addLog(`❌ Network error reaching Privy: ${error.message}`);
      });
    
    // Add global error handler
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('privy') || event.message.includes('Privy')) {
        addLog(`🚨 Global error (Privy related): ${event.message}`);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="space-y-4 p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold text-cyan-400">🔍 Privy Debug Component</h2>
      
      {/* Status Panel */}
      <div className={`p-4 rounded-lg border-2 ${
        error ? 'bg-red-900/20 border-red-500' :
        ready ? (authenticated ? 'bg-green-900/20 border-green-500' : 'bg-blue-900/20 border-blue-500') :
        'bg-yellow-900/20 border-yellow-500'
      }`}>
        <h3 className="font-bold mb-2">
          {error ? '❌ Error' :
           ready ? (authenticated ? '✅ Ready & Authenticated' : '🔵 Ready - Not Authenticated') :
           '⏳ Initializing...'}
        </h3>
        
        <div className="text-sm space-y-1">
          <div>Ready: <span className={ready ? 'text-green-400' : 'text-red-400'}>{ready ? 'Yes' : 'No'}</span></div>
          <div>Authenticated: <span className={authenticated ? 'text-green-400' : 'text-yellow-400'}>{authenticated ? 'Yes' : 'No'}</span></div>
          {user && (
            <div>User: <span className="text-cyan-400">{user.linkedAccounts?.[0]?.address || user.id}</span></div>
          )}
          {error && (
            <div className="text-red-300 mt-2">{error}</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-x-2">
          {ready && !authenticated && (
            <button
              onClick={() => {
                addLog('🚀 Login button clicked');
                login();
              }}
              className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded text-white transition-colors"
            >
              Login with Email
            </button>
          )}
          
          {authenticated && (
            <button
              onClick={() => {
                addLog('🚪 Logout button clicked');
                logout();
              }}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white transition-colors"
            >
              Logout
            </button>
          )}
          
          <button
            onClick={() => {
              setLogs([]);
              addLog('🧹 Logs cleared');
            }}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white transition-colors"
          >
            Clear Logs
          </button>
        </div>
      </div>

      {/* Loading Spinner */}
      {!ready && !error && (
        <div className="flex items-center space-x-2 p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
          <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
          <span className="text-yellow-300">Waiting for Privy to initialize...</span>
        </div>
      )}

      {/* Console Logs */}
      <div className="bg-black/50 border border-gray-600 rounded-lg">
        <div className="p-2 bg-gray-800 border-b border-gray-600 rounded-t-lg">
          <h4 className="text-sm font-bold text-gray-300">📋 Debug Logs</h4>
        </div>
        <div className="p-3 max-h-48 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-sm">No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-xs font-mono text-green-400 mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Debug Data */}
      <details className="bg-gray-800/50 border border-gray-600 rounded-lg">
        <summary className="p-3 cursor-pointer text-gray-300 hover:text-white">
          🔧 Raw Debug Data
        </summary>
        <div className="p-3 border-t border-gray-600">
          <pre className="text-xs text-gray-400 overflow-auto">
            {JSON.stringify({
              ready,
              authenticated,
              user: user ? {
                id: user.id,
                linkedAccounts: user.linkedAccounts?.map(acc => ({
                  type: acc.type,
                  address: acc.address
                }))
              } : null,
              environment: {
                mode: import.meta.env.MODE,
                dev: import.meta.env.DEV,
                appId: import.meta.env.PUBLIC_PRIVY_APP_ID
              },
              timestamp: new Date().toISOString()
            }, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
};

export default PrivyDebugComponent;