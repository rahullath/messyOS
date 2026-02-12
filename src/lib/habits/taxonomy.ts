/**
 * Habit Taxonomy System
 * 
 * Provides semantic classification of habits with normalized units.
 * This module enables consistent understanding of different habit names
 * across the system.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * Semantic types for habit classification
 * 
 * These types represent the real-world meaning of habits,
 * allowing the system to understand and process habits consistently
 * regardless of their display names.
 */
export enum SemanticType {
  NICOTINE_POUCHES = 'NICOTINE_POUCHES',
  VAPING_PUFFS = 'VAPING_PUFFS',
  POT_USE = 'POT_USE',
  ENERGY_DRINK = 'ENERGY_DRINK',
  MEALS_COOKED = 'MEALS_COOKED',
  ORAL_HYGIENE_SESSIONS = 'ORAL_HYGIENE_SESSIONS',
  SHOWER = 'SHOWER',
  SKINCARE = 'SKINCARE',
  MEDS = 'MEDS',
  STEP_OUT = 'STEP_OUT',
  SOCIALIZE = 'SOCIALIZE',
  GYM = 'GYM',
  SLEEP_PROXY = 'SLEEP_PROXY',
}

/**
 * Habit taxonomy metadata
 * 
 * Describes the semantic classification and behavior of a habit.
 */
export interface HabitTaxonomy {
  semantic_type: SemanticType;
  normalized_unit: string; // 'pouches', 'puffs', 'meals', 'sessions', 'drinks', 'minutes'
  is_break_habit: boolean; // true for "No Pot", "No Energy Drink"
  target_operator?: 'AT_LEAST' | 'AT_MOST' | 'EXACTLY';
  target_value?: number;
}

/**
 * Unit normalization map
 * 
 * Maps various unit spellings and variations to canonical forms.
 * This ensures consistency across imports and user input.
 */
const UNIT_NORMALIZATION: Record<string, string> = {
  'mealy': 'meals',
  'meal': 'meals',
  'session': 'sessions',
  'sesh': 'sessions',
  'pouch': 'pouches',
  'puff': 'puffs',
  'drink': 'drinks',
  'min': 'minutes',
  'minute': 'minutes',
};

/**
 * Habit name patterns for semantic type inference
 * 
 * Maps regex patterns to semantic types for automatic classification.
 */
const SEMANTIC_TYPE_PATTERNS: Array<{ pattern: RegExp; type: SemanticType }> = [
  // Nicotine
  { pattern: /nicotine|pouch|zyns?/i, type: SemanticType.NICOTINE_POUCHES },
  { pattern: /vap(e|ing)|puff/i, type: SemanticType.VAPING_PUFFS },
  
  // Cannabis
  { pattern: /pot|cannabis|weed|marijuana|sesh/i, type: SemanticType.POT_USE },
  
  // Caffeine
  { pattern: /energy\s*drink|monster|lucozade|red\s*bull|caffeine/i, type: SemanticType.ENERGY_DRINK },
  
  // Meals
  { pattern: /meal|cook|food|eat/i, type: SemanticType.MEALS_COOKED },
  
  // Hygiene
  { pattern: /oral|teeth|brush|floss/i, type: SemanticType.ORAL_HYGIENE_SESSIONS },
  { pattern: /shower|bath|wash/i, type: SemanticType.SHOWER },
  { pattern: /skincare|skin|moisturi[sz]e/i, type: SemanticType.SKINCARE },
  
  // Health
  { pattern: /med(s|ication)?|pill|supplement/i, type: SemanticType.MEDS },
  
  // Activity
  { pattern: /step\s*out|leave|go\s*out/i, type: SemanticType.STEP_OUT },
  { pattern: /sociali[sz]e|friends|hangout|hang\s*out/i, type: SemanticType.SOCIALIZE },
  { pattern: /gym|workout|exercise|fitness/i, type: SemanticType.GYM },
  
  // Sleep
  { pattern: /sleep|rest|bed/i, type: SemanticType.SLEEP_PROXY },
];

