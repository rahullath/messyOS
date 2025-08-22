import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface WorkingPrivyProviderProps {
  children: React.ReactNode;
}

export const WorkingPrivyProvider: React.FC<WorkingPrivyProviderProps> = ({ children }) => {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;
  
  console.log('🔧 Working Privy Provider:', {
    appId: appId ? `${appId.substring(0, 10)}...` : 'NOT SET',
    fullAppId: appId, // Show full ID for debugging
    env: import.meta.env.MODE
  });

  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg max-w-md">
          <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Privy Not Configured</h3>
          <p className="text-gray-300 mb-4">PUBLIC_PRIVY_APP_ID environment variable is missing</p>
          <p className="text-gray-400 text-sm mb-4">Add your Privy App ID to the .env file:</p>
          <code className="block bg-gray-800 p-2 rounded text-sm text-green-400">
            PUBLIC_PRIVY_APP_ID=your-app-id-here
          </code>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Authentication methods - only email for simplicity
        loginMethods: ['email'],
        // UI appearance
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4', // Cyan color to match your theme
        },
        // Embedded wallet configuration - completely disabled
        embeddedWallets: {
          createOnLogin: 'off',
        },
        // External wallet configuration - disabled to avoid wallet errors
        externalWallets: {
          metamask: false,
          walletConnect: false,
          coinbaseWallet: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
};

export default WorkingPrivyProvider;
