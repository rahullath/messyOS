// src/lib/auth/errors.ts - Enhanced error handling utilities for authentication
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js';

export interface AuthError {
  code: string;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  details?: any;
}

export interface NetworkError extends AuthError {
  isNetworkError: true;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Authentication error codes and their user-friendly messages
 */
export const AUTH_ERROR_CODES = {
  // Email/Password errors
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    userMessage: 'The email or password you entered is incorrect. Please check your credentials and try again.',
    recoverable: true,
    retryable: true
  },
  EMAIL_NOT_CONFIRMED: {
    code: 'EMAIL_NOT_CONFIRMED',
    message: 'Email not confirmed',
    userMessage: 'Please check your email and click the confirmation link before signing in.',
    recoverable: true,
    retryable: false
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User not found',
    userMessage: 'No account found with this email address. Would you like to create a new account?',
    recoverable: true,
    retryable: false
  },
  EMAIL_ALREADY_REGISTERED: {
    code: 'EMAIL_ALREADY_REGISTERED',
    message: 'Email already registered',
    userMessage: 'An account with this email already exists. Try signing in instead.',
    recoverable: true,
    retryable: false
  },
  WEAK_PASSWORD: {
    code: 'WEAK_PASSWORD',
    message: 'Password is too weak',
    userMessage: 'Please choose a stronger password with at least 8 characters, including uppercase, lowercase, and numbers.',
    recoverable: true,
    retryable: true
  },
  
  // OAuth errors
  OAUTH_CANCELLED: {
    code: 'OAUTH_CANCELLED',
    message: 'OAuth authentication cancelled',
    userMessage: 'Authentication was cancelled. Please try again if you want to sign in.',
    recoverable: true,
    retryable: true
  },
  OAUTH_PROVIDER_ERROR: {
    code: 'OAUTH_PROVIDER_ERROR',
    message: 'OAuth provider error',
    userMessage: 'There was an issue with the authentication provider. Please try again or use a different sign-in method.',
    recoverable: true,
    retryable: true
  },
  OAUTH_ACCESS_DENIED: {
    code: 'OAUTH_ACCESS_DENIED',
    message: 'OAuth access denied',
    userMessage: 'Access was denied by the authentication provider. Please grant the necessary permissions to continue.',
    recoverable: true,
    retryable: true
  },
  
  // Session errors
  SESSION_EXPIRED: {
    code: 'SESSION_EXPIRED',
    message: 'Session expired',
    userMessage: 'Your session has expired. Please sign in again to continue.',
    recoverable: true,
    retryable: false
  },
  INVALID_SESSION: {
    code: 'INVALID_SESSION',
    message: 'Invalid session',
    userMessage: 'Your session is invalid. Please sign in again.',
    recoverable: true,
    retryable: false
  },
  
  // Network errors
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network connection error',
    userMessage: 'Unable to connect to our servers. Please check your internet connection and try again.',
    recoverable: true,
    retryable: true
  },
  TIMEOUT_ERROR: {
    code: 'TIMEOUT_ERROR',
    message: 'Request timeout',
    userMessage: 'The request took too long to complete. Please try again.',
    recoverable: true,
    retryable: true
  },
  
  // Server errors
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    message: 'Internal server error',
    userMessage: 'Something went wrong on our end. Please try again in a few moments.',
    recoverable: true,
    retryable: true
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    userMessage: 'Our authentication service is temporarily unavailable. Please try again in a few minutes.',
    recoverable: true,
    retryable: true
  },
  
  // Rate limiting
  TOO_MANY_REQUESTS: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many requests',
    userMessage: 'Too many sign-in attempts. Please wait a few minutes before trying again.',
    recoverable: true,
    retryable: false
  },
  
  // Generic fallback
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    recoverable: true,
    retryable: true
  }
} as const;

/**
 * Map Supabase error codes to our standardized error format
 */
