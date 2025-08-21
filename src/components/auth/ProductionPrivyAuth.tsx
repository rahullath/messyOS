// src/components/auth/ProductionPrivyAuth.tsx - Production-ready Privy Auth with Migration
import React, { useEffect, useState } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';

interface ProductionAuthProps {
  children: React.ReactNode;
}

// Migration status for existing users
interface MigrationStatus {
  needsMigration: boolean;
  alreadyLinked: boolean;
  userExists: boolean;
  isChecking: boolean;
}

// Production Privy configuration
export const ProductionPrivyAuth: React.FC<ProductionAuthProps> = ({ children }) => {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center p-8 bg-red-900/20 border border-red-500 rounded-lg max-w-md">
          <h3 className="text-xl font-bold text-red-400 mb-4">⚠️ Configuration Error</h3>
          <p className="text-gray-300 mb-4">Privy authentication is not configured.</p>
          <code className="block bg-gray-800 p-3 rounded text-sm text-green-400">
            PUBLIC_PRIVY_APP_ID=your_app_id
          </code>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Prioritize email and social login
        loginMethods: ['email', 'google', 'wallet'],
        
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
          logo: '/favicon.svg',
          showWalletLoginFirst: false,
          walletChainType: 'ethereum-only'
        },
        
        // Wallets are optional - only create if user requests
        embeddedWallets: {
          createOnLogin: 'off',
          requireUserPasswordOnCreate: true,
          noPromptOnSignature: false,
        },
        
        // Additional configuration
        mfa: {
          noPromptOnMfaRequired: false,
        },
        
        // Legal requirements
        legal: {
          termsAndConditionsUrl: '/terms',
          privacyPolicyUrl: '/privacy',
        },
      }}
      onSuccess={(user) => {
        console.log('Privy login successful:', user);
      }}
      onError={(error) => {
        console.error('Privy auth error:', error);
      }}
    >
      <AuthManager>
        {children}
      </AuthManager>
    </PrivyProvider>
  );
};

// Auth manager handles login flow and migration
const AuthManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready, authenticated, user, getAccessToken, login } = usePrivy();
  const { wallets } = useWallets();
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    needsMigration: false,
    alreadyLinked: false,
    userExists: false,
    isChecking: false
  });
  const [syncComplete, setSyncComplete] = useState(false);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

  // Check migration status when user authenticates
  useEffect(() => {
    if (ready && authenticated && user && !syncComplete) {
      checkMigrationAndSync();
    }
  }, [ready, authenticated, user, syncComplete]);

  const checkMigrationAndSync = async () => {
    try {
      const email = user?.linkedAccounts?.find(account => account.type === 'email')?.address;
      
      if (email) {
        // Check if user needs migration
        const response = await fetch(`/api/auth/migrate-user?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success) {
          setMigrationStatus({
            needsMigration: data.needsMigration,
            alreadyLinked: data.alreadyLinked,
            userExists: data.userExists,
            isChecking: false
          });

          if (data.needsMigration) {
            setShowMigrationPrompt(true);
            return; // Don't sync until migration is handled
          }
        }
      }

      // Proceed with normal sync
      await syncUserWithBackend();
    } catch (error) {
      console.error('Error checking migration status:', error);
      // Proceed with sync anyway
      await syncUserWithBackend();
    }
  };

  const handleMigration = async () => {
    try {
      setMigrationStatus(prev => ({ ...prev, isChecking: true }));
      
      const email = user?.linkedAccounts?.find(account => account.type === 'email')?.address;
      const phone = user?.linkedAccounts?.find(account => account.type === 'phone')?.address;
      const walletAddress = wallets[0]?.address;

      const response = await fetch('/api/auth/migrate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          privyUserId: user?.id,
          phone,
          walletAddress,
          linkedAccounts: user?.linkedAccounts || []
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Migration successful:', data.message);
        setShowMigrationPrompt(false);
        setMigrationStatus(prev => ({ 
          ...prev, 
          needsMigration: false, 
          alreadyLinked: true,
          isChecking: false 
        }));
        
        // Now sync the migrated user
        await syncUserWithBackend();
      } else {
        console.error('Migration failed:', data.error);
        setMigrationStatus(prev => ({ ...prev, isChecking: false }));
        // Show error to user
        alert(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStatus(prev => ({ ...prev, isChecking: false }));
      alert('Migration failed. Please try again.');
    }
  };

  const syncUserWithBackend = async () => {
    try {
      const accessToken = await getAccessToken();
      const email = user?.linkedAccounts?.find(account => account.type === 'email')?.address;
      const phone = user?.linkedAccounts?.find(account => account.type === 'phone')?.address;
      const walletAddress = wallets[0]?.address;

      const response = await fetch('/api/auth/privy-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          user: {
            id: user?.id,
            email,
            phone,
            walletAddress,
            linkedAccounts: user?.linkedAccounts || []
          },
          token: accessToken
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('User synced successfully:', data);
        setSyncComplete(true);
        
        // Store user data for quick access
        if (data.tokenBalance) {
          localStorage.setItem('meshOS_tokenBalance', JSON.stringify(data.tokenBalance));
        }
        if (data.user) {
          localStorage.setItem('meshOS_user', JSON.stringify(data.user));
        }
      } else {
        console.error('Sync failed:', data.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  // Loading state while Privy initializes
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 animate-pulse">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Migration prompt for existing users
  if (showMigrationPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Account Migration</h3>
            <p className="text-gray-300 text-sm">
              We found an existing account with your email. Would you like to migrate your data to the new authentication system?
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleMigration}
              disabled={migrationStatus.isChecking}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {migrationStatus.isChecking ? (
                <span className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Migrating...
                </span>
              ) : (
                'Migrate My Account'
              )}
            </button>
            
            <button
              onClick={() => {
                setShowMigrationPrompt(false);
                syncUserWithBackend();
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Skip (Create New Account)
            </button>
          </div>
          
          <p className="text-xs text-gray-400 text-center mt-4">
            Migrating will preserve your existing data and settings.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Export the main component
export default ProductionPrivyAuth;