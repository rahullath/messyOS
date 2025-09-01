// src/components/auth/ErrorMessage.tsx - Enhanced error message component with recovery options
import React, { useState } from 'react';
import { mapSupabaseError, getRecoverySuggestions, isRetryableError } from '../../lib/auth/errors';
import type { AuthError } from '../../lib/auth/errors';
import { LoadingSpinner } from './LoadingSpinner';

interface ErrorMessageProps {
  message: string;
  error?: AuthError | Error | any;
  className?: string;
  showSuggestions?: boolean;
  onRetry?: () => Promise<void> | void;
  retryLabel?: string;
  showDetails?: boolean;
}

export function ErrorMessage({ 
  message, 
  error,
  className = '',
  showSuggestions = true,
  onRetry,
  retryLabel = 'Try Again',
  showDetails = false
}: ErrorMessageProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  // Convert error to AuthError format if needed
  const authError = error ? mapSupabaseError(error) : null;
  const suggestions = authError && showSuggestions ? getRecoverySuggestions(authError) : [];
  const canRetry = authError ? isRetryableError(authError) : false;

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorIcon = () => {
    if (authError?.code === 'NETWORK_ERROR') {
      return (
        <svg className="w-5 h-5 text-orange-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      );
    }
    
    if (authError?.code === 'TOO_MANY_REQUESTS') {
      return (
        <svg className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getErrorColor = () => {
    if (authError?.code === 'NETWORK_ERROR') {
      return 'bg-orange-900/20 border-orange-500/30';
    }
    
    if (authError?.code === 'TOO_MANY_REQUESTS') {
      return 'bg-yellow-900/20 border-yellow-500/30';
    }

    return 'bg-red-900/20 border-red-500/30';
  };

  const getTextColor = () => {
    if (authError?.code === 'NETWORK_ERROR') {
      return 'text-orange-300';
    }
    
    if (authError?.code === 'TOO_MANY_REQUESTS') {
      return 'text-yellow-300';
    }

    return 'text-red-300';
  };

  return (
    <div className={`${getErrorColor()} rounded-lg p-4 mb-4 ${className}`}>
      {/* Main Error Message */}
      <div className="flex items-start">
        {getErrorIcon()}
        <div className="flex-1">
          <p className={`text-sm ${getTextColor()}`}>
            {authError?.userMessage || message}
          </p>
          
          {/* Recovery Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-400 mb-2">Try these solutions:</p>
              <ul className="space-y-1">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="text-xs text-gray-400 flex items-start">
                    <span className="text-cyan-400 mr-2 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-3">
            {canRetry && onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 rounded hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? (
                  <>
                    <LoadingSpinner size="xs" />
                    <span className="ml-1">Retrying...</span>
                  </>
                ) : (
                  retryLabel
                )}
              </button>
            )}

            {/* Password Reset Link for Auth Errors */}
            {authError?.code === 'INVALID_CREDENTIALS' && (
              <a
                href="/reset-password"
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Reset Password
              </a>
            )}

            {/* Contact Support Link */}
            {!authError?.recoverable && (
              <a
                href="/support"
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Contact Support
              </a>
            )}
          </div>

          {/* Technical Details (Development/Debug) */}
          {showDetails && authError && (
            <div className="mt-3">
              <button
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
              >
                {showFullDetails ? 'Hide' : 'Show'} Technical Details
              </button>
              
              {showFullDetails && (
                <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-600">
                  <div className="text-xs text-gray-400 space-y-1">
                    <div><strong>Code:</strong> {authError.code}</div>
                    <div><strong>Message:</strong> {authError.message}</div>
                    <div><strong>Retryable:</strong> {authError.retryable ? 'Yes' : 'No'}</div>
                    <div><strong>Recoverable:</strong> {authError.recoverable ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}