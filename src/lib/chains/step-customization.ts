import type { ChainStep, ChainTemplate } from './types';

export type ChainStepOverrides = Record<string, {
  name?: string;
  duration_estimate?: number;
}>;

export function normalizeStepDuration(duration: number, fallback: number): number {
  if (!Number.isFinite(duration)) return fallback;
  const rounded = Math.round(duration);
  if (rounded < 0) return fallback;
  return rounded;
}

export function applyChainStepOverrides(
  template: ChainTemplate,
  overrides?: ChainStepOverrides
): ChainTemplate {
  if (!overrides || Object.keys(overrides).length === 0) {
    return template;
  }

  const steps: ChainStep[] = template.steps.map((step) => {
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
