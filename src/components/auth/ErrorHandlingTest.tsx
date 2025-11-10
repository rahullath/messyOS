// src/components/auth/ErrorHandlingTest.tsx - Test component for error handling functionality
import React, { useState } from 'react';
import { ErrorMessage } from './ErrorMessage';
import { ErrorBoundary } from './ErrorBoundary';
import { NetworkStatus } from './NetworkStatus';
import { LoadingSpinner } from './LoadingSpinner';
import { mapSupabaseError, AUTH_ERROR_CODES } from '../../lib/auth/errors';
import { withRetry, withNetworkAwareRetry } from '../../lib/auth/retry';

export function ErrorHandlingTest() {
  const [currentError, setCurrentError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testErrorTypes = [
    {
      name: 'Invalid Credentials',
      error: { message: 'Invalid login credentials' }
    },
    {
      name: 'Network Error',
      error: { name: 'NetworkError', message: 'Failed to fetch' }
    },
    {
      name: 'Email Not Confirmed',
      error: { message: 'Email not confirmed' }
    },
    {
      name: 'Too Many Requests',
      error: { message: 'Too many requests' }
    },
    {
      name: 'OAuth Cancelled',
      error: { message: 'OAuth authentication cancelled' }
    },
    {
      name: 'Server Error',
      error: { message: 'Internal server error' }
    }
  ];

  const simulateError = (errorData: any) => {
    const mappedError = mapSupabaseError(errorData);
    setCurrentError(mappedError);
    addResult(`Simulated ${errorData.message} error`);
  };

  const testRetryMechanism = async () => {
    setIsLoading(true);
    addResult('Testing retry mechanism...');
    
    try {
      let attemptCount = 0;
      await withRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Simulated failure');
          }
          return 'Success!';
        },
        { maxRetries: 3 },
        (state) => {
          addResult(`Retry attempt ${state.attempt} of ${state.totalAttempts}`);
        }
      );
      addResult('Retry mechanism succeeded after 3 attempts');
    } catch (error) {
      addResult('Retry mechanism failed after max attempts');
    } finally {
      setIsLoading(false);
    }
  };

  const testNetworkAwareRetry = async () => {
    setIsLoading(true);
    addResult('Testing network-aware retry...');
    
    try {
      await withNetworkAwareRetry(
        async () => {
          // Simulate network success
          return 'Network operation successful';
        },
        (networkError) => {
          addResult(`Network error detected: ${networkError.message}`);
        }
      );
      addResult('Network-aware retry succeeded');
    } catch (error) {
      addResult('Network-aware retry failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setCurrentError(null);
    addResult('Error cleared');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const ThrowErrorComponent = () => {
    const [shouldThrow, setShouldThrow] = useState(false);
    
    if (shouldThrow) {
      throw new Error('Test error boundary');
    }
    
    return (
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Trigger Error Boundary
      </button>
    );
  };

  return (
    <div className="space-y-8">
      {/* Network Status */}
      <NetworkStatus showWhenOnline={true} />
      
      {/* Current Error Display */}
      {currentError && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Current Error</h2>
          <ErrorMessage
            message={currentError.message}
            error={currentError}
            showSuggestions={true}
            onRetry={async () => {
              addResult('Retry button clicked');
              await new Promise(resolve => setTimeout(resolve, 1000));
              clearError();
            }}
            showDetails={true}
          />
        </div>
      )}

      {/* Error Type Tests */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Error Type Tests</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {testErrorTypes.map((test, index) => (
            <button
              key={index}
              onClick={() => simulateError(test.error)}
              className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors text-sm"
            >
              {test.name}
            </button>
          ))}
        </div>
      </div>

      {/* Retry Mechanism Tests */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Retry Mechanism Tests</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={testRetryMechanism}
            disabled={isLoading}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center">
                <LoadingSpinner size="sm" />
                <span className="ml-2">Testing...</span>
              </div>
            ) : (
              'Test Basic Retry'
            )}
          </button>
          
          <button
            onClick={testNetworkAwareRetry}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Test Network Retry
          </button>
        </div>
      </div>

      {/* Error Boundary Test */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Error Boundary Test</h2>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            addResult(`Error boundary caught: ${error.message}`);
          }}
        >
          <ThrowErrorComponent />
        </ErrorBoundary>
      </div>

      {/* Test Results */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Test Results</h2>
          <button
            onClick={clearResults}
            className="px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors text-sm"
          >
            Clear
          </button>
        </div>
        <div className="bg-slate-900/50 rounded p-4 max-h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-400 text-sm">No test results yet</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm text-gray-300 font-mono">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error Code Reference */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Error Code Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(AUTH_ERROR_CODES).map(([key, errorConfig]) => (
            <div key={key} className="bg-slate-900/50 rounded p-3">
              <div className="text-sm font-mono text-cyan-400 mb-1">{key}</div>
              <div className="text-xs text-gray-300 mb-2">{errorConfig.userMessage}</div>
              <div className="flex gap-2 text-xs">
                <span className={`px-2 py-1 rounded ${errorConfig.retryable ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                  {errorConfig.retryable ? 'Retryable' : 'Not Retryable'}
                </span>
                <span className={`px-2 py-1 rounded ${errorConfig.recoverable ? 'bg-blue-900/30 text-blue-300' : 'bg-gray-900/30 text-gray-300'}`}>
                  {errorConfig.recoverable ? 'Recoverable' : 'Not Recoverable'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}