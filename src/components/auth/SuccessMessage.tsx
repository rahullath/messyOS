// src/components/auth/SuccessMessage.tsx - Success message component
import React from 'react';

interface SuccessMessageProps {
  message: string;
  className?: string;
}

export function SuccessMessage({ message, className = '' }: SuccessMessageProps) {
  return (
    <div className={`bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4 ${className}`}>
      <div className="flex items-center">
        <svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-green-300">{message}</p>
      </div>
    </div>
  );
}