import React, { useState, useEffect } from 'react';
import type { ExecutionChain, ExitGate, ChainStepInstance } from '../../lib/chains/types';
import type { DailyContext } from '../../lib/context/daily-context';

interface ChainViewProps {
  chain: ExecutionChain;
  exitGate: ExitGate;
  onStepComplete: (stepId: string) => void;
  onGateConditionToggle: (conditionId: string, satisfied: boolean) => void;
  onStepEdit?: (stepId: string, payload: { name: string; durationMinutes: number; saveAsTemplate: boolean }) => Promise<void> | void;
  isStepPersistable?: (stepId: string) => boolean;
}

/**
 * Chain View Component
 * 
 * Primary interface for executing chains. Displays:
 * - Next anchor (prominent, large)
 * - Chain Completion Deadline ("Complete by [time]")
 * - Chain steps (checkbox style) with duration ranges
 * - Exit Gate status (blocked/ready with reasons)
 * - Current step highlight
 * - Reliability indicators for low-confidence data
 * 
 * Requirements: 7.5, 7.6, 7.7, 14.1, 14.2, 14.3, 14.4, 14.5
 */
export default function ChainView({
  chain,
  exitGate,
  onStepComplete,
  onGateConditionToggle,
  onStepEdit,
  isStepPersistable,
}: ChainViewProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [dailyContext, setDailyContext] = useState<DailyContext | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftDuration, setDraftDuration] = useState('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch DailyContext for reliability indicators
  useEffect(() => {
    const fetchDailyContext = async () => {
      try {
        const response = await fetch('/api/context/today');
        if (response.ok) {
          const context = await response.json();
          setDailyContext(context);
        }
      } catch (error) {
        console.error('Failed to fetch DailyContext:', error);
      }
    };
    
    fetchDailyContext();
  }, []);

  // Format time for display
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format duration for display with range support
  // Requirements: 7.5
  const formatDuration = (minutes: number, showRange: boolean = false): string => {
    if (showRange) {
      // Show ±20% range for duration estimates
      const minDuration = Math.round(minutes * 0.8);
      const maxDuration = Math.round(minutes * 1.2);
      
      if (minutes < 60) {
        return `${minDuration}-${maxDuration}m`;
      }
      
      const minHours = Math.floor(minDuration / 60);
      const minMins = minDuration % 60;
      const maxHours = Math.floor(maxDuration / 60);
      const maxMins = maxDuration % 60;
      
      const minStr = minMins > 0 ? `${minHours}h ${minMins}m` : `${minHours}h`;
      const maxStr = maxMins > 0 ? `${maxHours}h ${maxMins}m` : `${maxHours}h`;
      
      return `${minStr}-${maxStr}`;
    }
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate total chain duration with range
  // Requirements: 7.6
  const calculateTotalDuration = (): { min: number; max: number; estimate: number } => {
    const totalMinutes = chain.steps.reduce((sum, step) => sum + step.duration, 0);
    
    // Apply risk inflator if present
    const riskInflator = chain.metadata?.risk_inflator || 1.0;
    const adjustedTotal = Math.round(totalMinutes * riskInflator);
    
    // Calculate range (±20%)
    const minDuration = Math.round(adjustedTotal * 0.8);
    const maxDuration = Math.round(adjustedTotal * 1.2);
    
    return { min: minDuration, max: maxDuration, estimate: adjustedTotal };
  };

  const totalDuration = calculateTotalDuration();

  // Get current step (first pending or in-progress step)
  const getCurrentStep = (): ChainStepInstance | null => {
    return chain.steps.find(
      step => step.status === 'pending' || step.status === 'in-progress'
    ) || null;
  };

  const currentStep = getCurrentStep();

  // Toggle step expansion
  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  // Get step icon based on status
  const getStepIcon = (step: ChainStepInstance) => {
    if (step.status === 'completed') {
      return (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (step.status === 'skipped') {
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    if (step.status === 'in-progress') {
      return (
        <div className="w-5 h-5 border-2 border-accent-primary rounded-full animate-pulse" />
      );
    }
    return (
      <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
    );
  };

  const beginEdit = (step: ChainStepInstance) => {
    setEditingStepId(step.step_id);
    setDraftName(step.name);
    setDraftDuration(String(step.duration));
    setSaveAsTemplate(true);
  };

  const cancelEdit = () => {
    setEditingStepId(null);
    setDraftName('');
    setDraftDuration('');
    setSaveAsTemplate(true);
  };

  const submitEdit = async (stepId: string) => {
    if (!onStepEdit) return;
    const durationMinutes = Number.parseInt(draftDuration, 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;

    setIsSavingEdit(true);
    try {
      await onStepEdit(stepId, {
        name: draftName.trim() || 'Untitled step',
        durationMinutes,
        saveAsTemplate,
      });
      cancelEdit();
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Next Anchor - Prominent Display */}
      <div className="bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary/40 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
              Next Anchor
            </div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">
              {chain.anchor.title}
            </h2>
            {chain.anchor.location && (
              <div className="flex items-center text-text-muted">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm">{chain.anchor.location}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-text-muted mb-1">Starts at</div>
            <div className="text-2xl font-bold text-accent-primary">
              {formatTime(chain.anchor.start)}
            </div>
          </div>
        </div>

        {/* Chain Completion Deadline - Requirements 7.7, 14.1, 4.2 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-accent-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-text-primary">
                Complete by
              </span>
            </div>
            <span className="text-lg font-bold text-accent-warning">
              {formatTime(chain.chain_completion_deadline)}
            </span>
          </div>
          
          {/* Total chain duration range - Requirements 7.6 */}
          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>Estimated duration:</span>
            <span className="font-medium">
              ~{formatDuration(totalDuration.min)}-{formatDuration(totalDuration.max)}
            </span>
          </div>
          
          {/* Risk indicators - Requirements 7.4 */}
          {(chain.metadata?.low_energy_risk || chain.metadata?.sleep_debt_risk) && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center text-xs text-orange-400">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  {chain.metadata.low_energy_risk && 'Low energy risk detected'}
                  {chain.metadata.low_energy_risk && chain.metadata.sleep_debt_risk && ' • '}
                  {chain.metadata.sleep_debt_risk && 'Sleep debt risk detected'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chain Steps - Checkbox Style - Requirements 14.2 */}
      <div className="bg-surface-secondary rounded-xl border border-border-primary p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Chain Steps
        </h3>

        <div className="space-y-2">
          {chain.steps.map((step, index) => {
            const isCurrentStep = currentStep?.step_id === step.step_id;
            const isExpanded = expandedSteps.has(step.step_id);
            const isPersistable = isStepPersistable ? isStepPersistable(step.step_id) : true;

            return (
              <div
                key={step.step_id}
                className={`
                  rounded-lg border transition-all
                  ${isCurrentStep 
                    ? 'bg-accent-primary/10 border-accent-primary shadow-md' 
                    : 'bg-surface-primary border-border-primary hover:border-border-secondary'
                  }
                `}
              >
                <div className="p-4">
                  <div className="flex items-start">
                    {/* Checkbox/Status Icon */}
                    <button
                      onClick={() => {
                        if (!isPersistable) return;
                        if (
                          step.status === 'pending' ||
                          step.status === 'in-progress' ||
                          step.status === 'completed'
                        ) {
                          onStepComplete(step.step_id);
                        }
                      }}
                      disabled={step.status === 'skipped' || !isPersistable}
                      className="mr-3 mt-0.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-accent-primary rounded-full"
                    >
                      {getStepIcon(step)}
                    </button>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className={`
                              font-medium
                              ${step.status === 'completed' ? 'text-text-muted line-through' : 'text-text-primary'}
                              ${isCurrentStep ? 'text-accent-primary font-semibold' : ''}
                            `}>
                              {step.name}
                            </span>
                            {step.is_required && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded">
                                Required
                              </span>
                            )}
                            {!isPersistable && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-500/20 text-gray-300 rounded">
                                Not synced
                              </span>
                            )}
                            {isCurrentStep && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-accent-primary/20 text-accent-primary rounded animate-pulse">
                                Current
                              </span>
                            )}
                          </div>
                          
                          {/* Step Details - Requirements 7.5 */}
                          <div className="flex items-center mt-1 text-sm text-text-muted space-x-3">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDuration(step.duration, true)}
                            </span>
                            {step.status === 'pending' && (
                              <span className="flex items-center text-xs text-text-muted/70">
                                Complete by {formatTime(step.end_time)}
                              </span>
                            )}
                          </div>

                          {/* Duration prior indicator - Requirements 7.3 */}
                          {step.metadata?.duration_prior_applied && (
                            <div className="mt-1 text-xs text-blue-400 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Duration based on your history
                            </div>
                          )}
                          
                          {/* Injected step indicator - Requirements 7.2 */}
                          {step.metadata?.injected && (
                            <div className="mt-1 text-xs text-purple-400 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Added based on yesterday's habits
                            </div>
                          )}

                          {/* Skip Reason */}
                          {step.skip_reason && (
                            <div className="mt-2 text-sm text-yellow-400 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Skipped: {step.skip_reason}
                            </div>
                          )}
                          
                          {/* Travel Fallback Warning - Requirements: Design - Error Handling - Travel Service Failures */}
                          {step.metadata?.fallback_used && (
                            <div className="mt-2 text-sm text-orange-400 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Travel time estimated (service unavailable)
                            </div>
                          )}
                        </div>

                        <div className="ml-2 flex items-center gap-1">
                          {onStepEdit && isPersistable && (
                            <button
                              onClick={() => beginEdit(step)}
                              className="px-2 py-1 text-xs rounded border border-border-primary text-text-muted hover:text-text-primary hover:border-border-secondary"
                            >
                              Edit
                            </button>
                          )}
                          {step.role === 'exit-gate' && (
                            <button
                              onClick={() => toggleStepExpansion(step.step_id)}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                            >
                              <svg
                                className={`w-5 h-5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {editingStepId === step.step_id && (
                        <div className="mt-3 rounded-lg border border-border-primary bg-surface-secondary/70 p-3 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="text-xs text-text-muted">
                              Name
                              <input
                                value={draftName}
                                onChange={(event) => setDraftName(event.target.value)}
                                className="mt-1 w-full rounded border border-border-primary bg-surface-primary px-2 py-1 text-sm text-text-primary"
                              />
                            </label>
                            <label className="text-xs text-text-muted">
                              Duration (minutes)
                              <input
                                type="number"
                                min={0}
                                max={240}
                                value={draftDuration}
                                onChange={(event) => setDraftDuration(event.target.value)}
                                className="mt-1 w-full rounded border border-border-primary bg-surface-primary px-2 py-1 text-sm text-text-primary"
                              />
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-text-muted">
                            <input
                              type="checkbox"
                              checked={saveAsTemplate}
                              onChange={(event) => setSaveAsTemplate(event.target.checked)}
                            />
                            Save as my default step
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => submitEdit(step.step_id)}
                              disabled={isSavingEdit}
                              className="px-3 py-1.5 text-xs rounded bg-accent-primary text-white disabled:opacity-50"
                            >
                              {isSavingEdit ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isSavingEdit}
                              className="px-3 py-1.5 text-xs rounded border border-border-primary text-text-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exit Gate Conditions - Expanded View */}
                {step.role === 'exit-gate' && isExpanded && (
                  <div className="px-4 pb-4 border-t border-border-primary">
                    <div className="mt-4">
                      <ExitGateDisplay
                        exitGate={exitGate}
                        onConditionToggle={onGateConditionToggle}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Exit Gate Status - Requirements 14.3, 14.4 */}
      <div className={`
        rounded-xl border-2 p-6
        ${exitGate.status === 'blocked' 
          ? 'bg-red-500/10 border-red-500/40' 
          : 'bg-green-500/10 border-green-500/40'
        }
      `}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Exit Readiness
          </h3>
          <div className={`
            px-4 py-2 rounded-lg font-semibold text-sm
            ${exitGate.status === 'blocked' 
              ? 'bg-red-500/20 text-red-400' 
              : 'bg-green-500/20 text-green-400'
            }
          `}>
            {exitGate.status === 'blocked' ? '🚫 Blocked' : '✅ Ready to Leave'}
          </div>
        </div>

        {/* Reliability indicator for exit gate suggestions - Requirements 7.1 */}
        {dailyContext && dailyContext.meds.reliability < 0.5 && (
          <div className="mb-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <div className="flex items-center text-sm text-yellow-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Exit gate suggestions may be less accurate due to limited recent data
              </span>
            </div>
          </div>
        )}

        {/* Blocked Reasons - Requirements 14.3 */}
        {exitGate.status === 'blocked' && exitGate.blocked_reasons.length > 0 && (
          <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
            <div className="text-sm font-medium text-red-400 mb-2">
              Missing items:
            </div>
            <ul className="space-y-1">
              {exitGate.blocked_reasons.map((reason, index) => (
                <li key={index} className="text-sm text-text-muted flex items-center">
                  <svg className="w-4 h-4 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gate Conditions Checklist */}
        <ExitGateDisplay
          exitGate={exitGate}
          onConditionToggle={onGateConditionToggle}
        />
      </div>
    </div>
  );
}

/**
 * Exit Gate Display Component
 * 
 * Displays gate conditions with manual toggles
 * Requirements: 3.5, 14.4
 */
function ExitGateDisplay({
  exitGate,
  onConditionToggle,
}: {
  exitGate: ExitGate;
  onConditionToggle: (conditionId: string, satisfied: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      {exitGate.conditions.map((condition) => (
        <label
          key={condition.id}
          className="flex items-center p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={condition.satisfied}
            onChange={(e) => onConditionToggle(condition.id, e.target.checked)}
            className="w-5 h-5 rounded border-2 border-gray-400 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-0 cursor-pointer"
          />
          <span className={`
            ml-3 text-sm font-medium
            ${condition.satisfied ? 'text-text-muted line-through' : 'text-text-primary'}
          `}>
            {condition.name}
          </span>
        </label>
      ))}
    </div>
  );
}