export function mapSupabaseError(error: SupabaseAuthError | Error | any): AuthError {
  // Handle network errors
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    return { ...AUTH_ERROR_CODES.NETWORK_ERROR, details: error };
  }
  
  // Handle timeout errors
  if (error.name === 'TimeoutError' || error.code === 'TIMEOUT_ERROR') {
    return { ...AUTH_ERROR_CODES.TIMEOUT_ERROR, details: error };
  }

  // Handle Supabase-specific errors
  if (error.message) {
    const message = error.message.toLowerCase();
    
    // Email/Password errors
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return { ...AUTH_ERROR_CODES.INVALID_CREDENTIALS, details: error };
    }
    
    if (message.includes('email not confirmed') || message.includes('confirm your email')) {
      return { ...AUTH_ERROR_CODES.EMAIL_NOT_CONFIRMED, details: error };
    }
    
    if (message.includes('user not found') || message.includes('no user found')) {
      return { ...AUTH_ERROR_CODES.USER_NOT_FOUND, details: error };
    }
    
    if (message.includes('user already registered') || message.includes('email already exists')) {
      return { ...AUTH_ERROR_CODES.EMAIL_ALREADY_REGISTERED, details: error };
    }
    
    if (message.includes('password') && (message.includes('weak') || message.includes('strength'))) {
      return { ...AUTH_ERROR_CODES.WEAK_PASSWORD, details: error };
    }
    
    // OAuth errors
    if (message.includes('oauth') && message.includes('cancelled')) {
      return { ...AUTH_ERROR_CODES.OAUTH_CANCELLED, details: error };
    }
    
    if (message.includes('oauth') && message.includes('access denied')) {
      return { ...AUTH_ERROR_CODES.OAUTH_ACCESS_DENIED, details: error };
    }
    
    if (message.includes('oauth') || message.includes('provider')) {
      return { ...AUTH_ERROR_CODES.OAUTH_PROVIDER_ERROR, details: error };
    }
    
    // Session errors
    if (message.includes('session') && message.includes('expired')) {
      return { ...AUTH_ERROR_CODES.SESSION_EXPIRED, details: error };
    }
    
    if (message.includes('session') && message.includes('invalid')) {
      return { ...AUTH_ERROR_CODES.INVALID_SESSION, details: error };
    }
    
    // Rate limiting
    if (message.includes('too many requests') || message.includes('rate limit')) {
      return { ...AUTH_ERROR_CODES.TOO_MANY_REQUESTS, details: error };
    }
    
    // Server errors
    if (message.includes('internal server error') || message.includes('500')) {
      return { ...AUTH_ERROR_CODES.SERVER_ERROR, details: error };
    }
    
    if (message.includes('service unavailable') || message.includes('503')) {
      return { ...AUTH_ERROR_CODES.SERVICE_UNAVAILABLE, details: error };
    }
  }

  // Fallback to unknown error
  return { 
    ...AUTH_ERROR_CODES.UNKNOWN_ERROR, 
    details: error,
    message: error.message || 'Unknown error occurred'
  };
}

/**
 * Create a network error with retry information
 */
export function createNetworkError(
  originalError: Error, 
  retryCount: number = 0, 
  maxRetries: number = 3
): NetworkError {
  return {
    ...AUTH_ERROR_CODES.NETWORK_ERROR,
    isNetworkError: true,
    retryCount,
    maxRetries,
    details: originalError
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: AuthError): boolean {
  return error.retryable && (
    error.code === 'NETWORK_ERROR' ||
    error.code === 'TIMEOUT_ERROR' ||
    error.code === 'SERVER_ERROR' ||
    error.code === 'SERVICE_UNAVAILABLE'
  );
}

/**
 * Check if an error is recoverable (user can take action)
 */
export function isRecoverableError(error: AuthError): boolean {
  return error.recoverable;
}

/**
 * Get recovery suggestions for an error
 */
export function getRecoverySuggestions(error: AuthError): string[] {
  const suggestions: string[] = [];
  
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      suggestions.push('Double-check your email and password');
      suggestions.push('Try using the "Forgot Password" link');
      suggestions.push('Make sure Caps Lock is off');
      break;
      
    case 'EMAIL_NOT_CONFIRMED':
      suggestions.push('Check your email inbox and spam folder');
      suggestions.push('Click the confirmation link in the email');
      suggestions.push('Request a new confirmation email if needed');
      break;
      
    case 'USER_NOT_FOUND':
      suggestions.push('Create a new account with this email');
      suggestions.push('Check if you used a different email address');
      break;
      
    case 'EMAIL_ALREADY_REGISTERED':
      suggestions.push('Try signing in instead of creating an account');
      suggestions.push('Use the "Forgot Password" link if you forgot your password');
      break;
      
    case 'NETWORK_ERROR':
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Disable VPN if you\'re using one');
      break;
      
    case 'TOO_MANY_REQUESTS':
      suggestions.push('Wait a few minutes before trying again');
      suggestions.push('Clear your browser cache and cookies');
      break;
      
    case 'OAUTH_CANCELLED':
      suggestions.push('Try the authentication process again');
      suggestions.push('Make sure to grant the necessary permissions');
      break;
      
    case 'OAUTH_ACCESS_DENIED':
      suggestions.push('Grant the required permissions to continue');
      suggestions.push('Try using email/password authentication instead');
      break;
      
    default:
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache');
      suggestions.push('Contact support if the problem persists');
  }
  
  return suggestions;
}

/**
 * Format error for logging (without sensitive information)
 */
export function formatErrorForLogging(error: AuthError): object {
  return {
    code: error.code,
    message: error.message,
    recoverable: error.recoverable,
    retryable: error.retryable,
    timestamp: new Date().toISOString(),
    // Don't log sensitive details
    hasDetails: !!error.details
  };
}