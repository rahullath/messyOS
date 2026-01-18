// Integration test for Daily Plan Builder
import { describe, it, expect } from 'vitest';
import { PlanBuilderService } from '../../lib/daily-plan/plan-builder';

describe('Daily Plan Builder - Unit Tests', () => {
  it('should export PlanBuilderService class', () => {
    expect(PlanBuilderService).toBeDefined();
  });

  it('should have required methods', () => {
    // Verify the class has the expected methods
    expect(PlanBuilderService.prototype.generateDailyPlan).toBeDefined();
  });
});

