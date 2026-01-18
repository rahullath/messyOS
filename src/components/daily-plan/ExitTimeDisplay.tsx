import React from 'react';
import type { ExitTime, TimeBlock } from '../../types/daily-plan';

interface ExitTimeDisplayProps {
  exitTimes: ExitTime[];
  timeBlocks?: TimeBlock[];
}

export default function ExitTimeDisplay({ exitTimes, timeBlocks = [] }: ExitTimeDisplayProps) {
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getTravelIcon = (method: string) => {
    switch (method) {
      case 'bike':
        return '🚴';
      case 'train':
        return '🚆';
      case 'walk':
        return '🚶';
      case 'bus':
        return '🚌';
      default:
        return '🚗';
    }
  };

  const getCommitmentName = (exitTime: ExitTime) => {
    // Find the corresponding time block
    const block = timeBlocks.find(b => b.id === exitTime.timeBlockId);
    return block?.activityName || 'Commitment';
  };

  if (!exitTimes || exitTimes.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-lg">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-semibold text-text-primary">Exit Times</h2>
        <p className="text-sm text-text-muted mt-1">
          When to leave for your commitments
        </p>
      </div>

      <div className="p-6 space-y-4">
        {exitTimes.map((exitTime) => (
          <div
            key={exitTime.id}
            className="bg-surface-hover border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary mb-2">
                  {getCommitmentName(exitTime)}
                </h3>
                
                <div className="space-y-2">
                  {/* Exit Time */}
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 mr-2 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-text-primary">Leave at:</span>
                    <span className="ml-2 text-lg font-bold text-accent-primary">
                      {formatTime(exitTime.exitTime)}
                    </span>
                  </div>

                  {/* Travel Method and Duration */}
                  <div className="flex items-center text-sm text-text-muted">
                    <span className="text-lg mr-2">{getTravelIcon(exitTime.travelMethod)}</span>
                    <span>
                      {exitTime.travelMethod.charAt(0).toUpperCase() + exitTime.travelMethod.slice(1)}
                      {' • '}
                      {exitTime.travelDuration} min travel
                      {' + '}
                      {exitTime.preparationTime} min prep
                    </span>
                  </div>

                  {/* Total Time */}
                  <div className="flex items-center text-sm text-text-muted">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>
                      Total: {exitTime.travelDuration + exitTime.preparationTime} minutes
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Indicator */}
              <div className="ml-4 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center">
                  <span className="text-2xl">{getTravelIcon(exitTime.travelMethod)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 border-t border-blue-500/30 rounded-b-xl">
        <div className="flex items-start">
          <svg className="w-5 h-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-400">
            Exit times include travel duration and preparation time. Make sure to leave on time to avoid being late!
          </p>
        </div>
      </div>
    </div>
  );
}
