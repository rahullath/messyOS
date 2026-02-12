import React, { useState, useEffect } from 'react';
import type { DailyPlan, TimeBlock } from '../../types/daily-plan';

interface DegradePlanButtonProps {
  plan: DailyPlan;
  onDegrade: () => void;
  isDegrading?: boolean;
}

export default function DegradePlanButton({ plan, onDegrade, isDegrading = false }: DegradePlanButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if we should show the degrade button
    // Requirements 5.1, 5.2, 5.3, 5.4, 5.5
    const checkShouldShow = () => {
      if (!plan.timeBlocks || plan.timeBlocks.length === 0) {
        setShouldShow(false);
        return;
      }

      const now = new Date();
      const planStart = new Date(plan.planStart);

      // Requirement 5.1: Only consider blocks after planStart
      const blocksAfterPlanStart = plan.timeBlocks.filter(block => {
        const blockEnd = new Date(block.endTime);
        return blockEnd > planStart;
      });

      if (blocksAfterPlanStart.length === 0) {
        setShouldShow(false);
        return;
      }

      // Requirement 5.2: Ignore blocks with status = 'skipped'
      // Find current block (first pending block after planStart)
      const currentBlock = blocksAfterPlanStart.find(block => block.status === 'pending');
      
      // Requirement 5.5: Hide if no current block exists
      if (!currentBlock) {
        setShouldShow(false);
        return;
      }

      // Requirement 5.5: Hide if all remaining blocks are after now
      const currentBlockStart = new Date(currentBlock.startTime);
      if (currentBlockStart > now) {
        setShouldShow(false);
        return;
      }

      // Requirement 5.3: Check if now > currentBlock.endTime + 30 minutes
      const endTime = new Date(currentBlock.endTime);
      const thirtyMinutesAfterEnd = new Date(endTime.getTime() + 30 * 60 * 1000);

      // Requirement 5.4: When all blocks before now are skipped, don't consider user behind schedule
      // This is handled by finding the first pending block (skipped blocks are ignored)
      setShouldShow(now > thirtyMinutesAfterEnd);
    };

    checkShouldShow();
    
    // Check every minute
    const interval = setInterval(checkShouldShow, 60000);
    
    return () => clearInterval(interval);
  }, [plan]);

  const handleDegradeClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    onDegrade();
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  // Don't show if plan is already degraded
  if (plan.status === 'degraded') {
    return (
      <div className="bg-accent-warning/10 border border-accent-warning/30 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2 text-accent-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm font-medium text-accent-warning">
            Plan has been degraded to essentials only
          </span>
        </div>
      </div>
    );
  }

  // Don't show if not behind schedule
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-lg">
      <div className="p-6">
        {!showConfirm ? (
          <div className="space-y-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 mr-3 text-accent-warning flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Running Behind Schedule
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  You're more than 30 minutes behind. Consider degrading your plan to focus on essentials:
                  fixed commitments, routines, and meals. Optional tasks will be dropped.
                </p>
                <button
                  onClick={handleDegradeClick}
                  disabled={isDegrading}
                  className="px-6 py-3 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Degrade Plan
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 mr-3 text-accent-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Confirm Plan Degradation
                </h3>
                <p className="text-sm text-text-muted mb-4">
                  This will simplify your plan by:
                </p>
                <ul className="text-sm text-text-muted mb-4 space-y-1 ml-4">
                  <li>✓ Keeping fixed commitments (classes, appointments)</li>
                  <li>✓ Keeping routines (morning, evening)</li>
                  <li>✓ Keeping meals</li>
                  <li>✗ Dropping optional tasks</li>
                  <li>↻ Recomputing all buffers and transitions</li>
                </ul>
                <p className="text-sm text-accent-warning mb-4">
                  This action cannot be undone. Dropped tasks will be marked as "skipped" and can be rescheduled later.
                </p>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleConfirm}
                    disabled={isDegrading}
                    className="px-6 py-3 bg-accent-error text-white rounded-lg hover:bg-accent-error/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
                  >
                    {isDegrading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Degrading...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Yes, Degrade Plan
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isDegrading}
                    className="px-6 py-3 bg-surface-hover text-text-primary border border-border rounded-lg hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
