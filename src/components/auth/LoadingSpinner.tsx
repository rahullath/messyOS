// src/components/auth/LoadingSpinner.tsx - Loading spinner component
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

export function LoadingSpinner({ size = 'md', message, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`animate-spin rounded-full border-2 border-gray-600 border-t-cyan-400 ${sizeClasses[size]}`} />
        {message && (
          <span className="text-sm text-gray-400">{message}</span>
        )}
      </div>
    </div>
  );
}