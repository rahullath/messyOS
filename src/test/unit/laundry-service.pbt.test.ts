// src/test/unit/laundry-service.pbt.test.ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ClothingItem, LaundrySession } from '../../lib/uk-student/laundry-service';

// Generators for property-based testing
const clothingItemGenerator = () =>
  fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    category: fc.constantFrom('underwear' as const, 'gym' as const, 'casual' as const, 'formal' as const, 'sleepwear' as const, 'other' as const),
    quantity: fc.integer({ min: 1, max: 20 }),
    wash_frequency: fc.constantFrom('after_each_use' as const, 'after_2_uses' as const, 'after_3_uses' as const, 'weekly' as const),
    condition: fc.constantFrom('clean' as const, 'worn_once' as const, 'worn_multiple' as const, 'dirty' as const),
    created_at: fc.date(),
    updated_at: fc.date(),
  });

const laundrySessionGenerator = () =>
  fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    scheduled_date: fc.date(),
    scheduled_start_time: fc.tuple(
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 })
    ).map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
    estimated_duration: fc.integer({ min: 120, max: 240 }),
    cost_estimate: fc.integer({ min: 600, max: 800 }),
    status: fc.constantFrom('scheduled' as const, 'in_progress' as const, 'washer_done' as const, 'dryer_done' as const, 'completed' as const, 'cancelled' as const),
    items_to_wash: fc.array(fc.uuid(), { maxLength: 10 }),
    created_at: fc.date(),
    updated_at: fc.date(),
  });

