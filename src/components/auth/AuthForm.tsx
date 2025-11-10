// src/components/auth/AuthForm.tsx - Multi-method authentication form
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth/context';
import { EmailPasswordForm } from './EmailPasswordForm';
import { OAuthButtons } from './OAuthButtons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { SuccessMessage } from './SuccessMessage';
import { PageTransition } from '../ui/LoadingStates';
import { SuccessAnimation, Toast } from '../ui/SuccessAnimations';
import { ErrorBoundary } from './ErrorBoundary';
import { NetworkStatus } from './NetworkStatus';

interface AuthFormProps {
  redirectTo?: string;
}

export function AuthForm({ redirectTo = '/dashboard' }: AuthFormProps) {
  const { user, isLoading, error, isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showToast, setShowToast] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, user, redirectTo]);

  // Clear local error when auth mode changes
  useEffect(() => {
    setLocalError(null);
    setSuccessMessage(null);
  }, [authMode]);

  const handleAuthSuccess = (message?: string) => {
    if (message) {
      setSuccessMessage(message);
    }
    setLocalError(null);
    setShowSuccessAnimation(true);
    setShowToast({ type: 'success', message: message || 'Authentication successful!' });
    
    // Redirect after showing success animation
    setTimeout(() => {
      window.location.href = redirectTo;
    }, 2000);
  };

  const handleAuthError = (errorMessage: string) => {
    setLocalError(errorMessage);
    setSuccessMessage(null);
    setShowToast({ type: 'error', message: errorMessage });
  };

  const displayError = localError || error;

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-8">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <NetworkStatus />
      
      {/* Toast Notifications */}
      {showToast && (
        <Toast
          type={showToast.type}
          message={showToast.message}
          onClose={() => setShowToast(null)}
          position="top-center"
        />
      )}
      
      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <SuccessAnimation
            type="checkmark"
            size="lg"
            message="Welcome to MessyOS!"
            onComplete={() => setShowSuccessAnimation(false)}
          />
        </div>
      )}
      
      <PageTransition isLoading={isLoading}>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-4 sm:p-6 md:p-8 max-w-md mx-auto w-full touch-manipulation">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 leading-tight">
          {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-sm sm:text-base text-gray-400 px-2 leading-relaxed">
          {authMode === 'signin' 
            ? 'Sign in to continue your optimization journey'
            : 'Start your 30-day free trial with 4800 tokens'
          }
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <SuccessMessage message={successMessage} />
      )}

      {/* Error Message */}
      {displayError && (
        <ErrorMessage 
          message={displayError} 
          error={error}
          showSuggestions={true}
          onRetry={() => window.location.reload()}
          retryLabel="Refresh Page"
        />
      )}

      {/* OAuth Buttons */}
      <OAuthButtons 
        onSuccess={handleAuthSuccess}
        onError={handleAuthError}
        disabled={isLoading}
      />

      {/* Divider */}
      <div className="relative my-4 sm:my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-600" />
        </div>
        <div className="relative flex justify-center text-xs sm:text-sm">
          <span className="px-2 sm:px-3 bg-slate-800 text-gray-400">Or continue with email</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <EmailPasswordForm
        mode={authMode}
        onSuccess={handleAuthSuccess}
        onError={handleAuthError}
        disabled={isLoading}
      />

      {/* Mode Toggle */}
      <div className="mt-4 sm:mt-6 text-center">
        <button
          onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
          className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 active:text-cyan-200 transition-colors min-h-[44px] flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-lg hover:bg-slate-700/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800"
          disabled={isLoading}
        >
          {authMode === 'signin' 
            ? "Don't have an account? Sign up" 
            : 'Already have an account? Sign in'
          }
        </button>
      </div>

      {/* Additional Links */}
      <div className="mt-3 sm:mt-4 text-center space-y-2">
        <a 
          href="/reset-password" 
          className="block text-xs sm:text-sm text-gray-400 hover:text-white active:text-gray-300 transition-colors min-h-[44px] flex items-center justify-center px-4 py-2 rounded-lg hover:bg-slate-700/30 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-slate-800"
        >
          Forgot your password?
        </a>
        <div className="text-xs text-gray-500 px-2 leading-relaxed">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-cyan-400 hover:text-cyan-300 active:text-cyan-200 underline focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 rounded">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 active:text-cyan-200 underline focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 rounded">Privacy Policy</a>
        </div>
      </div>
        </div>
      </PageTransition>
    </ErrorBoundary>
  );
}