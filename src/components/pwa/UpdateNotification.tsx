// src/components/pwa/UpdateNotification.tsx - PWA update notification component
import React, { useState, useEffect } from 'react';
import { pwaService } from '../../lib/pwa/service-worker';

interface UpdateNotificationProps {
  className?: string;
}

export function UpdateNotification({ className = '' }: UpdateNotificationProps) {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setShowUpdate(true);
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      await pwaService.updateServiceWorker();
      // The page will reload automatically after update
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-slate-800 border border-slate-700 rounded-lg shadow-lg p-4 z-50 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white">
              Update Available
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              A new version of MessyOS is ready to install.
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Dismiss update notification"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="mt-4 flex space-x-3">
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="flex-1 bg-cyan-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center"
        >
          {isUpdating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </>
          ) : (
            'Update Now'
          )}
        </button>
        
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-gray-400 text-sm font-medium hover:text-white transition-colors min-h-[44px] flex items-center justify-center"
        >
          Later
        </button>
      </div>
    </div>
  );
}