/**
 * Checkpoint tests for Habits v2.1 parser and taxonomy
 * 
 * These tests verify that the basic functionality of the parser
 * and taxonomy systems work correctly.
 * 
 * Task: 4. Checkpoint - Ensure parser tests pass
 */

import { describe, it, expect } from 'vitest';
import { parseNote } from '../../lib/habits/note-parser';
import { normalizeUnit, inferSemanticType, isBreakHabit, SemanticType } from '../../lib/habits/taxonomy';

describe('Habits v2.1 Checkpoint Tests', () => {
  describe('Taxonomy - Unit Normalization', () => {
    it('should normalize "mealy" to "meals"', () => {
      expect(normalizeUnit('mealy')).toBe('meals');
    });

    it('should normalize "sesh" to "sessions"', () => {
      expect(normalizeUnit('sesh')).toBe('sessions');
    });

    it('should be idempotent for canonical forms', () => {
      expect(normalizeUnit('meals')).toBe('meals');
      expect(normalizeUnit('sessions')).toBe('sessions');
      expect(normalizeUnit('pouches')).toBe('pouches');
    });
  });

  describe('Taxonomy - Semantic Type Inference', () => {
    it('should infer POT_USE from "No Pot"', () => {
      expect(inferSemanticType('No Pot')).toBe(SemanticType.POT_USE);
    });

    it('should infer MEALS_COOKED from "Meals Cooked"', () => {
      expect(inferSemanticType('Meals Cooked')).toBe(SemanticType.MEALS_COOKED);
    });

    it('should infer SHOWER from "Shower"', () => {
      expect(inferSemanticType('Shower')).toBe(SemanticType.SHOWER);
    });

    it('should return null for unknown habits', () => {
      expect(inferSemanticType('Unknown Habit')).toBeNull();
    });
  });

  describe('Taxonomy - Break Habit Detection', () => {
    it('should identify POT_USE as a break habit', () => {
      expect(isBreakHabit(SemanticType.POT_USE)).toBe(true);
    });

    it('should identify ENERGY_DRINK as a break habit', () => {
      expect(isBreakHabit(SemanticType.ENERGY_DRINK)).toBe(true);
    });

    it('should identify MEALS_COOKED as a build habit', () => {
      expect(isBreakHabit(SemanticType.MEALS_COOKED)).toBe(false);
    });

    it('should identify GYM as a build habit', () => {
      expect(isBreakHabit(SemanticType.GYM)).toBe(false);
    });
  });

  describe('Parser - Strength Extraction', () => {
    it('should extract strength from "6mg"', () => {
      const result = parseNote('6mg');
      expect(result.strength_mg).toBe(6);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should extract strength from "13.5 mg"', () => {
      const result = parseNote('13.5 mg');
      expect(result.strength_mg).toBe(13.5);
    });

    it('should extract strength from "50mg pouch"', () => {
      const result = parseNote('50mg pouch');
      expect(result.strength_mg).toBe(50);
      expect(result.nicotine).toBeDefined();
    });
  });

  describe('Parser - Count Extraction', () => {
    it('should extract count range from "2-3 pouches"', () => {
      const result = parseNote('2-3 pouches');
      expect(result.count_range).toEqual({ min: 2, max: 3 });
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should extract single count from "1 session"', () => {
      const result = parseNote('1 session');
      expect(result.count).toBe(1);
    });
  });

  describe('Parser - Cannabis Method', () => {
    it('should extract vaporizer method', () => {
      const result = parseNote('1 sesh with vaporizer');
      expect(result.cannabis).toBeDefined();
      expect(result.cannabis?.method).toBe('vaporizer');
      expect(result.cannabis?.sessions).toBe(1);
    });

    it('should extract bong method', () => {
      const result = parseNote('1 sesh with bong');
      expect(result.cannabis).toBeDefined();
      expect(result.cannabis?.method).toBe('bong');
    });

    it('should detect shared context', () => {
      const result = parseNote('1 sesh shared with friends');
      expect(result.cannabis).toBeDefined();
      expect(result.cannabis?.shared).toBe(true);
    });
  });

  describe('Parser - Shower Type', () => {
    it('should extract reg shower type', () => {
      const result = parseNote('reg shower');
      expect(result.shower).toBeDefined();
      expect(result.shower?.type).toBe('reg_shower');
    });

    it('should extract head shower type', () => {
      const result = parseNote('head shower');
      expect(result.shower).toBeDefined();
      expect(result.shower?.type).toBe('head_shower');
    });

    it('should detect skincare inclusion', () => {
      const result = parseNote('reg shower with skincare');
      expect(result.shower).toBeDefined();
      expect(result.shower?.includes_skincare).toBe(true);
    });

    it('should detect oral hygiene inclusion', () => {
      const result = parseNote('shower with oral hygiene');
      expect(result.shower).toBeDefined();
      expect(result.shower?.includes_oral).toBe(true);
    });
  });

  describe('Parser - Caffeine Product', () => {
    it('should extract monster product', () => {
      const result = parseNote('monster ultra white');
      expect(result.caffeine).toBeDefined();
      expect(result.caffeine?.product).toContain('monster');
      expect(result.caffeine?.brand).toContain('ultra white');
    });

    it('should extract red bull product', () => {
      const result = parseNote('red bull');
      expect(result.caffeine).toBeDefined();
      expect(result.caffeine?.product).toContain('red bull');
    });
  });

  describe('Parser - Time Range (Sleep)', () => {
    it('should extract time range from "11pm-7am"', () => {
      const result = parseNote('slept 11pm-7am');
      expect(result.sleep).toBeDefined();
      expect(result.sleep?.slept_from).toBeDefined();
      expect(result.sleep?.slept_to).toBeDefined();
    });

    it('should extract time range with minutes', () => {
      const result = parseNote('slept 1:16am-5:15am');
      expect(result.sleep).toBeDefined();
      expect(result.sleep?.slept_from).toContain('01:16');
      expect(result.sleep?.slept_to).toContain('05:15');
    });
  });

  describe('Parser - Graceful Degradation', () => {
    it('should handle empty notes', () => {
      const result = parseNote('');
      expect(result.confidence).toBe(0);
      expect(result.parse_method).toBe('failed');
    });

    it('should handle malformed notes with low confidence', () => {
      const result = parseNote('xyz123 unparseable');
      expect(result.confidence).toBeLessThan(0.7);
      // Note: Some text may still get partial matches, so we check for lower confidence
    });

    it('should preserve original text on failure', () => {
      const originalText = 'unparseable content';
      const result = parseNote(originalText);
      expect(result.original_text).toBe(originalText);
    });

    it('should handle very long notes', () => {
      const longNote = 'a'.repeat(15000);
      const result = parseNote(longNote);
      expect(result).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle unicode characters', () => {
      const result = parseNote('shower 🚿 with skincare 💆');
      expect(result).toBeDefined();
      expect(result.shower).toBeDefined();
    });
  });

  describe('Parser - Duration Extraction', () => {
    it('should extract duration in hours', () => {
      const result = parseNote('3 hours');
      expect(result.duration_minutes).toBe(180);
    });

    it('should extract duration in minutes', () => {
      const result = parseNote('45 minutes');
      expect(result.duration_minutes).toBe(45);
    });

    it('should extract duration with decimal', () => {
      const result = parseNote('2.5 hours');
      expect(result.duration_minutes).toBe(150);
    });
  });

  describe('Parser - Social Context', () => {
    it('should extract social context', () => {
      const result = parseNote('with friends');
      expect(result.social).toBeDefined();
      expect(result.social?.context).toContain('with friends');
    });

    it('should extract location', () => {
      const result = parseNote('at party');
      expect(result.social).toBeDefined();
      expect(result.social?.location).toContain('at party');
    });
  });

  describe('Parser - Confidence Scoring', () => {
    it('should have high confidence for well-structured notes', () => {
      const result = parseNote('2-3 pouches 6mg');
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.parse_method).toBe('deterministic');
    });

    it('should have low confidence for ambiguous notes', () => {
      const result = parseNote('maybe later');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });
});
