// src/components/auth/DebugPrivyProvider.tsx - Simple debug version
import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface DebugPrivyProviderProps {
  children: React.ReactNode;
}

export const DebugPrivyProvider: React.FC<DebugPrivyProviderProps> = ({ children }) => {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;
  
  console.log('🔍 Debug Privy Provider:', {
    appId: appId ? `${appId.substring(0, 10)}...` : 'NOT SET',
    env: import.meta.env.MODE,
    hasAppId: !!appId
  });

  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg max-w-md">
          <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Privy Configuration Missing</h3>
          <p className="text-gray-300 mb-4">PUBLIC_PRIVY_APP_ID is not set</p>
          <div className="text-sm text-gray-400">
            <p>Expected: PUBLIC_PRIVY_APP_ID=cmeaj35yf006oic0cyhhppt65</p>
            <p>Current: {appId || 'undefined'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
        },
        embeddedWallets: {
          createOnLogin: 'off',
        },
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: 'smartWalletOnly'
          },
          metamask: false,
          walletConnect: false,
        },
      }}
      onSuccess={(user) => {
        console.log('✅ Privy login successful:', user);
      }}
      onError={(error) => {
        console.error('❌ Privy error:', error);
      }}
    >
      {children}
    </PrivyProvider>
  );
};

export default DebugPrivyProvider;