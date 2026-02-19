import { describe, expect, it } from 'vitest';
import { applyChainStepOverrides, reflowStepsBackward } from '../../lib/chains/step-customization';

describe('chain step customization helpers', () => {
  it('applies name and duration overrides by template step id', () => {
    const template = {
      anchor_type: 'other' as const,
      steps: [
        { id: 'bathroom', name: 'Bathroom', duration_estimate: 10, is_required: true, can_skip_when_late: false },
        { id: 'hygiene', name: 'Hygiene', duration_estimate: 5, is_required: true, can_skip_when_late: false },
      ],
    };

    const result = applyChainStepOverrides(template, {
      bathroom: { name: 'Bathroom + meds', duration_estimate: 14 },
    });

    expect(result.steps[0].name).toBe('Bathroom + meds');
    expect(result.steps[0].duration_estimate).toBe(14);
    expect(result.steps[1].name).toBe('Hygiene');
  });

  it('reflows steps backward from fixed deadline while preserving order', () => {
    const deadline = new Date('2026-02-19T09:45:00.000Z');
    const reflowed = reflowStepsBackward(
      [
        { id: 'a', durationMinutes: 10 },
        { id: 'b', durationMinutes: 5 },
        { id: 'c', durationMinutes: 2 },
      ],
      deadline
    );

    expect(reflowed[2].end.toISOString()).toBe(deadline.toISOString());
    expect(reflowed[0].id).toBe('a');
    expect(reflowed[1].id).toBe('b');
    expect(reflowed[2].id).toBe('c');
    expect(reflowed[0].start < reflowed[1].start).toBe(true);
    expect(reflowed[1].start < reflowed[2].start).toBe(true);
  });
});
