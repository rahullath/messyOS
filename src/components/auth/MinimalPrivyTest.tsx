import React from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

function SimpleTestComponent() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return <div className="text-yellow-300">⏳ Privy initializing...</div>;
  }

  if (authenticated) {
    return (
      <div className="text-green-300">
        <p>✅ Authenticated as: {user?.email?.address || user?.id}</p>
        <button 
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mt-2"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="text-blue-300">
      <p>🔐 Ready to authenticate</p>
      <button 
        onClick={login}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-2"
      >
        Login
      </button>
    </div>
  );
}

export default function MinimalPrivyTest() {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return <div className="text-red-300">❌ Missing PUBLIC_PRIVY_APP_ID</div>;
  }

  console.log('🔧 MinimalPrivyTest: Using App ID:', appId);

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h3 className="text-white font-bold mb-4">Minimal Privy Test</h3>
      <div className="text-sm text-gray-300 mb-4">
        <div>App ID: {appId}</div>
        <div>Mode: {import.meta.env.MODE}</div>
        <div>Privy Package: 2.21.4</div>
      </div>
      
      <PrivyProvider appId={appId}>
        <SimpleTestComponent />
      </PrivyProvider>
    </div>
  );
}