import React, { useState, useEffect } from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

function DiagnosticDisplay() {
  const privy = usePrivy();
  const [logs, setLogs] = useState<string[]>([]);
  const [initStart, setInitStart] = useState<number>(Date.now());

  const addLog = (message: string) => {
    const timestamp = `[${((Date.now() - initStart) / 1000).toFixed(1)}s]`;
    const logMessage = `${timestamp} ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  useEffect(() => {
    addLog('Component mounted, checking Privy state...');
    addLog(`Ready: ${privy.ready}, Authenticated: ${privy.authenticated}`);
    addLog(`User: ${privy.user ? 'exists' : 'null'}`);
    
    // Log all privy properties to understand what's available
    addLog(`Privy object keys: ${Object.keys(privy).join(', ')}`);
  }, []);

  useEffect(() => {
    addLog(`State changed - Ready: ${privy.ready}, Authenticated: ${privy.authenticated}`);
  }, [privy.ready, privy.authenticated]);

  // Test if we can call Privy methods
  const testPrivyMethods = () => {
    try {
      addLog('Testing Privy methods...');
      if (typeof privy.login === 'function') {
        addLog('✅ privy.login is callable');
      } else {
        addLog('❌ privy.login is not a function');
      }
      
      if (typeof privy.logout === 'function') {
        addLog('✅ privy.logout is callable');
      } else {
        addLog('❌ privy.logout is not a function');
      }
      
    } catch (error) {
      addLog(`❌ Error testing methods: ${error}`);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!privy.ready) {
        addLog('❌ Privy still not ready after 10 seconds');
        testPrivyMethods();
      }
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [privy.ready]);

  return (
    <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded border max-h-96 overflow-y-auto">
      <h3 className="text-white mb-4 font-bold">🔍 Privy Diagnostic Log</h3>
      <div className="space-y-1">
        {logs.map((log, i) => (
          <div key={i} className="whitespace-pre-wrap">{log}</div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <h4 className="text-white mb-2">Current State:</h4>
        <div>Ready: {privy.ready ? '✅' : '❌'}</div>
        <div>Authenticated: {privy.authenticated ? '✅' : '❌'}</div>
        <div>User: {privy.user ? `✅ ${privy.user.id}` : '❌ null'}</div>
      </div>
      
      <div className="mt-4">
        <button 
          onClick={testPrivyMethods}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-xs"
        >
          Test Methods
        </button>
        {privy.ready && !privy.authenticated && (
          <button 
            onClick={() => {
              addLog('Attempting login...');
              privy.login();
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs ml-2"
          >
            Try Login
          </button>
        )}
      </div>
    </div>
  );
}

export default function PrivyDiagnostic() {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;
  
  if (!appId) {
    return (
      <div className="bg-red-900/20 border border-red-500 p-4 rounded">
        <h3 className="text-red-300 font-bold">❌ Missing App ID</h3>
        <p className="text-red-200">PUBLIC_PRIVY_APP_ID not found in environment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-900/20 border border-blue-500 p-4 rounded">
        <h3 className="text-blue-300 font-bold">🔧 Privy Diagnostic Tool</h3>
        <p className="text-blue-200 text-sm">App ID: {appId}</p>
        <p className="text-blue-200 text-sm">Environment: {import.meta.env.MODE}</p>
      </div>
      
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ['email'],
          appearance: { theme: 'dark' }
        }}
        onSuccess={(user, isNewUser, wasAlreadyAuthenticated, loginMethod, linkedAccount) => {
          console.log('🎉 Privy onSuccess:', { user: user.id, isNewUser, wasAlreadyAuthenticated, loginMethod });
        }}
        onError={(error) => {
          console.error('💥 Privy onError:', error);
        }}
      >
        <DiagnosticDisplay />
      </PrivyProvider>
    </div>
  );
}