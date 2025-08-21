// src/components/auth/PrivyTestComponent.tsx - Simple Privy Test Component
import React, { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const PrivyTestComponent: React.FC = () => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [tokenBalance, setTokenBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch token balance
  const fetchTokenBalance = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/tokens/balance?privy_user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setTokenBalance(data.balance);
      } else {
        setError(`Token balance error: ${data.error}`);
      }
    } catch (error: any) {
      setError(`Failed to fetch balance: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch balance when user logs in
  useEffect(() => {
    if (authenticated && user) {
      fetchTokenBalance();
    }
  }, [authenticated, user]);

  const cardStyle: React.CSSProperties = {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1rem',
    padding: '2rem',
    marginBottom: '2rem',
  };

  const buttonStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    margin: '0.5rem',
  };

  const successStyle: React.CSSProperties = {
    ...cardStyle,
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  };

  const errorStyle: React.CSSProperties = {
    ...cardStyle,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  };

  const loadingStyle: React.CSSProperties = {
    ...cardStyle,
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  };

  // Loading state
  if (!ready) {
    return (
      <div style={loadingStyle}>
        <h2>🔄 Initializing Privy...</h2>
        <p>Setting up wallet authentication...</p>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return (
      <div>
        <div style={successStyle}>
          <h2>✅ Privy Ready!</h2>
          <p>Privy has been initialized successfully. You can now login with:</p>
          <ul>
            <li>📧 Email address</li>
            <li>🔗 Connect an existing wallet</li>
            <li>🏦 Social authentication (Google, etc.)</li>
          </ul>
          <button style={buttonStyle} onClick={login}>
            🚀 Login with Privy
          </button>
        </div>
        
        <div style={cardStyle}>
          <h3>How it works:</h3>
          <ol>
            <li>Click "Login with Privy" above</li>
            <li>Choose your authentication method</li>
            <li>Privy will create an embedded wallet for you automatically</li>
            <li>You'll receive ₹500 starting credit in your account</li>
            <li>Start using meshOS with Web3 authentication!</li>
          </ol>
        </div>
      </div>
    );
  }

  // Authenticated
  return (
    <div>
      <div style={successStyle}>
        <h2>🎉 Login Successful!</h2>
        <p>You are now authenticated with Privy</p>
        <button style={buttonStyle} onClick={logout}>
          👋 Logout
        </button>
      </div>

      <div style={cardStyle}>
        <h3>👤 User Information</h3>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.3)', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          fontFamily: 'monospace',
          fontSize: '0.9rem'
        }}>
          <p><strong>Privy ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.linkedAccounts?.find(acc => acc.type === 'email')?.address || 'Not linked'}</p>
          <p><strong>Phone:</strong> {user.linkedAccounts?.find(acc => acc.type === 'phone')?.address || 'Not linked'}</p>
          <p><strong>Wallets Connected:</strong> {wallets.length}</p>
          <p><strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}</p>
          <p><strong>Has Embedded Wallet:</strong> {wallets.some(w => w.walletClientType === 'privy') ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>

      <div style={cardStyle}>
        <h3>💎 Token Balance</h3>
        {loading && <p>Loading balance...</p>}
        {error && (
          <div style={errorStyle}>
            <p>❌ {error}</p>
          </div>
        )}
        {tokenBalance && (
          <div style={{ 
            background: 'rgba(6, 182, 212, 0.1)', 
            padding: '1rem', 
            borderRadius: '0.5rem',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <p><strong>Current Balance:</strong> ₹{(tokenBalance.balance / 100).toFixed(0)} ({tokenBalance.balance} tokens)</p>
            <p><strong>Total Earned:</strong> ₹{(tokenBalance.total_earned / 100).toFixed(0)}</p>
            <p><strong>Total Spent:</strong> ₹{(tokenBalance.total_spent / 100).toFixed(0)}</p>
          </div>
        )}
        <button style={buttonStyle} onClick={fetchTokenBalance} disabled={loading}>
          🔄 {loading ? 'Loading...' : 'Refresh Balance'}
        </button>
      </div>

      <div style={cardStyle}>
        <h3>🔗 Wallet Information</h3>
        {wallets.length === 0 ? (
          <p>No wallets connected</p>
        ) : (
          wallets.map((wallet, index) => (
            <div key={index} style={{ 
              background: 'rgba(0, 0, 0, 0.3)', 
              padding: '1rem', 
              borderRadius: '0.5rem',
              marginBottom: '0.5rem',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}>
              <p><strong>Type:</strong> {wallet.walletClientType}</p>
              <p><strong>Address:</strong> {wallet.address}</p>
              <p><strong>Connector:</strong> {wallet.connectorType}</p>
              {wallet.walletClientType === 'privy' && (
                <p style={{ color: '#22c55e' }}>✅ This is your embedded Privy wallet</p>
              )}
            </div>
          ))
        )}
      </div>

      <div style={cardStyle}>
        <h3>🧪 Next Steps</h3>
        <p>Your Privy authentication is working! You can now:</p>
        <ul>
          <li>✅ Access the full meshOS dashboard</li>
          <li>✅ Use your embedded wallet for transactions</li>
          <li>✅ Earn and spend tokens throughout the app</li>
          <li>✅ Connect additional external wallets if needed</li>
        </ul>
        <div style={{ marginTop: '1rem' }}>
          <a href="/auth-test" style={{ ...buttonStyle, textDecoration: 'none', display: 'inline-block' }}>
            📊 Full Auth Test Page
          </a>
          <a href="/dashboard" style={{ ...buttonStyle, textDecoration: 'none', display: 'inline-block' }}>
            🏠 Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default PrivyTestComponent;