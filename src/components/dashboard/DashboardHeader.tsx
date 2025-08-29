// src/components/dashboard/DashboardHeader.tsx - Fixed Header with Glass Morphism
import React, { useState, useEffect } from 'react';

interface TokenBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface AIStatus {
  status: 'active' | 'processing' | 'idle';
  currentTask?: string;
}

export default function DashboardHeader() {
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus>({ status: 'idle' });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch token balance
  useEffect(() => {
    const fetchTokenBalance = async () => {
      try {
        const response = await fetch('/api/user/balance');
        const data = await response.json();
        if (data.success) {
          setTokenBalance(data);
        }
      } catch (error) {
        console.error('Failed to fetch token balance:', error);
      }
    };

    fetchTokenBalance();
    // Update balance every 30 seconds
    const interval = setInterval(fetchTokenBalance, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mock AI status updates (replace with real WebSocket connection)
  useEffect(() => {
    const updateAIStatus = () => {
      const statuses: AIStatus[] = [
        { status: 'idle' },
        { status: 'processing', currentTask: 'Analyzing habits' },
        { status: 'active', currentTask: 'Generating insights' }
      ];
      setAIStatus(statuses[Math.floor(Math.random() * statuses.length)]);
    };

    const interval = setInterval(updateAIStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTokenBalance = (balance: number) => {
    if (balance >= 1000) {
      return `₹${(balance / 100).toFixed(0)}`;
    }
    return `${balance} tokens`;
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 messy-card-glass border-b border-messy-border z-50">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left Section - Logo & AI Status */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-messy-primary to-messy-secondary rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm">M</span>
              </div>
              {!isMobile && (
                <span className="text-messy-primary font-bold text-xl">messyOS</span>
              )}
            </div>

            {/* AI Status Indicator */}
            <div className="flex items-center space-x-2 bg-messy-card-bg px-3 py-1.5 rounded-full border border-messy-border">
              <div className={`w-2 h-2 rounded-full ${
                aiStatus.status === 'active' ? 'bg-messy-success animate-pulse' :
                aiStatus.status === 'processing' ? 'bg-messy-warning animate-spin' :
                'bg-messy-muted'
              }`}></div>
              {!isMobile && (
                <span className="text-messy-secondary text-sm">
                  {aiStatus.status === 'active' ? '🧠 Active' :
                   aiStatus.status === 'processing' ? '⚡ Processing' :
                   '😴 Idle'}
                </span>
              )}
              {aiStatus.currentTask && !isMobile && (
                <span className="text-messy-muted text-xs">• {aiStatus.currentTask}</span>
              )}
            </div>
          </div>

          {/* Right Section - Token Balance & Profile */}
          <div className="flex items-center space-x-3">
            {/* Token Balance */}
            <div className="bg-messy-card-bg border border-messy-border rounded-lg px-3 py-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-messy-warning">💰</span>
                <span className="text-messy-primary font-medium">
                  {tokenBalance ? formatTokenBalance(tokenBalance.balance) : '---'}
                </span>
                {!isMobile && tokenBalance && (
                  <div className="text-messy-muted text-xs">
                    <span className="text-messy-success">+{tokenBalance.total_earned}</span>
                    <span className="mx-1">|</span>
                    <span className="text-messy-error">-{tokenBalance.total_spent}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Avatar */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-8 h-8 bg-gradient-to-br from-messy-secondary to-messy-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-200"
              >
                <span className="text-white font-medium text-sm">R</span>
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 top-12 w-64 messy-card-glass border border-messy-border rounded-xl shadow-xl py-2">
                  <div className="px-4 py-3 border-b border-messy-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-messy-secondary to-messy-primary rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">R</span>
                      </div>
                      <div>
                        <div className="text-messy-primary font-medium">Rahul</div>
                        <div className="text-messy-muted text-sm">Pro Member</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <a href="/profile" className="flex items-center px-4 py-2 text-messy-secondary hover:bg-messy-card-hover">
                      <span className="mr-3">👤</span>
                      Profile Settings
                    </a>
                    <a href="/analytics" className="flex items-center px-4 py-2 text-messy-secondary hover:bg-messy-card-hover">
                      <span className="mr-3">📊</span>
                      Analytics
                    </a>
                    <a href="/goals" className="flex items-center px-4 py-2 text-messy-secondary hover:bg-messy-card-hover">
                      <span className="mr-3">🎯</span>
                      Goals & Habits
                    </a>
                    <a href="/integrations" className="flex items-center px-4 py-2 text-messy-secondary hover:bg-messy-card-hover">
                      <span className="mr-3">🔗</span>
                      Integrations
                    </a>
                  </div>
                  
                  <div className="border-t border-messy-border py-1">
                    <button className="flex items-center w-full px-4 py-2 text-messy-error hover:bg-messy-card-hover">
                      <span className="mr-3">🚪</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            {isMobile && (
              <button className="text-messy-secondary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Click Outside Handler for Dropdowns */}
      {showProfileDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowProfileDropdown(false)}
        ></div>
      )}
    </>
  );
}