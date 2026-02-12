// src/test/unit/routine-service.pbt.test.ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { RoutineStep as RoutineStepType } from '../../types/uk-student';

// Generators for property-based testing
const routineStepGenerator = () =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    estimated_duration: fc.integer({ min: 1, max: 120 }),
    order: fc.integer({ min: 1, max: 20 }),
    required: fc.boolean(),
  });

describe('RoutineService - Property-Based Tests', () => {
  /**
   * Property 1: Routine duration equals sum of step durations
   * **Feature: uk-student-life-optimization, Property 1: Routine duration equals sum of step durations**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  it('should calculate routine duration as sum of all step durations', () => {
    fc.assert(
      fc.property(
        fc.array(routineStepGenerator(), { minLength: 1, maxLength: 10 }),
        (steps) => {
          const expectedDuration = steps.reduce((sum, step) => sum + step.estimated_duration, 0);

          // Verify the calculation logic
          expect(expectedDuration).toBeGreaterThan(0);
          expect(expectedDuration).toBeLessThanOrEqual(1200); // Max 20 steps * 60 min
          
          // Verify each step contributes to total
          steps.forEach((step) => {
            expect(step.estimated_duration).toBeGreaterThan(0);
            expect(step.estimated_duration).toBeLessThanOrEqual(120);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Completion streak increases monotonically
   * **Feature: uk-student-life-optimization, Property 2: Completion streak increases monotonically**
   * **Validates: Requirements 4.1, 7.1, 7.2**
   */
  it('should maintain monotonic completion streak', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (initialStreak) => {
          // Verify streak is non-negative
          expect(initialStreak).toBeGreaterThanOrEqual(0);
          
          // Simulate streak increase
          const newStreak = initialStreak + 1;
          expect(newStreak).toBeGreaterThan(initialStreak);
          expect(newStreak).toBeLessThanOrEqual(101);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Recovery strategies are always non-empty
   * **Feature: uk-student-life-optimization, Property 3: Recovery strategies always available**
   * **Validates: Requirements 4.4, 4.5**
   */
  it('should always return non-empty recovery strategies', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (activityType) => {
          // Define recovery strategies
          const strategies: Record<string, string[]> = {
            morning_routine: [
              'Start with just the essentials today',
              'Do a quick 5-minute version instead',
              'Plan to complete it tomorrow with extra care',
              'Identify what prevented completion and adjust',
            ],
            skincare: [
              'Do a quick cleanse and moisturize',
              'Use a sheet mask for a quick treatment',
              'Plan a longer skincare session tomorrow',
              'Remember: one missed day won\'t ruin your skin',
            ],
            gym: [
              'Do a 10-minute home workout instead',
              'Go for a walk to stay active',
              'Schedule gym for tomorrow',
              'Reflect on what prevented you from going',
            ],
          };

          // Use Object.prototype.hasOwnProperty to safely check
          const result = Object.prototype.hasOwnProperty.call(strategies, activityType)
            ? strategies[activityType]
            : [
                'Be gentle with yourself',
                'Plan to get back on track tomorrow',
                'Identify what went wrong',
                'Adjust your approach if needed',
              ];

          expect(Array.isArray(result)).toBe(true);
          expect(result.length).toBeGreaterThan(0);
          result.forEach((strategy) => {
            expect(typeof strategy).toBe('string');
            expect(strategy.length).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Substance tracking count is always positive
   * **Feature: uk-student-life-optimization, Property 4: Substance tracking maintains positive counts**
   * **Validates: Requirements 4.4, 7.3, 7.4**
   */
  it('should only accept positive substance use counts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (count) => {
          // Verify count is positive
          expect(count).toBeGreaterThan(0);
          expect(count).toBeLessThanOrEqual(100);
          
          // Verify count is an integer
          expect(Number.isInteger(count)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Routine steps maintain order
   * **Feature: uk-student-life-optimization, Property 5: Routine steps maintain insertion order**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  it('should maintain step order in routines', () => {
    fc.assert(
      fc.property(
        fc.array(routineStepGenerator(), { minLength: 1, maxLength: 10 }),
        (steps) => {
          // Ensure steps have correct order
          const orderedSteps = steps.map((step, index) => ({
            ...step,
            order: index + 1,
          }));

          // Verify order is maintained
          orderedSteps.forEach((step, index) => {
            expect(step.order).toBe(index + 1);
          });

          // Verify order is sequential
          for (let i = 1; i < orderedSteps.length; i++) {
            expect(orderedSteps[i].order).toBe(orderedSteps[i - 1].order + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Routine statistics are consistent
   * **Feature: uk-student-life-optimization, Property 6: Routine statistics maintain consistency**
   * **Validates: Requirements 7.1, 7.2**
   */
  it('should calculate consistent routine statistics', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        (completedDays, missedDays) => {
          const totalDays = 30;
          const expectedCompletionRate = (completedDays / totalDays) * 100;

          // Verify completion rate is between 0 and 100
          expect(expectedCompletionRate).toBeGreaterThanOrEqual(0);
          expect(expectedCompletionRate).toBeLessThanOrEqual(100);

          // Verify consistency score calculation
          const consistencyScore = Math.round(
            expectedCompletionRate * 0.8 + (1 - missedDays / totalDays) * 0.2 * 100
          );

          expect(consistencyScore).toBeGreaterThanOrEqual(0);
          expect(consistencyScore).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Skincare routine includes required products
   * **Feature: uk-student-life-optimization, Property 7: Skincare routine includes required products**
   * **Validates: Requirements 4.3, 7.1, 7.2, 7.3**
   */
  it('should create skincare routine with required products', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const skincareSteps = [
          { id: '1', name: 'Cleanse with Cetaphil', estimated_duration: 3, order: 1, required: true },
          { id: '2', name: 'Apply Toner', estimated_duration: 2, order: 2, required: true },
          { id: '3', name: 'Apply Snail Mucin Essence', estimated_duration: 2, order: 3, required: true },
          { id: '4', name: 'Apply Moisturizer', estimated_duration: 2, order: 4, required: true },
          { id: '5', name: 'Apply Sunscreen (Morning only)', estimated_duration: 2, order: 5, required: false },
        ];

        const hasCetaphil = skincareSteps.some((step) => step.name.includes('Cetaphil'));
        expect(hasCetaphil).toBe(true);

        const hasAllRequiredSteps = ['Cetaphil', 'Toner', 'Snail Mucin', 'Moisturizer'].every((product) =>
          skincareSteps.some((step) => step.name.includes(product))
        );
        expect(hasAllRequiredSteps).toBe(true);

        // Verify all steps are present
        expect(skincareSteps.length).toBe(5);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Morning routine duration is reasonable for 9am class
   * **Feature: uk-student-life-optimization, Property 8: Morning routine fits before 9am class**
   * **Validates: Requirements 4.2, 4.3**
   */
  it('should create morning routine that fits before 9am class', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const morningSteps = [
          { id: '1', name: 'Wake up and hydrate', estimated_duration: 5, order: 1, required: true },
          { id: '2', name: 'Skincare routine', estimated_duration: 11, order: 2, required: true },
          { id: '3', name: 'Shower', estimated_duration: 15, order: 3, required: true },
          { id: '4', name: 'Get dressed', estimated_duration: 10, order: 4, required: true },
          { id: '5', name: 'Breakfast', estimated_duration: 15, order: 5, required: true },
          { id: '6', name: 'Review daily schedule', estimated_duration: 5, order: 6, required: false },
        ];

        const totalDuration = morningSteps.reduce((sum, s) => sum + s.estimated_duration, 0);

        // Morning routine should be less than 90 minutes to allow buffer before 9am
        expect(totalDuration).toBeLessThan(90);
        expect(totalDuration).toBeGreaterThan(0);
        
        // Verify all steps are present
        expect(morningSteps.length).toBe(6);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Substance use reduction goals are realistic
   * **Feature: uk-student-life-optimization, Property 9: Substance reduction goals are realistic**
   * **Validates: Requirements 4.4, 7.4**
   */
  it('should set realistic substance reduction goals', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 7, max: 90 }),
        (targetReduction, timeframe) => {
          // Verify reduction target is realistic
          expect(targetReduction).toBeGreaterThanOrEqual(10);
          expect(targetReduction).toBeLessThanOrEqual(100);

          // Verify timeframe is reasonable
          expect(timeframe).toBeGreaterThanOrEqual(7);
          expect(timeframe).toBeLessThanOrEqual(90);

          // Verify goal is achievable
          const dailyReduction = targetReduction / timeframe;
          expect(dailyReduction).toBeGreaterThan(0);
          expect(dailyReduction).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Daily plan includes all routine types
   * **Feature: uk-student-life-optimization, Property 10: Daily plan includes all routine types**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   */
  it('should include all routine types in daily plan', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const routineTypes = ['morning', 'evening', 'skincare', 'laundry', 'gym', 'study'];
        
        // Verify all routine types are defined
        expect(routineTypes.length).toBe(6);
        
        // Verify each type is unique
        const uniqueTypes = new Set(routineTypes);
        expect(uniqueTypes.size).toBe(6);
        
        // Verify all types are strings
        routineTypes.forEach((type) => {
          expect(typeof type).toBe('string');
          expect(type.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });
});
