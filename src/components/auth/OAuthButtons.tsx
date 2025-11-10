// src/components/auth/OAuthButtons.tsx - OAuth authentication buttons
import React, { useState } from 'react';
import { useAuth } from '../../lib/auth/context';
import type { OAuthProvider } from '../../lib/auth/types';
import { LoadingSpinner } from './LoadingSpinner';

interface OAuthButtonsProps {
  onSuccess: (message?: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface OAuthProviderConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
}

const OAUTH_PROVIDERS: Record<OAuthProvider, OAuthProviderConfig> = {
  google: {
    name: 'Google',
    color: 'bg-white text-gray-900 border-gray-300',
    hoverColor: 'hover:bg-gray-50',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    )
  },
  github: {
    name: 'GitHub',
    color: 'bg-gray-900 text-white border-gray-700',
    hoverColor: 'hover:bg-gray-800',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    )
  },
  apple: {
    name: 'Apple',
    color: 'bg-black text-white border-gray-800',
    hoverColor: 'hover:bg-gray-900',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    )
  }
};

export function OAuthButtons({ onSuccess, onError, disabled }: OAuthButtonsProps) {
  const { signInWithOAuth, isLoading } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    if (disabled || isLoading || loadingProvider) {
      return;
    }

    setLoadingProvider(provider);

    try {
      const result = await signInWithOAuth(provider);
      
      if (result?.url) {
        // Redirect to OAuth provider
        window.location.href = result.url;
      } else {
        onError(`Failed to initiate ${OAUTH_PROVIDERS[provider].name} authentication`);
      }
    } catch (error) {
      console.error(`${provider} OAuth error:`, error);
      
      // Import error handling utilities
      const { mapSupabaseError } = await import('../../lib/auth/errors');
      const authError = mapSupabaseError(error);
      
      onError(authError.userMessage || `${OAUTH_PROVIDERS[provider].name} authentication failed`);
    } finally {
      setLoadingProvider(null);
    }
  };

  const isButtonDisabled = disabled || isLoading;

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Google OAuth */}
      <button
        onClick={() => handleOAuthSignIn('google')}
        disabled={isButtonDisabled}
        className={`w-full flex items-center justify-center px-4 py-3 sm:py-2 border rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-base sm:text-sm ${OAUTH_PROVIDERS.google.color} ${OAUTH_PROVIDERS.google.hoverColor}`}
      >
        {loadingProvider === 'google' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            {OAUTH_PROVIDERS.google.icon}
            <span className="ml-2">Continue with Google</span>
          </>
        )}
      </button>

      {/* GitHub OAuth */}
      <button
        onClick={() => handleOAuthSignIn('github')}
        disabled={isButtonDisabled}
        className={`w-full flex items-center justify-center px-4 py-3 sm:py-2 border rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-base sm:text-sm ${OAUTH_PROVIDERS.github.color} ${OAUTH_PROVIDERS.github.hoverColor}`}
      >
        {loadingProvider === 'github' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            {OAUTH_PROVIDERS.github.icon}
            <span className="ml-2">Continue with GitHub</span>
          </>
        )}
      </button>

      {/* Apple OAuth (optional - can be enabled later) */}
      {/* 
      <button
        onClick={() => handleOAuthSignIn('apple')}
        disabled={isButtonDisabled}
        className={`w-full flex items-center justify-center px-4 py-2 border rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed ${OAUTH_PROVIDERS.apple.color} ${OAUTH_PROVIDERS.apple.hoverColor}`}
      >
        {loadingProvider === 'apple' ? (
          <LoadingSpinner size="sm" />
        ) : (
          <>
            {OAUTH_PROVIDERS.apple.icon}
            <span className="ml-2">Continue with Apple</span>
          </>
        )}
      </button>
      */}
    </div>
  );
}