import React, { useState } from 'react';
import type { DailyPlan, TimeBlock } from '../../types/daily-plan';

interface ActivityListProps {
  plan: DailyPlan;
  onComplete: (blockId: string) => void;
  onSkip: (blockId: string, reason: string) => void;
  isUpdating?: boolean;
}

export default function ActivityList({ plan, onComplete, onSkip, isUpdating = false }: ActivityListProps) {
  const [skipReason, setSkipReason] = useState('');
  const [showSkipInput, setShowSkipInput] = useState(false);
  const [skipBlockId, setSkipBlockId] = useState<string | null>(null);

  // Get current block (first pending block)
  const currentBlock = plan.timeBlocks?.find(block => block.status === 'pending') || null;
  
  // Get next 2 blocks after current
  const nextBlocks = currentBlock && plan.timeBlocks
    ? plan.timeBlocks
        .slice(plan.timeBlocks.indexOf(currentBlock) + 1)
        .filter(block => block.status === 'pending')
        .slice(0, 2)
    : [];

  // Check if plan is truly complete (Requirements 6.1, 6.2, 6.3, 6.4, 6.5)
  const isPlanComplete = () => {
    if (!plan.timeBlocks || plan.timeBlocks.length === 0) return false;
    
    // Get all blocks after planStart (Requirement 6.1)
    const planStartTime = new Date(plan.planStart);
    const blocksAfterPlanStart = plan.timeBlocks.filter(block => {
      const blockEndTime = new Date(block.endTime);
      return blockEndTime > planStartTime;
    });
    
    // Filter to blocks after now (Requirement 6.1)
    const now = new Date();
    const blocksAfterNow = blocksAfterPlanStart.filter(block => {
      const blockEndTime = new Date(block.endTime);
      return blockEndTime > now;
    });
    
    // Check if any have status='pending' (Requirement 6.3)
    const hasPendingBlocks = blocksAfterNow.some(block => block.status === 'pending');
    
    // Check if plan status ≠ 'degraded' (Requirement 6.3)
    const isNotDegraded = plan.status !== 'degraded';
    
    // Show celebration only if no pending blocks AND status ≠ 'degraded' (Requirement 6.5)
    return !hasPendingBlocks && isNotDegraded;
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const handleSkipClick = (blockId: string) => {
    setSkipBlockId(blockId);
    setShowSkipInput(true);
  };

  const handleSkipSubmit = () => {
    if (skipBlockId) {
      onSkip(skipBlockId, skipReason || 'No reason provided');
      setSkipReason('');
      setShowSkipInput(false);
      setSkipBlockId(null);
    }
  };

  const handleSkipCancel = () => {
    setSkipReason('');
    setShowSkipInput(false);
    setSkipBlockId(null);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commitment':
        return '📅';
      case 'task':
        return '✓';
      case 'routine':
        return '🔄';
      case 'meal':
        return '🍽️';
      case 'buffer':
        return '⏸️';
      case 'travel':
        return '🚴';
      default:
        return '•';
    }
  };

  if (!plan.timeBlocks || plan.timeBlocks.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6 text-center">
        <p className="text-text-muted">No activities scheduled</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-lg">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-semibold text-text-primary">Today's Schedule</h2>
        <p className="text-sm text-text-muted mt-1">
          {plan.timeBlocks.filter(b => b.status === 'completed').length} of {plan.timeBlocks.length} activities completed
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Current Activity */}
        {currentBlock ? (
          <div className="bg-accent-primary/10 border-2 border-accent-primary rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{getActivityIcon(currentBlock.activityType)}</span>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Current Activity</h3>
                    <p className="text-sm text-text-muted">
                      {formatTime(currentBlock.startTime)} - {formatTime(currentBlock.endTime)}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-semibold text-text-primary ml-10">
                  {currentBlock.activityName}
                </p>
                <p className="text-sm text-text-muted ml-10 mt-1">
                  {currentBlock.activityType.charAt(0).toUpperCase() + currentBlock.activityType.slice(1)}
                  {currentBlock.isFixed && ' • Fixed'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {!showSkipInput || skipBlockId !== currentBlock.id ? (
              <div className="flex items-center space-x-3 ml-10">
                <button
                  onClick={() => onComplete(currentBlock.id)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-accent-success text-white rounded-lg hover:bg-accent-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete
                </button>
                <button
                  onClick={() => handleSkipClick(currentBlock.id)}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-surface-hover text-text-primary border border-border rounded-lg hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Skip
                </button>
              </div>
            ) : (
              <div className="ml-10 space-y-2">
                <input
                  type="text"
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  placeholder="Why are you skipping this? (optional)"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary bg-surface text-text-primary"
                  disabled={isUpdating}
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSkipSubmit}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Confirm Skip
                  </button>
                  <button
                    onClick={handleSkipCancel}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-surface-hover text-text-primary border border-border rounded-lg hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isPlanComplete() ? (
          <div className="bg-accent-success/10 border border-accent-success rounded-lg p-4 text-center">
            <p className="text-lg font-semibold text-accent-success">🎉 All activities completed!</p>
            <p className="text-sm text-text-muted mt-1">Great job finishing your plan for today</p>
          </div>
        ) : null}

        {/* Next Activities */}
        {nextBlocks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide">Coming Up Next</h3>
            {nextBlocks.map((block, index) => (
              <div
                key={block.id}
                className="bg-surface-hover border border-border rounded-lg p-3 hover:border-accent-primary/50 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-xl mr-3">{getActivityIcon(block.activityType)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{block.activityName}</p>
                    <p className="text-sm text-text-muted">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                      {' • '}
                      {block.activityType.charAt(0).toUpperCase() + block.activityType.slice(1)}
                      {block.isFixed && ' • Fixed'}
                    </p>
                  </div>
                  <span className="text-sm text-text-muted ml-2">
                    #{index + 2}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All Activities (Collapsible) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-text-muted uppercase tracking-wide hover:text-text-primary transition-colors">
            View All Activities ({plan.timeBlocks.length})
          </summary>
          <div className="mt-3 space-y-2">
            {plan.timeBlocks.map((block) => (
              <div
                key={block.id}
                className={`border rounded-lg p-3 ${
                  block.status === 'completed'
                    ? 'bg-accent-success/5 border-accent-success/30 opacity-60'
                    : block.status === 'skipped'
                    ? 'bg-accent-warning/5 border-accent-warning/30 opacity-60'
                    : 'bg-surface-hover border-border'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">{getActivityIcon(block.activityType)}</span>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      block.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary'
                    }`}>
                      {block.activityName}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                      {' • '}
                      {block.activityType}
                    </p>
                    {block.skipReason && (
                      <p className="text-xs text-accent-warning mt-1">
                        Skipped: {block.skipReason}
                      </p>
                    )}
                  </div>
                  {block.status === 'completed' && (
                    <span className="text-accent-success">✓</span>
                  )}
                  {block.status === 'skipped' && (
                    <span className="text-accent-warning">⊘</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
