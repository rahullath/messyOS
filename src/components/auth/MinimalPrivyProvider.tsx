// src/components/auth/MinimalPrivyProvider.tsx - Minimal Privy without wallet issues
import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface MinimalPrivyProviderProps {
  children: React.ReactNode;
}

export const MinimalPrivyProvider: React.FC<MinimalPrivyProviderProps> = ({ children }) => {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;
  
  console.log('🧪 Minimal Privy Provider:', {
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
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['email'],
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
        },
        embeddedWallets: {
          createOnLogin: 'off',
        },
      }}
      onSuccess={(user) => {
        console.log('✅ Minimal Privy login successful:', user);
      }}
      onError={(error) => {
        console.error('❌ Minimal Privy error:', error);
      }}
    >
      {children}
    </PrivyProvider>
  );
};

export default MinimalPrivyProvider;