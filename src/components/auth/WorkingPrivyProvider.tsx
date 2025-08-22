import React from 'react';
import { PrivyProvider } from '@privy-io/react-auth';

interface WorkingPrivyProviderProps {
  children: React.ReactNode;
}

export const WorkingPrivyProvider: React.FC<WorkingPrivyProviderProps> = ({ children }) => {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;
  
  // Use useRef to prevent multiple initializations
  const initRef = React.useRef(false);
  
  React.useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      console.log('🔧 Privy Provider SINGLE INIT:', {
        appId: appId ? `${appId.substring(0, 10)}...` : 'NOT SET',
        timestamp: new Date().toISOString()
      });
    }
  }, [appId]);

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
        // Minimal config - just email login
        loginMethods: ['email'],
        appearance: {
          theme: 'dark',
        },
      }}
      onSuccess={(user) => {
        console.log('🎉 Privy onSuccess callback:', user.id);
      }}
      onError={(error) => {
        console.error('💥 Privy onError callback:', error);
      }}
    >
      {children}
    </PrivyProvider>
  );
};

export default WorkingPrivyProvider;
