// src/components/pwa/InstallPrompt.tsx - PWA installation prompt component
import React, { useState, useEffect } from 'react';
import { pwaService } from '../../lib/pwa/service-worker';

interface InstallPromptProps {
  className?: string;
  showOnlyWhenInstallable?: boolean;
}

export function InstallPrompt({ className = '', showOnlyWhenInstallable = true }: InstallPromptProps) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const capabilities = pwaService.getCapabilities();
    setIsInstalled(capabilities.isInstalled);
    setIsInstallable(capabilities.isInstallable);

    // Listen for PWA events
    const handleInstallable = () => {
      setIsInstallable(true);
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await pwaService.promptInstall();
      if (success) {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't show if not installable and showOnlyWhenInstallable is true
  if (showOnlyWhenInstallable && !isInstallable) {
    return null;
  }

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if user dismissed
  if (!showPrompt && showOnlyWhenInstallable) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg p-4 shadow-lg ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">
              Install MessyOS
            </h3>
            <p className="mt-1 text-sm text-cyan-100">
              Add MessyOS to your home screen for quick access and offline functionality.
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-4 text-cyan-100 hover:text-white transition-colors"
          aria-label="Dismiss install prompt"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mt-4 flex space-x-3">
        <button
          onClick={handleInstall}
          disabled={isInstalling || !isInstallable}
          className="flex-1 bg-white text-cyan-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center"
        >
          {isInstalling ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Installing...
            </>
          ) : (
            'Install App'
          )}
        </button>
        
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-cyan-100 text-sm font-medium hover:text-white transition-colors min-h-[44px] flex items-center justify-center"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function InstallButton({ className = '' }: { className?: string }) {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const capabilities = pwaService.getCapabilities();
    setIsInstalled(capabilities.isInstalled);
    setIsInstallable(capabilities.isInstallable);

    const handleInstallable = () => setIsInstallable(true);
    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await pwaService.promptInstall();
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] ${className}`}
    >
      {isInstalling ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Installing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Install App
        </>
      )}
    </button>
  );
}