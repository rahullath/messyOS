// src/components/auth/SimplePrivyAuth.tsx - Simple Privy Login Modal
import React from 'react';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

// Simple Login Component
const LoginComponent: React.FC = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const styles = {
    container: {
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center' as const,
    },
    card: {
      background: 'rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '1rem',
      padding: '2rem',
      marginBottom: '2rem',
    },
    button: {
      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
      color: 'white',
      border: 'none',
      padding: '1rem 2rem',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      fontSize: '1.1rem',
      fontWeight: 'bold',
    },
    successCard: {
      background: 'rgba(34, 197, 94, 0.1)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '1rem',
      padding: '2rem',
      marginBottom: '2rem',
    }
  };

  if (!ready) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2>🔄 Loading...</h2>
          <p>Initializing Privy authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1>🔐 Welcome to MeshOS</h1>
          <p>Sign in to access your dashboard and start earning tokens!</p>
          
          <button style={styles.button} onClick={login}>
            Sign In
          </button>
          
          <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.8 }}>
            <p>You can sign in with:</p>
            <p>📧 Email • 🔗 Google • 🐙 GitHub • 💳 Wallet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.successCard}>
        <h1>🎉 Welcome back!</h1>
        <p>You're successfully signed in to MeshOS</p>
        
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          textAlign: 'left' as const
        }}>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.linkedAccounts?.find(acc => acc.type === 'email')?.address || 'Not provided'}</p>
          <p><strong>Signed in:</strong> {new Date().toLocaleString()}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <button style={styles.button} onClick={() => window.location.href = '/dashboard'}>
            🏠 Go to Dashboard
          </button>
          <button 
            style={{ ...styles.button, background: '#6b7280' }} 
            onClick={logout}
          >
            👋 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component with Provider
interface SimplePrivyAuthProps {
  appId: string;
}

const SimplePrivyAuth: React.FC<SimplePrivyAuthProps> = ({ appId }) => {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        // Just the login methods you want - no wallet complexity
        loginMethods: ['email', 'google', 'github'],
        
        // Clean appearance
        appearance: {
          theme: 'dark',
          accentColor: '#06b6d4',
          logo: undefined, // Use default
        },
        
        // Simple embedded wallet (just for user experience, not blockchain)
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
          noPromptOnSignature: true,
        },
        
        // Legal (update these URLs to your actual terms/privacy pages)
        legal: {
          termsAndConditionsUrl: 'https://your-domain.com/terms',
          privacyPolicyUrl: 'https://your-domain.com/privacy',
        },
      }}
      onSuccess={(user) => {
        console.log('✅ User signed in:', user.id);
        // You can add backend sync here if needed
      }}
      onError={(error) => {
        console.error('❌ Privy error:', error);
        // Handle errors gracefully
      }}
    >
      <LoginComponent />
    </PrivyProvider>
  );
};

export default SimplePrivyAuth;