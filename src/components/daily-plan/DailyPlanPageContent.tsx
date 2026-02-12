import React, { useState, useEffect } from 'react';
import PlanGeneratorForm from './PlanGeneratorForm';
import ActivityList from './ActivityList';
import ExitTimeDisplay from './ExitTimeDisplay';
import DegradePlanButton from './DegradePlanButton';
import DeletePlanButton from './DeletePlanButton';
import PlanContextDisplay from './PlanContextDisplay';
import type { DailyPlan, EnergyState } from '../../types/daily-plan';

export default function DailyPlanPageContent() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDegrading, setIsDegrading] = useState(false);

  // Fetch today's plan on mount
  useEffect(() => {
    fetchTodaysPlan();
  }, []);

  const fetchTodaysPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/daily-plan/today');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch plan: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPlan(data.plan);
    } catch (err) {
      console.error('Error fetching plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (input: {
    wakeTime: string;
    sleepTime: string;
    energyState: EnergyState;
  }) => {
    try {
      setIsGenerating(true);
      setError(null);

      // Convert time strings to full ISO timestamps for today
      const today = new Date();
      const [wakeHour, wakeMinute] = input.wakeTime.split(':');
      const [sleepHour, sleepMinute] = input.sleepTime.split(':');
      
      const wakeTime = new Date(today);
      wakeTime.setHours(parseInt(wakeHour), parseInt(wakeMinute), 0, 0);
      
      const sleepTime = new Date(today);
      sleepTime.setHours(parseInt(sleepHour), parseInt(sleepMinute), 0, 0);

      const response = await fetch('/api/daily-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wakeTime: wakeTime.toISOString(),
          sleepTime: sleepTime.toISOString(),
          energyState: input.energyState,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate plan: ${response.statusText}`);
      }

      const data = await response.json();
      setPlan(data.plan);
    } catch (err) {
      console.error('Error generating plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = async (blockId: string) => {
    if (!plan) return;

    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch(`/api/daily-plan/${plan.id}/activity/${blockId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to complete activity: ${response.statusText}`);
      }

      // Refresh the plan to get updated state
      await fetchTodaysPlan();
    } catch (err) {
      console.error('Error completing activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete activity');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = async (blockId: string, reason: string) => {
    if (!plan) return;

    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch(`/api/daily-plan/${plan.id}/activity/${blockId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'skipped',
          skipReason: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to skip activity: ${response.statusText}`);
      }

      // Refresh the plan to get updated state
      await fetchTodaysPlan();
    } catch (err) {
      console.error('Error skipping activity:', err);
      setError(err instanceof Error ? err.message : 'Failed to skip activity');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDegrade = async () => {
    if (!plan) return;

    try {
      setIsDegrading(true);
      setError(null);

      const response = await fetch(`/api/daily-plan/${plan.id}/degrade`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to degrade plan: ${response.statusText}`);
      }

      const data = await response.json();
      setPlan(data.plan);
    } catch (err) {
      console.error('Error degrading plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to degrade plan');
    } finally {
      setIsDegrading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    if (!plan) {
      fetchTodaysPlan();
    }
  };

  const handleDeleted = () => {
    // Reset state and show generation form
    setPlan(null);
    setError(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-accent-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-text-muted">Loading your plan...</p>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="bg-accent-error/10 border border-accent-error/30 rounded-xl p-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 mr-3 text-accent-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-accent-error mb-2">
              Error
            </h3>
            <p className="text-sm text-text-primary mb-4">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No plan exists - show generator form
  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-400">
              No plan exists for today. Generate one to get started with your structured day!
            </p>
          </div>
        </div>
        <PlanGeneratorForm onGenerate={handleGenerate} isGenerating={isGenerating} />
      </div>
    );
  }

  // Plan exists - show activity list, exit times, and degrade button
  return (
    <div className="space-y-6">
      {/* Delete Plan Button - Top Right */}
      <div className="flex justify-end">
        <DeletePlanButton planId={plan.id} onDeleted={handleDeleted} />
      </div>

      {/* Plan Context Display - Requirements 1.4, 4.5 */}
      <PlanContextDisplay plan={plan} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - Activity List */}
        <div className="lg:col-span-2">
          <ActivityList
            plan={plan}
            onComplete={handleComplete}
            onSkip={handleSkip}
            isUpdating={isUpdating}
          />
        </div>

        {/* Sidebar - Exit Times and Degrade Button */}
        <div className="space-y-6">
          {plan.exitTimes && plan.exitTimes.length > 0 && (
            <ExitTimeDisplay
              exitTimes={plan.exitTimes}
              timeBlocks={plan.timeBlocks}
            />
          )}
          
          <DegradePlanButton
            plan={plan}
            onDegrade={handleDegrade}
            isDegrading={isDegrading}
          />
        </div>
      </div>
    </div>
  );
}