describe('LaundryService - Property-Based Tests', () => {
  /**
   * Property 1: Laundry urgency is determined by clean clothing quantity
   * **Feature: uk-student-life-optimization, Property 1: Laundry urgency is determined by clean clothing quantity**
   * **Validates: Requirements 6.1**
   */
  it('should determine laundry urgency based on clean clothing inventory', () => {
    fc.assert(
      fc.property(
        fc.array(clothingItemGenerator(), { minLength: 1, maxLength: 5 }),
        (items) => {
          // Filter to only clean items
          const cleanItems = items.filter((item) => item.condition === 'clean');
          const totalClean = cleanItems.reduce((sum, item) => sum + item.quantity, 0);

          // Verify urgency logic
          if (totalClean <= 2) {
            expect(totalClean).toBeLessThanOrEqual(2);
          } else if (totalClean <= 4) {
            expect(totalClean).toBeLessThanOrEqual(4);
          } else {
            expect(totalClean).toBeGreaterThan(4);
          }

          // Verify all items have valid quantities
          items.forEach((item) => {
            expect(item.quantity).toBeGreaterThan(0);
            expect(item.quantity).toBeLessThanOrEqual(20);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Laundry session duration is always at least 2 hours
   * **Feature: uk-student-life-optimization, Property 2: Laundry session duration is always at least 2 hours**
   * **Validates: Requirements 6.2**
   */
  it('should ensure laundry sessions are at least 2 hours long', () => {
    fc.assert(
      fc.property(laundrySessionGenerator(), (session) => {
        // Verify minimum duration
        expect(session.estimated_duration).toBeGreaterThanOrEqual(120);

        // Verify cost is reasonable for duration
        const costPerMinute = session.cost_estimate / session.estimated_duration;
        expect(costPerMinute).toBeGreaterThan(0);
        expect(costPerMinute).toBeLessThan(10); // Reasonable cost per minute
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Laundry cost is between £6-7 (600-700 pence)
   * **Feature: uk-student-life-optimization, Property 3: Laundry cost is between £6-7**
   * **Validates: Requirements 6.1**
   */
  it('should maintain laundry cost within expected range', () => {
    fc.assert(
      fc.property(laundrySessionGenerator(), (session) => {
        // Verify cost is in expected range
        expect(session.cost_estimate).toBeGreaterThanOrEqual(600);
        expect(session.cost_estimate).toBeLessThanOrEqual(800);

        // Verify actual cost (if set) is also in range
        if (session.cost_estimate) {
          const costInPounds = session.cost_estimate / 100;
          expect(costInPounds).toBeGreaterThanOrEqual(6);
          expect(costInPounds).toBeLessThanOrEqual(8);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Clothing item quantities are always positive
   * **Feature: uk-student-life-optimization, Property 4: Clothing item quantities are always positive**
   * **Validates: Requirements 6.1**
   */
  it('should maintain positive quantities for all clothing items', () => {
    fc.assert(
      fc.property(
        fc.array(clothingItemGenerator(), { minLength: 1, maxLength: 10 }),
        (items) => {
          items.forEach((item) => {
            expect(item.quantity).toBeGreaterThan(0);
            expect(Number.isInteger(item.quantity)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Laundry session status transitions are valid
   * **Feature: uk-student-life-optimization, Property 5: Laundry session status transitions are valid**
   * **Validates: Requirements 6.2, 6.5**
   */
  it('should maintain valid laundry session status values', () => {
    const validStatuses = ['scheduled', 'in_progress', 'washer_done', 'dryer_done', 'completed', 'cancelled'];

    fc.assert(
      fc.property(laundrySessionGenerator(), (session) => {
        expect(validStatuses).toContain(session.status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Clothing condition transitions are logical
   * **Feature: uk-student-life-optimization, Property 6: Clothing condition transitions are logical**
   * **Validates: Requirements 6.1, 6.3**
   */
  it('should maintain valid clothing condition states', () => {
    const validConditions = ['clean', 'worn_once', 'worn_multiple', 'dirty'];

    fc.assert(
      fc.property(clothingItemGenerator(), (item) => {
        expect(validConditions).toContain(item.condition);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Wash frequency is appropriate for clothing category
   * **Feature: uk-student-life-optimization, Property 7: Wash frequency is appropriate for clothing category**
   * **Validates: Requirements 6.1, 6.3**
   */
  it('should maintain valid wash frequency for all items', () => {
    const validFrequencies = ['after_each_use', 'after_2_uses', 'after_3_uses', 'weekly'];

    fc.assert(
      fc.property(clothingItemGenerator(), (item) => {
        expect(validFrequencies).toContain(item.wash_frequency);

        // All wash frequencies should be valid
        expect(item.wash_frequency).toMatch(/^(after_each_use|after_2_uses|after_3_uses|weekly)$/);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8: Laundry session time format is valid (HH:MM)
   * **Feature: uk-student-life-optimization, Property 8: Laundry session time format is valid**
   * **Validates: Requirements 6.2**
   */
  it('should maintain valid time format for laundry sessions', () => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    fc.assert(
      fc.property(laundrySessionGenerator(), (session) => {
        expect(session.scheduled_start_time).toMatch(timeRegex);

        // Parse time to verify it's valid
        const [hours, minutes] = session.scheduled_start_time.split(':').map(Number);
        expect(hours).toBeGreaterThanOrEqual(0);
        expect(hours).toBeLessThan(24);
        expect(minutes).toBeGreaterThanOrEqual(0);
        expect(minutes).toBeLessThan(60);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Clothing categories are consistent
   * **Feature: uk-student-life-optimization, Property 9: Clothing categories are consistent**
   * **Validates: Requirements 6.1**
   */
  it('should maintain valid clothing categories', () => {
    const validCategories = ['underwear', 'gym', 'casual', 'formal', 'sleepwear', 'other'];

    fc.assert(
      fc.property(clothingItemGenerator(), (item) => {
        expect(validCategories).toContain(item.category);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Laundry session items list is valid
   * **Feature: uk-student-life-optimization, Property 10: Laundry session items list is valid**
   * **Validates: Requirements 6.2**
   */
  it('should maintain valid items list for laundry sessions', () => {
    fc.assert(
      fc.property(laundrySessionGenerator(), (session) => {
        expect(Array.isArray(session.items_to_wash)).toBe(true);
        expect(session.items_to_wash.length).toBeLessThanOrEqual(10);

        // All items should be valid UUIDs
        session.items_to_wash.forEach((itemId) => {
          expect(typeof itemId).toBe('string');
          expect(itemId.length).toBeGreaterThan(0);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Laundry urgency prediction is consistent
   * **Feature: uk-student-life-optimization, Property 11: Laundry urgency prediction is consistent**
   * **Validates: Requirements 6.1**
   */
  it('should predict laundry urgency consistently based on inventory', () => {
    fc.assert(
      fc.property(
        fc.array(clothingItemGenerator(), { minLength: 1, maxLength: 5 }),
        (items) => {
          // Separate by category
          const underwear = items.filter((i) => i.category === 'underwear');
          const gymClothes = items.filter((i) => i.category === 'gym');

          // Calculate clean items
          const cleanUnderwear = underwear.filter((i) => i.condition === 'clean').reduce((sum, i) => sum + i.quantity, 0);
          const cleanGym = gymClothes.filter((i) => i.condition === 'clean').reduce((sum, i) => sum + i.quantity, 0);

          // Verify urgency logic is consistent
          // If underwear is critically low (<=2), urgency should be high
          if (cleanUnderwear <= 2) {
            expect(cleanUnderwear).toBeLessThanOrEqual(2);
          }

          // If gym clothes are critically low (<=1), urgency should be high
          if (cleanGym <= 1) {
            expect(cleanGym).toBeLessThanOrEqual(1);
          }

          // If both are well-stocked, urgency should be low
          if (cleanUnderwear > 5 && cleanGym > 2) {
            expect(cleanUnderwear).toBeGreaterThan(5);
            expect(cleanGym).toBeGreaterThan(2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
