// src/components/auth/RealPrivyProvider.tsx - Real Privy Authentication Provider
// Uses actual @privy-io/react-auth with your API keys

import React, { useEffect, useState } from 'react';
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';

interface RealPrivyWrapperProps {
  children: React.ReactNode;
}

// Real Privy configuration using your environment variables
export const RealPrivyWrapper: React.FC<RealPrivyWrapperProps> = ({ children }) => {
  const appId = import.meta.env.PUBLIC_PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center', 
        background: '#1f2937', 
        color: '#ef4444',
        borderRadius: '0.5rem',
        margin: '2rem'
      }}>
        <h3>⚠️ Privy Configuration Missing</h3>
        <p>Please add NEXT_PUBLIC_PRIVY_APP_ID to your environment variables.</p>
        <pre style={{ background: '#374151', padding: '1rem', borderRadius: '0.25rem', marginTop: '1rem' }}>
          NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
        </pre>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Login methods
        loginMethods: ['email', 'wallet', 'google'],
        
        // Appearance
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
          logo: 'https://your-domain.com/logo.png', // Optional: Add your logo
        },
        
        // Embedded wallets
        embeddedWallets: {
          createOnLogin: 'users-without-wallets', // Create wallet for users who don't have one
          requireUserPasswordOnCreate: false, // Simplified UX
          noPromptOnSignature: false, // Allow user to approve signatures
        },
        
        // Legal config
        legal: {
          termsAndConditionsUrl: 'https://your-domain.com/terms',
          privacyPolicyUrl: 'https://your-domain.com/privacy',
        },
      }}
      onSuccess={(user) => {
        console.log('Privy login successful:', user);
        // Sync user with your backend
        syncUserWithBackend(user);
      }}
      onError={(error) => {
        console.error('Privy error:', error);
      }}
    >
      <PrivyAuthManager>
        {children}
      </PrivyAuthManager>
    </PrivyProvider>
  );
};

// Component to manage authentication state and sync with backend
const PrivyAuthManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [syncComplete, setSyncComplete] = useState(false);

  // Sync user with backend when they login
  useEffect(() => {
    if (ready && authenticated && user && !syncComplete) {
      syncUserWithBackend(user);
    }
  }, [ready, authenticated, user, syncComplete]);

  // Function to sync user data with your backend
  const syncUserWithBackend = async (privyUser: any) => {
    try {
      const accessToken = await getAccessToken();
      
      // Extract user information
      const email = privyUser.linkedAccounts?.find((account: any) => account.type === 'email')?.address;
      const phone = privyUser.linkedAccounts?.find((account: any) => account.type === 'phone')?.address;
      const walletAddress = wallets[0]?.address;

      // Sync with your backend
      const response = await fetch('/api/auth/privy-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          user: {
            id: privyUser.id,
            email,
            phone,
            walletAddress,
            linkedAccounts: privyUser.linkedAccounts || []
          },
          token: accessToken
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('User synced with backend:', data);
        setSyncComplete(true);
        
        // Store token balance and other data in localStorage for quick access
        if (data.tokenBalance) {
          localStorage.setItem('meshOS_tokenBalance', JSON.stringify(data.tokenBalance));
        }
      } else {
        console.error('Failed to sync user with backend:', data.error);
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
    }
  };

  // Show loading state while Privy initializes
  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: 'white',
        flexDirection: 'column'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(6, 182, 212, 0.3)',
          borderTop: '4px solid #06b6d4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem', opacity: 0.8 }}>Initializing Privy...</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return <>{children}</>;
};

// Custom hooks for easier access to Privy functionality
export const usePrivyAuth = () => {
  const privy = usePrivy();
  const { wallets } = useWallets();
  const [tokenBalance, setTokenBalance] = useState<any>(null);

  // Load token balance from localStorage or fetch from API
  useEffect(() => {
    if (privy.authenticated && privy.user) {
      const storedBalance = localStorage.getItem('meshOS_tokenBalance');
      if (storedBalance) {
        setTokenBalance(JSON.parse(storedBalance));
      } else {
        fetchTokenBalance();
      }
    }
  }, [privy.authenticated, privy.user]);

  const fetchTokenBalance = async () => {
    if (!privy.user) return;
    
    try {
      const response = await fetch(`/api/tokens/balance?privy_user_id=${privy.user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setTokenBalance(data.balance);
        localStorage.setItem('meshOS_tokenBalance', JSON.stringify(data.balance));
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    }
  };

  const refreshTokenBalance = async () => {
    await fetchTokenBalance();
  };

  return {
    ...privy,
    wallets,
    tokenBalance,
    refreshTokenBalance,
    embeddedWallet: wallets.find(wallet => wallet.walletClientType === 'privy'),
  };
};

export { useWallets } from '@privy-io/react-auth';