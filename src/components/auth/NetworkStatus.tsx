// src/components/auth/NetworkStatus.tsx - Network status indicator component
import React, { useState, useEffect } from 'react';
import { isOnline } from '../../lib/auth/retry';

interface NetworkStatusProps {
  onNetworkChange?: (isOnline: boolean) => void;
  showWhenOnline?: boolean;
}

export function NetworkStatus({ onNetworkChange, showWhenOnline = false }: NetworkStatusProps) {
  const [online, setOnline] = useState(isOnline());
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      onNetworkChange?.(true);
      
      // Show briefly when coming back online
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      setOnline(false);
      onNetworkChange?.(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show status initially if offline or if showWhenOnline is true
    setShowStatus(!online || showWhenOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onNetworkChange, showWhenOnline]);

  if (!showStatus) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      online 
        ? 'bg-green-900/20 border border-green-500/30 text-green-300' 
        : 'bg-red-900/20 border border-red-500/30 text-red-300'
    }`}>
      <div className="flex items-center space-x-2">
        {online ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            <span className="text-sm font-medium">Back online</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L5.636 18.364m12.728-12.728L18.364 18.364M12 12h.01" />
            </svg>
            <span className="text-sm font-medium">No internet connection</span>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to monitor network status
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}