/**
 * Break habits - habits where success means NOT doing the activity
 */
const BREAK_HABIT_TYPES = new Set<SemanticType>([
  SemanticType.POT_USE,
  SemanticType.ENERGY_DRINK,
  SemanticType.NICOTINE_POUCHES,
  SemanticType.VAPING_PUFFS,
]);

/**
 * Normalize a unit string to its canonical form
 * 
 * @param unit - The unit string to normalize (e.g., "mealy", "session", "pouch")
 * @returns The normalized unit string (e.g., "meals", "sessions", "pouches")
 * 
 * Requirements: 4.2
 * 
 * @example
 * normalizeUnit("mealy") // returns "meals"
 * normalizeUnit("sesh") // returns "sessions"
 * normalizeUnit("meals") // returns "meals" (idempotent)
 */
export function normalizeUnit(unit: string): string {
  const lowerUnit = unit.toLowerCase().trim();
  
  // Return normalized form if it exists in the map
  if (UNIT_NORMALIZATION[lowerUnit]) {
    return UNIT_NORMALIZATION[lowerUnit];
  }
  
  // If already in canonical form, return as-is
  const canonicalForms = new Set(Object.values(UNIT_NORMALIZATION));
  if (canonicalForms.has(lowerUnit)) {
    return lowerUnit;
  }
  
  // Return original if no normalization found
  return lowerUnit;
}

/**
 * Infer semantic type from habit name and optional unit
 * 
 * Uses pattern matching to automatically classify habits based on their names.
 * This enables the system to understand habit semantics without manual tagging.
 * 
 * @param habitName - The name of the habit (e.g., "No Pot", "Meals Cooked")
 * @param unit - Optional unit hint (e.g., "pouches", "sessions")
 * @returns The inferred semantic type, or null if no match found
 * 
 * Requirements: 4.1, 4.3
 * 
 * @example
 * inferSemanticType("No Pot") // returns SemanticType.POT_USE
 * inferSemanticType("Meals Cooked", "meals") // returns SemanticType.MEALS_COOKED
 * inferSemanticType("Unknown Habit") // returns null
 */
export function inferSemanticType(
  habitName: string,
  unit?: string
): SemanticType | null {
  // Try to match by habit name first
  for (const { pattern, type } of SEMANTIC_TYPE_PATTERNS) {
    if (pattern.test(habitName)) {
      return type;
    }
  }
  
  // Try to match by unit if provided
  if (unit) {
    const normalizedUnit = normalizeUnit(unit);
    
    // Unit-based inference
    if (normalizedUnit === 'pouches') {
      return SemanticType.NICOTINE_POUCHES;
    }
    if (normalizedUnit === 'puffs') {
      return SemanticType.VAPING_PUFFS;
    }
    if (normalizedUnit === 'meals') {
      return SemanticType.MEALS_COOKED;
    }
    if (normalizedUnit === 'sessions') {
      // Could be pot, oral hygiene, or socialize - ambiguous
      // Return null to avoid incorrect classification
      return null;
    }
    if (normalizedUnit === 'drinks') {
      return SemanticType.ENERGY_DRINK;
    }
    if (normalizedUnit === 'minutes') {
      // Too generic - could be many things
      return null;
    }
  }
  
  // No match found
  return null;
}

/**
 * Determine if a semantic type represents a break habit
 * 
 * Break habits are those where success means NOT doing the activity
 * (e.g., "No Pot", "No Energy Drink"). Build habits are those where
 * success means doing the activity (e.g., "Meals", "Gym").
 * 
 * @param semanticType - The semantic type to check
 * @returns true if this is a break habit, false if it's a build habit
 * 
 * Requirements: 4.3, 4.4
 * 
 * @example
 * isBreakHabit(SemanticType.POT_USE) // returns true
 * isBreakHabit(SemanticType.MEALS_COOKED) // returns false
 */
export function isBreakHabit(semanticType: SemanticType): boolean {
  return BREAK_HABIT_TYPES.has(semanticType);
}
