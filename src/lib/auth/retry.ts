// src/lib/auth/retry.ts - Retry mechanism for authentication operations
import { mapSupabaseError, isRetryableError, createNetworkError } from './errors';
import type { AuthError, NetworkError } from './errors';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: AuthError) => boolean;
}

export interface RetryState {
  attempt: number;
  totalAttempts: number;
  lastError: AuthError | null;
  isRetrying: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryCondition: isRetryableError
};

/**
 * Calculate delay for exponential backoff with jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * 0.1 * Math.random();
  
  return cappedDelay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (state: RetryState) => void
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AuthError | null = null;
  
  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const authError = mapSupabaseError(error);
      lastError = authError;
      
      // Don't retry if this is the last attempt or error is not retryable
      if (attempt > finalConfig.maxRetries || !finalConfig.retryCondition!(authError)) {
        throw authError;
      }
      
      // Calculate delay and notify about retry
      const delay = calculateDelay(attempt, finalConfig);
      
      if (onRetry) {
        onRetry({
          attempt,
          totalAttempts: finalConfig.maxRetries + 1,
          lastError: authError,
          isRetrying: true
        });
      }
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Retry loop completed without result');
}

/**
 * Network-aware retry specifically for authentication operations
 */
export async function withNetworkRetry<T>(
  operation: () => Promise<T>,
  onRetry?: (error: NetworkError) => void
): Promise<T> {
  return withRetry(
    operation,
    {
      maxRetries: 3,
      baseDelay: 2000,
      retryCondition: (error) => {
        return error.code === 'NETWORK_ERROR' || 
               error.code === 'TIMEOUT_ERROR' ||
               error.code === 'SERVER_ERROR' ||
               error.code === 'SERVICE_UNAVAILABLE';
      }
    },
    (state) => {
      if (onRetry && state.lastError) {
        const networkError = createNetworkError(
          new Error(state.lastError.message),
          state.attempt - 1,
          state.totalAttempts - 1
        );
        onRetry(networkError);
      }
    }
  );
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Wait for network connection to be restored
 */
export function waitForOnline(timeout: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onOnline);
      resolve(false);
    }, timeout);
    
    const onOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onOnline);
      resolve(true);
    };
    
    window.addEventListener('online', onOnline);
  });
}

/**
 * Enhanced retry with network awareness
 */
export async function withNetworkAwareRetry<T>(
  operation: () => Promise<T>,
  onNetworkError?: (error: NetworkError) => void,
  onRetry?: (state: RetryState) => void
): Promise<T> {
  return withRetry(
    async () => {
      // Check if we're online before attempting operation
      if (!isOnline()) {
        const networkError = createNetworkError(new Error('No internet connection'));
        if (onNetworkError) {
          onNetworkError(networkError);
        }
        
        // Wait for connection to be restored
        const isBackOnline = await waitForOnline(10000);
        if (!isBackOnline) {
          throw networkError;
        }
      }
      
      return await operation();
    },
    {
      maxRetries: 3,
      baseDelay: 1500,
      retryCondition: (error) => {
        const isNetworkRelated = error.code === 'NETWORK_ERROR' || 
                                error.code === 'TIMEOUT_ERROR' ||
                                error.code === 'SERVER_ERROR' ||
                                error.code === 'SERVICE_UNAVAILABLE';
        
        // Only retry network-related errors
        return isNetworkRelated && isOnline();
      }
    },
    onRetry
  );
}

/**
 * Create a retry-enabled version of an async function
 */
export function createRetryableFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: Partial<RetryConfig>
) {
  return async (...args: T): Promise<R> => {
    return withRetry(() => fn(...args), config);
  };
}

/**
 * Batch retry operations with circuit breaker pattern
 */
export class RetryManager {
  private failureCount = 0;
  private lastFailureTime = 0;
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 minute
  
  async execute<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw mapSupabaseError(new Error('Service temporarily unavailable due to repeated failures'));
    }
    
    try {
      const result = await withRetry(operation, config);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isCircuitOpen(): boolean {
    if (this.failureCount < this.circuitBreakerThreshold) {
      return false;
    }
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure < this.circuitBreakerTimeout;
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }
  
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

// Export singleton retry manager
export const retryManager = new RetryManager();