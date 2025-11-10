// src/components/auth/PasswordStrengthIndicator.tsx - Password strength visual indicator
import React from 'react';
import type { PasswordStrength } from '../../lib/auth/validation';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
}

export function PasswordStrengthIndicator({ strength }: PasswordStrengthIndicatorProps) {
  const getBarColor = (index: number): string => {
    if (index < strength.score) {
      switch (strength.score) {
        case 1:
          return 'bg-red-500';
        case 2:
          return 'bg-orange-500';
        case 3:
          return 'bg-yellow-500';
        case 4:
          return 'bg-green-500';
        default:
          return 'bg-gray-600';
      }
    }
    return 'bg-gray-600';
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bars */}
      <div className="flex space-x-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${getBarColor(index)}`}
          />
        ))}
      </div>

      {/* Strength Label */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${strength.color}`}>
          {strength.label}
        </span>
        {strength.score >= 3 && (
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Feedback */}
      {strength.feedback.length > 0 && strength.score < 4 && (
        <div className="text-xs text-gray-400 space-y-1">
          {strength.feedback.map((feedback, index) => (
            <div key={index} className="flex items-center">
              <span className="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
              {feedback}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}