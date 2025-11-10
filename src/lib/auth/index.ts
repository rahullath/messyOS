// src/lib/auth/index.ts - Authentication service infrastructure exports
export * from './types';
export * from './config';
export * from './service';
export { AuthProvider, useAuth, useRequireAuth, useTokens, AuthContext } from './context';

// Re-export commonly used items for convenience
export { authService as default } from './service';
export { authClient } from './config';