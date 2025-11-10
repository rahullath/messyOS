// src/components/layout/MobileLayout.tsx - Mobile-optimized layout component
import React, { useState, useEffect } from 'react';
import { InstallPrompt, UpdateNotification } from '../pwa';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export function MobileLayout({ 
  children, 
  title, 
  showBackButton = false, 
  onBack,
  className = '' 
}: MobileLayoutProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Show install prompt after delay if not standalone
    if (!standalone) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className={`min-h-screen bg-slate-900 flex flex-col ${className}`}>
      {/* Status bar spacer for iOS */}
      {isStandalone && (
        <div className="h-safe-top bg-slate-900" style={{ paddingTop: 'env(safe-area-inset-top)' }} />
      )}

      {/* Header */}
      {(title || showBackButton) && (
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Go back"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {title && (
              <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
            )}
          </div>
          
          {/* Header actions can be added here */}
          <div className="flex items-center space-x-2">
            {/* Placeholder for header actions */}
          </div>
        </header>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Install prompt */}
      {showInstallPrompt && !isStandalone && (
        <div className="p-4">
          <InstallPrompt className="mb-4" />
        </div>
      )}

      {/* Update notification */}
      <UpdateNotification />

      {/* Bottom safe area for iOS */}
      {isStandalone && (
        <div className="h-safe-bottom bg-slate-900" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      )}
    </div>
  );
}

// Mobile-specific auth layout
export function MobileAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileLayout className="justify-center items-center p-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </MobileLayout>
  );
}

// Mobile navigation component
interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface MobileNavigationProps {
  items: MobileNavItem[];
  className?: string;
}

export function MobileNavigation({ items, className = '' }: MobileNavigationProps) {
  return (
    <nav className={`bg-slate-800/50 backdrop-blur-sm border-t border-slate-700 px-2 py-1 ${className}`}>
      <div className="flex justify-around">
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 min-w-[60px] min-h-[60px] rounded-lg transition-colors ${
              item.active 
                ? 'text-cyan-400 bg-cyan-400/10' 
                : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <div className="w-6 h-6 mb-1">
              {item.icon}
            </div>
            <span className="text-xs font-medium truncate max-w-full">
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}

// Touch-optimized button component
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function TouchButton({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}: TouchButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';
  
  const variantClasses = {
    primary: 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500',
    ghost: 'text-gray-400 hover:text-white hover:bg-slate-700/50 focus:ring-slate-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[48px]'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}