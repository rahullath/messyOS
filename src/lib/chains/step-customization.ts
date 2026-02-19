import type { ChainStep, ChainTemplate } from './types';

export type ChainStepOverrides = Record<string, {
  name?: string;
  duration_estimate?: number;
  disabled?: boolean;
}>;

export type ChainCustomStep = {
  id: string;
  name: string;
  duration_estimate: number;
  is_required?: boolean;
  can_skip_when_late?: boolean;
  insert_after_id?: string;
};

export function normalizeStepDuration(duration: number, fallback: number): number {
  if (!Number.isFinite(duration)) return fallback;
  const rounded = Math.round(duration);
  if (rounded < 0) return fallback;
  return rounded;
}

export function applyChainStepOverrides(
  template: ChainTemplate,
  overrides?: ChainStepOverrides,
  customSteps: ChainCustomStep[] = []
): ChainTemplate {
  const hasOverrides = Boolean(overrides && Object.keys(overrides).length > 0);
  const hasCustomSteps = customSteps.length > 0;

  if (!hasOverrides && !hasCustomSteps) {
    return template;
  }

  const mappedSteps: ChainStep[] = template.steps.map((step) => {
    const override = overrides[step.id];
    if (!override) return step;

    return {
      ...step,
      name: typeof override.name === 'string' && override.name.trim().length > 0
        ? override.name.trim()
        : step.name,
      duration_estimate: typeof override.duration_estimate === 'number'
        ? normalizeStepDuration(override.duration_estimate, step.duration_estimate)
        : step.duration_estimate,
    };
  });

  const steps = mappedSteps.filter((step) => {
    const override = overrides?.[step.id];
    return override?.disabled !== true;
  });

  for (const customStep of customSteps) {
    const normalizedCustomStep: ChainStep = {
      id: customStep.id,
      name: customStep.name,
      duration_estimate: normalizeStepDuration(customStep.duration_estimate, 1),
      is_required: customStep.is_required ?? true,
      can_skip_when_late: customStep.can_skip_when_late ?? false,
    };

    const insertAfterId = customStep.insert_after_id;
    const insertAfterIndex = insertAfterId
      ? steps.findIndex((step) => step.id === insertAfterId)
      : -1;

    if (insertAfterIndex >= 0) {
      steps.splice(insertAfterIndex + 1, 0, normalizedCustomStep);
      continue;
    }

    const exitGateIndex = steps.findIndex((step) => step.id === 'exit-gate');
    if (exitGateIndex >= 0) {
      steps.splice(exitGateIndex, 0, normalizedCustomStep);
    } else {
      steps.push(normalizedCustomStep);
    }
  }

  return {
    ...template,
    steps,
  };
}

export type ReflowStep = {
  id: string;
  durationMinutes: number;
};

export type ReflowResult = {
  id: string;
  start: Date;
  end: Date;
  durationMinutes: number;
};

/**
 * Reflows steps backward from a fixed chain completion deadline.
 * This preserves step ordering and keeps the end of the final step stable.
 */
export function reflowStepsBackward(
  stepsInOrder: ReflowStep[],
  chainCompletionDeadline: Date
): ReflowResult[] {
  let currentEnd = new Date(chainCompletionDeadline);
  const reversed: ReflowResult[] = [];

  for (let i = stepsInOrder.length - 1; i >= 0; i--) {
    const step = stepsInOrder[i];
    const durationMinutes = Math.max(0, Math.round(step.durationMinutes));
    const end = new Date(currentEnd);
    const start = new Date(end.getTime() - durationMinutes * 60_000);
    reversed.push({
      id: step.id,
      start,
      end,
      durationMinutes,
    });
    currentEnd = start;
  }

  return reversed.reverse();
}
