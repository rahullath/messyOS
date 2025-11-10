// src/components/wallet/TrialStatus.tsx - Trial Status Component
import React from 'react';
import type { TrialStatus as TrialStatusType } from '../../lib/tokens/types';

interface TrialStatusProps {
  trialStatus: TrialStatusType;
  showUpgradeButton?: boolean;
  className?: string;
}

export function TrialStatus({ 
  trialStatus, 
  showUpgradeButton = true,
  className = ''
}: TrialStatusProps) {
  const { isActive, daysRemaining, tokensRemaining, expiresAt } = trialStatus;

  const getStatusColor = () => {
    if (!isActive) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (daysRemaining <= 3) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-green-400 bg-green-500/20 border-green-500/30';
  };

  const getStatusIcon = () => {
    if (!isActive) return '⚠️';
    if (daysRemaining <= 3) return '⏰';
    return '✅';
  };

  const getStatusMessage = () => {
    if (!isActive) {
      return 'Trial expired';
    }
    if (daysRemaining === 0) {
      return 'Trial expires today';
    }
    if (daysRemaining === 1) {
      return '1 day remaining';
    }
    return `${daysRemaining} days remaining`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`trial-status ${className}`}>
      <div className={`trial-status-card border rounded-lg p-4 ${getStatusColor()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getStatusIcon()}</span>
            <span className="font-semibold">Free Trial</span>
          </div>
          <div className="text-sm font-medium">
            {getStatusMessage()}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Trial Progress</span>
            <span>{30 - daysRemaining}/30 days used</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? daysRemaining <= 3 
                    ? 'bg-yellow-400' 
                    : 'bg-green-400'
                  : 'bg-red-400'
              }`}
              style={{ width: `${((30 - daysRemaining) / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Expires</div>
            <div className="font-medium">{formatDate(expiresAt)}</div>
          </div>
          <div>
            <div className="text-gray-400 mb-1">Tokens Left</div>
            <div className="font-medium">{tokensRemaining.toLocaleString()}</div>
          </div>
        </div>

        {/* Action buttons */}
        {showUpgradeButton && (
          <div className="mt-4 pt-3 border-t border-current border-opacity-20">
            {isActive ? (
              <div className="flex space-x-2">
                <button className="flex-1 bg-white bg-opacity-10 hover:bg-opacity-20 text-current font-medium py-2 px-4 rounded-lg text-sm transition-colors">
                  Upgrade Now
                </button>
                <button className="px-4 py-2 text-current hover:bg-white hover:bg-opacity-10 rounded-lg text-sm transition-colors">
                  Learn More
                </button>
              </div>
            ) : (
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors">
                Subscribe to Continue
              </button>
            )}
          </div>
        )}
      </div>

      {/* Additional info for expired trials */}
      {!isActive && (
        <div className="mt-3 p-3 bg-gray-800 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-400 text-lg">💡</div>
            <div>
              <h4 className="text-white font-medium text-sm mb-1">
                Continue with MessyOS Premium
              </h4>
              <p className="text-gray-400 text-xs">
                Get unlimited tokens, advanced AI features, and priority support.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactTrialStatus({ trialStatus }: { trialStatus: TrialStatusType }) {
  const { isActive, daysRemaining } = trialStatus;

  return (
    <div className="compact-trial-status">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
        !isActive ? 'bg-red-500/20 text-red-400' :
        daysRemaining <= 3 ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-green-500/20 text-green-400'
      }`}>
        <span className="text-xs">
          {!isActive ? '⚠️' : daysRemaining <= 3 ? '⏰' : '✅'}
        </span>
        <span className="font-medium">
          {!isActive ? 'Trial Expired' : 
           daysRemaining === 0 ? 'Expires Today' :
           daysRemaining === 1 ? '1 Day Left' :
           `${daysRemaining} Days Left`}
        </span>
      </div>
    </div>
  );
}

// CSS for trial status
const trialStyles = `
  .trial-status-card {
    backdrop-filter: blur(10px);
    transition: all 0.3s ease;
  }

  .trial-status-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
  }

  .compact-trial-status {
    transition: all 0.2s ease;
  }

  .compact-trial-status:hover {
    transform: scale(1.02);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = trialStyles;
  document.head.appendChild(styleSheet);
}