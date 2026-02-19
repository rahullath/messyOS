import React, { useState, useEffect } from 'react';
import PlanGeneratorForm from './PlanGeneratorForm';
import ActivityList from './ActivityList';
import ExitTimeDisplay from './ExitTimeDisplay';
import DegradePlanButton from './DegradePlanButton';
import DeletePlanButton from './DeletePlanButton';
import PlanContextDisplay from './PlanContextDisplay';
import ChainView from './ChainView';
import { DEFAULT_GATE_CONDITIONS, ExitGateService } from '../../lib/chains/exit-gate';
import type { DailyPlan, EnergyState } from '../../types/daily-plan';
import type { ExitGate, GateCondition } from '../../lib/chains/types';

export default function DailyPlanPageContent() {
  type GenerateInput = {
    wakeTime: string;
    sleepTime: string;
    energyState: EnergyState;
    manualAnchor?: {
      title: string;
      startTime: string;
      durationMinutes: number;
      location?: string;
      anchorType: 'class' | 'seminar' | 'workshop' | 'appointment' | 'other';
      mustAttend: boolean;
      notes?: string;
    };
  };

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDegrading, setIsDegrading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chain' | 'timeline'>('chain');
  const [exitGateService, setExitGateService] = useState<ExitGateService | null>(null);
  const [exitGate, setExitGate] = useState<ExitGate | null>(null);
  const [gateTemplateConditions, setGateTemplateConditions] = useState<GateCondition[] | null>(null);
  const [manualAnchorRequired, setManualAnchorRequired] = useState(false);
  const [lastGenerateInput, setLastGenerateInput] = useState<GenerateInput | null>(null);

  // Fetch today's plan on mount
  useEffect(() => {
    fetchTodaysPlan();
    fetchExitGateTemplate();
  }, []);

  // Initialize exit gate when plan changes
  useEffect(() => {
    if (plan?.chains && plan.chains.length > 0) {
      const conditions = getInitialGateConditions(plan);
      const service = new ExitGateService(conditions);
      setExitGateService(service);
      setExitGate(service.evaluateGate());
      
      // Set chain view as default when chains exist
      setActiveTab('chain');
    } else {
      // No chains, default to timeline view
      setActiveTab('timeline');
      setExitGateService(null);
      setExitGate(null);
    }
  }, [plan, gateTemplateConditions]);

  const normalizeGateConditions = (rawConditions: unknown): GateCondition[] => {
    if (!Array.isArray(rawConditions)) {
      return gateTemplateConditions?.map((condition) => ({ ...condition }))
        || DEFAULT_GATE_CONDITIONS.map((condition) => ({ ...condition }));
    }

    const parsedConditions: GateCondition[] = rawConditions
      .map((value) => {
        if (!value || typeof value !== 'object') return null;
        const record = value as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id : null;
        if (!id) return null;

        const name = typeof record.name === 'string'
          ? record.name
          : DEFAULT_GATE_CONDITIONS.find((condition) => condition.id === id)?.name || id;

        return {
          id,
          name,
          satisfied: Boolean(record.satisfied),
        } as GateCondition;
      })
      .filter((condition): condition is GateCondition => Boolean(condition));

    const conditionMap = new Map<string, GateCondition>();

    for (const condition of DEFAULT_GATE_CONDITIONS) {
      conditionMap.set(condition.id, { ...condition });
    }

    for (const condition of parsedConditions) {
      conditionMap.set(condition.id, condition);
    }

    return Array.from(conditionMap.values());
  };

  const findExitGateBlock = (targetPlan: DailyPlan) => {
    if (!targetPlan.timeBlocks || targetPlan.timeBlocks.length === 0) {
      return null;
    }

    const firstChainId = targetPlan.chains?.[0]?.chain_id;

    return (
      targetPlan.timeBlocks.find((block) => {
        const metadata = (block.metadata || {}) as any;
        const role = metadata.role;
        if (!role || role.type !== 'exit-gate') return false;
        if (!firstChainId) return true;
        return metadata.chain_id === firstChainId || role.chain_id === firstChainId;
      }) ||
      targetPlan.timeBlocks.find((block) => {
        const role = ((block.metadata || {}) as any).role;
        return role?.type === 'exit-gate';
      }) ||
      null
    );
  };

  const getInitialGateConditions = (targetPlan: DailyPlan): GateCondition[] => {
    const exitGateBlock = findExitGateBlock(targetPlan);
    if (!exitGateBlock) {
      return DEFAULT_GATE_CONDITIONS.map((condition) => ({ ...condition }));
    }

    const metadata = (exitGateBlock.metadata || {}) as any;
    const roleConditions = metadata.role?.gate_conditions;
    return normalizeGateConditions(roleConditions);
  };

  const resolvePersistedStepBlock = (
    targetPlan: DailyPlan,
    step: (NonNullable<DailyPlan['chains']>[number]['steps'])[number]
  ) => {
    if (!targetPlan.timeBlocks || targetPlan.timeBlocks.length === 0) {
      return null;
    }

    const metadataBlockId = (step.metadata as any)?.time_block_id;
    if (typeof metadataBlockId === 'string') {
      const directMatch = targetPlan.timeBlocks.find((block) => block.id === metadataBlockId);
      if (directMatch) return directMatch;
    }

    const getTimeMs = (value: Date | string | undefined): number | null => {
      if (!value) return null;
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    };

    const stepStart = getTimeMs(step.start_time as Date | string);
    const stepEnd = getTimeMs(step.end_time as Date | string);

    return targetPlan.timeBlocks.find((block) => {
      const metadataStepId = (block.metadata as any)?.step_id || (block.metadata as any)?.stepId;
      if (metadataStepId === step.step_id) return true;

      if (block.activityName !== step.name) return false;
      const blockStart = getTimeMs(block.startTime as Date | string);
      const blockEnd = getTimeMs(block.endTime as Date | string);
      if (stepStart === null || stepEnd === null || blockStart === null || blockEnd === null) {
        return false;
      }

      // Allow small timestamp drift from serialization/timezone conversion.
      return Math.abs(blockStart - stepStart) <= 60_000 && Math.abs(blockEnd - stepEnd) <= 60_000;
    }) || null;
  };

  const fetchTodaysPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/daily-plan/today');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch plan: ${response.statusText}`);
      }
      
      const data = await response.json();
      const fetchedPlan = data.plan as DailyPlan | null;

      if (fetchedPlan && (!fetchedPlan.timeBlocks || fetchedPlan.timeBlocks.length === 0)) {
        setPlan(null);
        setManualAnchorRequired(true);
        setError('Plan was generated without activities. Add a manual anchor and generate again.');
      } else {
        setPlan(fetchedPlan);
      }
    } catch (err) {
      console.error('Error fetching plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (input: GenerateInput) => {
    try {
      setIsGenerating(true);
      setError(null);
      setLastGenerateInput(input);

      // Convert time strings to full ISO timestamps for today
      const today = new Date();
      const [wakeHour, wakeMinute] = input.wakeTime.split(':');
      const [sleepHour, sleepMinute] = input.sleepTime.split(':');
      
      const wakeTime = new Date(today);
      wakeTime.setHours(parseInt(wakeHour), parseInt(wakeMinute), 0, 0);
      
      const sleepTime = new Date(today);
      sleepTime.setHours(parseInt(sleepHour), parseInt(sleepMinute), 0, 0);

      let manualAnchorPayload: Record<string, unknown> | undefined;
      if (input.manualAnchor) {
        const [anchorHour, anchorMinute] = input.manualAnchor.startTime.split(':');
        const anchorStart = new Date(today);
        anchorStart.setHours(parseInt(anchorHour), parseInt(anchorMinute), 0, 0);
        const anchorEnd = new Date(anchorStart.getTime() + Math.max(15, input.manualAnchor.durationMinutes) * 60000);

        manualAnchorPayload = {
          title: input.manualAnchor.title,
          start_time: anchorStart.toISOString(),
          end_time: anchorEnd.toISOString(),
          location: input.manualAnchor.location,
          anchor_type: input.manualAnchor.anchorType,
          must_attend: input.manualAnchor.mustAttend,
          notes: input.manualAnchor.notes,
        };
      }

      const response = await fetch('/api/daily-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wakeTime: wakeTime.toISOString(),
          sleepTime: sleepTime.toISOString(),
          energyState: input.energyState,
          manualAnchor: manualAnchorPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 422 && errorData.error_code === 'MANUAL_ANCHOR_REQUIRED') {
          setManualAnchorRequired(true);
          setPlan(null);
          setError(errorData.details || 'Add a manual anchor to generate your plan.');
          return;
        }
        throw new Error(errorData.error || `Failed to generate plan: ${response.statusText}`);
      }

      const data = await response.json();
      const generatedPlan = data.plan as DailyPlan | null;
      if (generatedPlan && (!generatedPlan.timeBlocks || generatedPlan.timeBlocks.length === 0)) {
        setPlan(null);
        setManualAnchorRequired(true);
        setError('Plan was generated without activities. Add a manual anchor and generate again.');
      } else {
        setPlan(generatedPlan);
        setManualAnchorRequired(false);
      }
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
    if (lastGenerateInput) {
      handleGenerate(lastGenerateInput);
      return;
    }
    if (!plan) {
      fetchTodaysPlan();
    }
  };

  const handleDeleted = () => {
    // Reset state and show generation form
    setPlan(null);
    setError(null);
    setManualAnchorRequired(false);
  };

  const handleStepComplete = async (stepId: string) => {
    if (!plan?.chains || plan.chains.length === 0) return;

    let targetStep:
      | {
          chainIndex: number;
          stepIndex: number;
          step: (typeof plan.chains)[number]['steps'][number];
        }
      | null = null;

    for (let chainIndex = 0; chainIndex < plan.chains.length; chainIndex++) {
      const stepIndex = plan.chains[chainIndex].steps.findIndex(s => s.step_id === stepId);
      if (stepIndex >= 0) {
        targetStep = {
          chainIndex,
          stepIndex,
          step: plan.chains[chainIndex].steps[stepIndex],
        };
        break;
      }
    }

    if (!targetStep) {
      setError('Unable to locate the selected chain step.');
      return;
    }

    const matchedBlock = resolvePersistedStepBlock(plan, targetStep.step);

    if (!matchedBlock) {
      setError('This step is not synced to a persisted time block yet, so completion cannot be saved.');
      return;
    }

    const nextStatus = targetStep.step.status === 'completed' ? 'pending' : 'completed';
    const endpointAction = nextStatus === 'completed' ? 'complete' : 'uncomplete';
    const previousPlan = plan;

    setPlan((currentPlan) => {
      if (!currentPlan?.chains) return currentPlan;

      const nextChains = currentPlan.chains.map((chain, chainIndex) => {
        if (chainIndex !== targetStep!.chainIndex) return chain;

        const nextSteps = chain.steps.map((step, stepIndex) => {
          if (stepIndex !== targetStep!.stepIndex) return step;
          return {
            ...step,
            status: nextStatus as typeof step.status,
          };
        });

        return {
          ...chain,
          steps: nextSteps,
        };
      });

      return {
        ...currentPlan,
        chains: nextChains,
      };
    });

    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch(`/api/time-blocks/${matchedBlock.id}/${endpointAction}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to toggle completion: ${response.statusText}`);
      }
    } catch (err) {
      setPlan(previousPlan);
      console.error('Error toggling step completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to update step completion');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStepEdit = async (
    stepId: string,
    payload: { name: string; durationMinutes: number; saveAsTemplate: boolean }
  ) => {
    if (!plan?.chains || plan.chains.length === 0) return;

    let targetStep:
      | (NonNullable<DailyPlan['chains']>[number]['steps'][number])
      | null = null;

    for (const chain of plan.chains) {
      const step = chain.steps.find((item) => item.step_id === stepId);
      if (step) {
        targetStep = step;
        break;
      }
    }

    if (!targetStep) {
      setError('Unable to locate the selected chain step.');
      return;
    }

    const matchedBlock = resolvePersistedStepBlock(plan, targetStep);
    if (!matchedBlock) {
      setError('Unable to map chain step to a persisted time block.');
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch(`/api/time-blocks/${matchedBlock.id}/edit-step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          stepId,
          planId: plan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404 && errorData.error_code === 'STALE_TIME_BLOCK_REFERENCE') {
          await fetchTodaysPlan();

          const retryPlanResponse = await fetch('/api/daily-plan/today');
          const retryPlanPayload = await retryPlanResponse.json().catch(() => ({}));
          const retryPlan = retryPlanPayload?.plan as DailyPlan | null;

          if (retryPlan?.chains && retryPlan.timeBlocks) {
            let retryStep: (NonNullable<DailyPlan['chains']>[number]['steps'][number]) | null = null;
            for (const chain of retryPlan.chains) {
              const found = chain.steps.find((item) => item.step_id === stepId);
              if (found) {
                retryStep = found;
                break;
              }
            }

            if (retryStep) {
              const retryMatched = resolvePersistedStepBlock(retryPlan, retryStep);
              if (retryMatched) {
                const retryResponse = await fetch(`/api/time-blocks/${retryMatched.id}/edit-step`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ...payload,
                    stepId,
                    planId: retryPlan.id,
                  }),
                });

                if (retryResponse.ok) {
                  await fetchTodaysPlan();
                  return;
                }
              }
            }
          }
        }
        throw new Error(errorData.error || `Failed to edit step: ${response.statusText}`);
      }

      await fetchTodaysPlan();
    } catch (err) {
      console.error('Error editing chain step:', err);
      setError(err instanceof Error ? err.message : 'Failed to edit chain step');
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchExitGateTemplate = async () => {
    try {
      const response = await fetch('/api/daily-plan/exit-gate-template');
      if (!response.ok) return;

      const payload = await response.json();
      const conditions = normalizeGateConditions(payload?.gate_conditions);
      setGateTemplateConditions(conditions);
    } catch (err) {
      console.error('Failed to load exit gate template:', err);
    }
  };

  const handleGateConditionToggle = async (conditionId: string, satisfied: boolean) => {
    if (!exitGateService || !plan) return;

    const exitGateBlock = findExitGateBlock(plan);

    const previousConditions = exitGateService.getAllConditions();
    const previousGate = exitGate;

    try {
      setIsUpdating(true);
      setError(null);

      // Optimistic update
      exitGateService.toggleCondition(conditionId, satisfied);
      const updatedGate = exitGateService.evaluateGate();
      setExitGate(updatedGate);

      if (exitGateBlock) {
        const metadata = (exitGateBlock.metadata || {}) as any;
        const mergedRole = {
          ...(metadata.role || {}),
          gate_conditions: updatedGate.conditions,
        };

        const response = await fetch(`/api/time-blocks/${exitGateBlock.id}/update-meta`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metadata: {
              ...metadata,
              role: mergedRole,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to persist gate conditions: ${response.statusText}`);
        }

        // Keep local plan metadata in sync without refetch.
        setPlan((currentPlan) => {
          if (!currentPlan?.timeBlocks) return currentPlan;

          const nextBlocks = currentPlan.timeBlocks.map((block) => {
            if (block.id !== exitGateBlock.id) return block;

            const blockMetadata = (block.metadata || {}) as any;
            return {
              ...block,
              metadata: {
                ...blockMetadata,
                role: {
                  ...(blockMetadata.role || {}),
                  gate_conditions: updatedGate.conditions,
                },
              },
            };
          });

          return {
            ...currentPlan,
            timeBlocks: nextBlocks,
          };
        });
      } else {
        // If there is no day-level exit gate block yet, keep this as local state only.
        // Template editing is handled in Settings and should not be mutated from live-day toggles.
      }
    } catch (err) {
      // Rollback optimistic update
      const rollbackService = new ExitGateService(previousConditions);
      setExitGateService(rollbackService);
      setExitGate(previousGate || rollbackService.evaluateGate());
      console.error('Error updating exit gate condition:', err);
      setError(err instanceof Error ? err.message : 'Failed to update exit gate condition');
    } finally {
      setIsUpdating(false);
    }
  };

  const isChainStepPersistable = (stepId: string): boolean => {
    if (!plan?.chains || plan.chains.length === 0) return false;

    for (const chain of plan.chains) {
      const step = chain.steps.find((item) => item.step_id === stepId);
      if (step) {
        return Boolean(resolvePersistedStepBlock(plan, step));
      }
    }

    return false;
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
  if (error && plan) {
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
        {error && (
          <div className="mb-4 bg-accent-error/10 border border-accent-error/30 rounded-lg p-4">
            <p className="text-sm text-accent-error mb-3">{error}</p>
            <button
              onClick={handleRetry}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-accent-primary text-white"
            >
              Retry
            </button>
          </div>
        )}
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
        <PlanGeneratorForm
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          manualAnchorRequired={manualAnchorRequired}
        />
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

      {/* Tab Navigation - Requirements 13.4, 14.1 */}
      {plan.chains && plan.chains.length > 0 && (
        <div className="flex space-x-2 border-b border-border-primary">
          <button
            onClick={() => setActiveTab('chain')}
            className={`
              px-6 py-3 font-medium transition-colors relative
              ${activeTab === 'chain'
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-text-muted hover:text-text-primary'
              }
            `}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Chain View
              <span className="ml-2 px-2 py-0.5 text-xs bg-accent-primary/20 text-accent-primary rounded">
                Primary
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`
              px-6 py-3 font-medium transition-colors relative
              ${activeTab === 'timeline'
                ? 'text-accent-primary border-b-2 border-accent-primary'
                : 'text-text-muted hover:text-text-primary'
              }
            `}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timeline
            </div>
          </button>
        </div>
      )}

      {/* Chain View - Primary Interface - Requirements 13.4, 14.1 */}
      {activeTab === 'chain' && plan.chains && plan.chains.length > 0 && exitGate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - Chain View */}
          <div className="lg:col-span-2">
            <ChainView
              chain={plan.chains[0]}
              exitGate={exitGate}
              onStepComplete={handleStepComplete}
              onStepEdit={handleStepEdit}
              onGateConditionToggle={handleGateConditionToggle}
              isStepPersistable={isChainStepPersistable}
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
      )}

      {/* Timeline View - Secondary - Requirements 13.1, 13.3 */}
      {(activeTab === 'timeline' || !plan.chains || plan.chains.length === 0) && (
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
      )}

      {/* No Anchors Message - Requirements 14.5, Design: Error Handling - Calendar Service Failures */}
      {(!plan.chains || plan.chains.length === 0) && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 mr-2 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-400">
              <p className="font-medium mb-1">No calendar access. Showing basic plan.</p>
              <p className="text-xs text-blue-300">
                Your day is flexible! The timeline view shows your planned activities without calendar events.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
