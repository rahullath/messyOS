import React from 'react';
import type { DailyPlan } from '../../types/daily-plan';

interface PlanContextDisplayProps {
  plan: DailyPlan;
}

export default function PlanContextDisplay({ plan }: PlanContextDisplayProps) {
  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Requirement 1.4: Display plan start time based on generated_after_now flag
  const planStartTime = formatTime(plan.planStart);
  const wakeTime = formatTime(plan.wakeTime);
  const generatedTime = formatTime(plan.generatedAt);

  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <svg className="w-5 h-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          {/* Requirement 1.4: Show plan start time based on generated_after_now */}
          {plan.generatedAfterNow ? (
            <>
              <p className="text-sm text-blue-400 font-medium">
                Plan starts at {planStartTime}
              </p>
              {/* Requirement 4.5: Explain skipped morning blocks */}
              <p className="text-xs text-blue-300 mt-1">
                Morning activities skipped (plan generated at {generatedTime})
              </p>
            </>
          ) : (
            <p className="text-sm text-blue-400 font-medium">
              Plan starts at {wakeTime}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
