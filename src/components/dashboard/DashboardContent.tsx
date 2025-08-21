// src/components/dashboard/DashboardContent.tsx - Authenticated dashboard UI
import React from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

interface DashboardContentProps {
  children: React.ReactNode;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({ children }) => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [tokenBalance, setTokenBalance] = React.useState<any>(null);

  // Fetch token balance when user is authenticated
  React.useEffect(() => {
    if (authenticated && user) {
      const fetchBalance = async () => {
        try {
          const response = await fetch(`/api/tokens/balance?privy_user_id=${user.id}`);
          const data = await response.json();
          if (data.success) {
            setTokenBalance(data.balance);
          }
        } catch (error) {
          console.error('Error fetching token balance:', error);
        }
      };
      fetchBalance();
    }
  }, [authenticated, user]);

  // Show loading while Privy initializes
  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">M</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to MeshOS</h1>
            <p className="text-white/60">Connect your wallet to get started</p>
          </div>
          
          <button
            onClick={login}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-105"
          >
            Connect Wallet
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-white/40">
              Sign in with email, wallet, or social account
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show authenticated dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <span className="text-xl font-semibold text-primary">MeshOS</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            <a href="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-accent-primary/10 text-accent-primary">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Dashboard
            </a>
            
            <a href="/habits" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Habits
            </a>

            <a href="/ai-agent" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <span className="w-5 h-5 mr-3 text-lg">🤖</span>
              AI Agent
            </a>

            <a href="/analytics" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              Analytics
            </a>
            
            <a href="/tasks" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Tasks
            </a>
            
            <a href="/health" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
              </svg>
              Health
            </a>
            
            <a href="/finance" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
              </svg>
              Finance
            </a>
            
            <a href="/content" className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v14a3 3 0 01-3 3H5a3 3 0 01-3-3V5a1 1 0 011-1h4z"></path>
              </svg>
              Content
            </a>
          </nav>

          {/* User Section */}
          <div className="px-4 py-4 border-t border-border">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-surface-hover">
              <div className="w-8 h-8 bg-gradient-to-r from-accent-primary to-accent-purple rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.linkedAccounts?.find(acc => acc.type === 'email')?.address?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user?.linkedAccounts?.find(acc => acc.type === 'email')?.address?.split('@')[0] || 'Privy User'}
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-text-muted truncate">
                    {tokenBalance ? `₹${(tokenBalance.balance / 100).toFixed(0)}` : 'Loading...'}
                  </p>
                  <button
                    onClick={logout}
                    className="text-xs text-accent-error hover:text-accent-error/80 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-surface border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search MeshOS..."
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Token Balance Display */}
                <div className="flex items-center px-3 py-2 bg-accent-primary/10 text-accent-primary rounded-lg">
                  <span className="text-sm font-medium">
                    💎 ₹{tokenBalance ? (tokenBalance.balance / 100).toFixed(0) : '---'}
                  </span>
                </div>

                {/* Quick Add Button */}
                <button className="flex items-center px-3 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Quick Add
                </button>

                {/* Notifications */}
                <button className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5-5 5-5m-6 0H6l5 5-5 5"></path>
                  </svg>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-error rounded-full"></span>
                </button>

                {/* System Status */}
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-accent-success rounded-full"></div>
                  <span className="text-xs text-text-muted">All Systems Online</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardContent;