// src/lib/auth/config.ts - Enhanced Supabase client configuration with proper auth settings
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';
import type { AuthConfig, SessionStorage } from './types';

// Environment variables - support both Vite (import.meta.env) and Node.js (process.env)
// Note: In Node.js test scripts, dotenv must be loaded before importing this module
let supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
  ? import.meta.env.PUBLIC_SUPABASE_URL 
  : process.env.PUBLIC_SUPABASE_URL;

let supabaseKey = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  : process.env.PUBLIC_SUPABASE_ANON_KEY;

// Standard session storage (no manual cookie sync - handled by session-sync.ts)
const createSessionStorage = (): SessionStorage => {
  return {
    getItem: (key: string) => {
      if (typeof window === 'undefined') return null;
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        console.warn('Failed to get item from localStorage:', error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        console.warn('Failed to set item in localStorage:', error);
      }
    },
    removeItem: (key: string) => {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to remove item from localStorage:', error);
      }
    }
  };
};

// Get redirect URL based on environment
const getRedirectURL = (): string => {
  if (typeof window === 'undefined') {
    const isProd = typeof import.meta !== 'undefined' && import.meta.env 
      ? import.meta.env.PROD 
      : process.env.NODE_ENV === 'production';
    
    return isProd
      ? 'https://messy-os.vercel.app/auth/callback'
      : 'http://localhost:4321/auth/callback';
  }
  
  const isDev = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) 
    || window.location.hostname === 'localhost';
  
  return isDev 
    ? `${window.location.origin}/auth/callback`
    : 'https://messy-os.vercel.app/auth/callback';
};

// Default auth configuration
export const defaultAuthConfig: AuthConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'pkce',
  storage: createSessionStorage()
};

// Create enhanced Supabase client with proper auth settings
export const createAuthClient = (config: Partial<AuthConfig> = {}) => {
  // Re-check environment variables in case they were loaded after module initialization
  if (!supabaseUrl) {
    supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
      ? import.meta.env.PUBLIC_SUPABASE_URL 
      : process.env.PUBLIC_SUPABASE_URL;
  }
  if (!supabaseKey) {
    supabaseKey = typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.PUBLIC_SUPABASE_ANON_KEY
      : process.env.PUBLIC_SUPABASE_ANON_KEY;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
  }

  const authConfig = { ...defaultAuthConfig, ...config };
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      flowType: authConfig.flowType,
      autoRefreshToken: authConfig.autoRefreshToken,
      detectSessionInUrl: authConfig.detectSessionInUrl,
      persistSession: authConfig.persistSession,
      storage: authConfig.storage,
    },
    global: {
      headers: {
        'X-Client-Info': 'meshos-auth-client'
      }
    }
  });
};

// Default auth client instance (lazy-loaded)
let _authClient: ReturnType<typeof createAuthClient> | null = null;
export const authClient = new Proxy({} as ReturnType<typeof createAuthClient>, {
  get(target, prop) {
    if (!_authClient) {
      _authClient = createAuthClient();
    }
    return (_authClient as any)[prop];
  }
});

// Initialize session and setup sync on client-side
if (typeof window !== 'undefined') {
  // Setup enhanced auth state sync first
  import('./session-sync').then(({ setupAuthStateSync }) => {
    setupAuthStateSync();
  });

  // Check for existing session on page load
  authClient.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.warn('Session initialization error:', error.message);
    } else if (session) {
      console.log('✅ Found existing session for:', session.user.email);
      // The auth state sync will handle the server sync automatically
    } else {
      console.log('🔄 No existing session found');
    }
  });
}

// Export configuration constants
export const AUTH_CONSTANTS = {
  REDIRECT_URL: getRedirectURL(),
  SESSION_REFRESH_MARGIN: 60, // seconds before expiry to refresh
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // milliseconds
  TOKEN_STORAGE_KEY: 'supabase.auth.token',
  USER_STORAGE_KEY: 'supabase.auth.user'
} as const;

// OAuth provider configurations
export const OAUTH_PROVIDERS = {
  google: {
    name: 'Google',
    icon: 'google',
    scopes: 'openid email profile'
  },
  github: {
    name: 'GitHub', 
    icon: 'github',
    scopes: 'user:email'
  },
  apple: {
    name: 'Apple',
    icon: 'apple',
    scopes: 'name email'
  }
} as const;