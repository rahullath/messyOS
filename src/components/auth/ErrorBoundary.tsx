// src/components/auth/ErrorBoundary.tsx - Error boundary for graceful failure handling
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { mapSupabaseError, getRecoverySuggestions } from '../../lib/auth/errors';
import type { AuthError } from '../../lib/auth/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: AuthError, retry: () => void) => ReactNode;
  onError?: (error: AuthError, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: AuthError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const authError = mapSupabaseError(error);
    return {
      hasError: true,
      error: authError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const authError = mapSupabaseError(error);
    
    this.setState({
      errorInfo
    });

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', {
      error: authError,
      errorInfo,
      componentStack: errorInfo.componentStack
    });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(authError, errorInfo);
    }

    // Report to error tracking service (if available)
    this.reportError(authError, errorInfo);
  }

  private reportError = (error: AuthError, errorInfo: ErrorInfo) => {
    // This would integrate with your error tracking service
    // For now, we'll just log it
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        error_code: error.code
      });
    }
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          retryCount={this.state.retryCount}
          maxRetries={this.maxRetries}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
          showDetails={this.props.showDetails}
          errorInfo={this.state.errorInfo}
        />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: AuthError;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
  showDetails?: boolean;
  errorInfo: ErrorInfo | null;
}

function DefaultErrorFallback({
  error,
  retryCount,
  maxRetries,
  onRetry,
  onReload,
  onGoHome,
  showDetails = false,
  errorInfo
}: DefaultErrorFallbackProps) {
  const suggestions = getRecoverySuggestions(error);
  const canRetry = retryCount < maxRetries && error.retryable;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Error Title */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-300 text-sm">
              {error.userMessage}
            </p>
          </div>

          {/* Recovery Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Try these solutions:</h3>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-400 flex items-start">
                    <span className="text-cyan-400 mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {canRetry && (
              <button
                onClick={onRetry}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors font-medium"
              >
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </button>
            )}
            
            <button
              onClick={onReload}
              className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors font-medium"
            >
              Reload Page
            </button>
            
            <button
              onClick={onGoHome}
              className="w-full px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-colors font-medium"
            >
              Go to Home
            </button>
          </div>

          {/* Error Details (Development) */}
          {showDetails && (
            <details className="mt-6">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-slate-900/50 rounded border border-slate-600">
                <div className="text-xs text-gray-400 space-y-2">
                  <div>
                    <strong>Error Code:</strong> {error.code}
                  </div>
                  <div>
                    <strong>Message:</strong> {error.message}
                  </div>
                  {errorInfo && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </details>
          )}

          {/* Support Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help?{' '}
              <a 
                href="/support" 
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook to manually trigger error boundary
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}