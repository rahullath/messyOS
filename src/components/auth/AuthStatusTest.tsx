// src/components/auth/AuthStatusTest.tsx - Simple test component to verify auth context
import React from 'react';
import { AuthProvider, useAuth } from '../../lib/auth/context';

function AuthStatusDisplay() {
  const { user, isLoading, isAuthenticated, error } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent mr-2"></div>
          <span className="text-blue-300">Loading authentication status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-300">Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      isAuthenticated 
        ? 'bg-green-900/20 border-green-500/30' 
        : 'bg-gray-900/20 border-gray-500/30'
    }`}>
      <div className="flex items-center mb-2">
        <svg 
          className={`w-5 h-5 mr-2 ${isAuthenticated ? 'text-green-400' : 'text-gray-400'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          {isAuthenticated ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
        <span className={`font-semibold ${isAuthenticated ? 'text-green-300' : 'text-gray-300'}`}>
          {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
        </span>
      </div>
      
      {user && (
        <div className="text-sm text-gray-300 space-y-1">
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>User ID:</strong> {user.id}</div>
          {user.profile?.full_name && (
            <div><strong>Name:</strong> {user.profile.full_name}</div>
          )}
        </div>
      )}
      
      {!isAuthenticated && (
        <p className="text-sm text-gray-400 mt-2">
          Authentication context is working, but no user is signed in.
        </p>
      )}
    </div>
  );
}

export function AuthStatusTest() {
  return (
    <AuthProvider>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Auth Context Test</h3>
        <AuthStatusDisplay />
        <div className="text-xs text-gray-500">
          This component tests that the AuthProvider context is working correctly.
        </div>
      </div>
    </AuthProvider>
  );
}