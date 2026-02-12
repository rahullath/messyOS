/**
 * Deterministic Notes Parser
 * 
 * Extracts structured data from free-form habit notes using pattern matching.
 * This parser works without AI dependency and provides graceful degradation
 * for unparseable content.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11
 */

import { SemanticType } from './taxonomy';

/**
 * Parsed note data structure
 * 
 * Contains all structured information extracted from a habit note.
 * All fields are optional except confidence and parse_method.
 */
export interface ParsedNoteData {
  // Quantities
  count?: number;
  count_range?: { min: number; max: number };
  strength_mg?: number;
  duration_minutes?: number;
  
  // Substances
  nicotine?: {
    method: 'pouch' | 'vape' | 'other';
    strength_mg?: number;
    count?: number;
  };
  cannabis?: {
    method: 'vaporizer' | 'bong' | 'edibles' | 'avb' | 'joint' | 'other';
    sessions?: number;
    shared?: boolean;
  };
  caffeine?: {
    product: string;
    brand?: string;
  };
  
  // Hygiene
  shower?: {
    type: 'reg_shower' | 'head_shower' | 'proper_cleanse' | 'only_water';
    includes_skincare?: boolean;
    includes_oral?: boolean;
  };
  oral_hygiene?: {
    sessions: number;
  };
  skincare?: {
    done: boolean;
  };
  
  // Sleep
  sleep?: {
    slept_from?: string; // ISO time
    slept_to?: string; // ISO time
  };
  
  // Social
  social?: {
    context?: string;
    duration_minutes?: number;
    location?: string;
  };
  
  // Tags
  tags?: string[];
  
  // Confidence and metadata
  confidence: number; // 0.0-1.0
  parse_method: 'deterministic' | 'ai_enriched' | 'failed';
  original_text?: string;
}

/**
 * Regex patterns for extracting structured data from notes
 * 
 * These patterns are designed to be robust and handle various
 * formatting styles while avoiding false positives.
 */
const PATTERNS = {
  // Strength patterns (e.g., "6mg", "13.5 mg", "50mg")
  strength: /(\d+(?:\.\d+)?)\s*mg/i,
  
  // Count patterns
  count_range: /(\d+)\s*-\s*(\d+)\s*(pouch|puff|sesh|session|meal|drink)/i,
  count_single: /(\d+)\s*(pouch|puff|sesh|session|meal|drink)(?:es|s)?/i,
  
  // Time range patterns (e.g., "1:16-5:15am", "11pm-7am")
  time_range: /(\d{1,2}):?(\d{2})?\s*([ap]m)?\s*-\s*(\d{1,2}):?(\d{2})?\s*([ap]m)?/i,
  
  // Duration patterns (e.g., "3 hours", "45m", "2.5 hrs")
  duration: /(\d+(?:\.\d+)?)\s*(hour|hr|min|minute)s?/i,
  
  // Cannabis patterns
  cannabis_method: /(vaporizer|vape|bong|edible|avb|joint|blunt)/i,
  cannabis_session: /(\d+(?:\.\d+)?)\s*sesh(?:es|s)?/i,
  cannabis_shared: /(shared|with\s+\w+|together|group)/i,
  
  // Shower patterns
  shower_type: /(reg(?:ular)?\s*shower|head\s*shower|proper\s*cleanse|only\s*water|complete\s*cleanse)/i,
  shower_includes_skincare: /(skincare|moisturi[sz]e|lotion)/i,
  shower_includes_oral: /(oral|teeth|brush|floss)/i,
  
  // Caffeine patterns
  caffeine_product: /(monster|lucozade|red\s*bull|sneak|energy\s*drink)/i,
  caffeine_brand: /(ultra\s*white|ultra\s*black|original|sugar\s*free)/i,
  
  // Social patterns
  social_context: /(with\s+friends|alone|at\s+party|with\s+\w+)/i,
  social_location: /(at\s+\w+|in\s+\w+)/i,
  
  // Oral hygiene patterns
  oral_sessions: /(\d+)\s*(brush|floss|oral)/i,
};

/**
 * Parse a habit note into structured data
 * 
 * This function uses deterministic pattern matching to extract
 * structured information from free-form notes. It never throws
 * exceptions and always returns a valid ParsedNoteData object.
 * 
 * @param note - The free-form note text to parse
 * @param semanticType - Optional semantic type hint for context-aware parsing
 * @returns Parsed data with confidence score
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11
 * 
 * @example
 * parseNote("2-3 pouches 6mg") 
 * // returns { count_range: {min: 2, max: 3}, strength_mg: 6, confidence: 0.9, ... }
 * 
 * parseNote("reg shower with skincare")
 * // returns { shower: { type: 'reg_shower', includes_skincare: true }, confidence: 0.8, ... }
 */
export function parseNote(
  note: string,
  semanticType?: SemanticType
): ParsedNoteData {
  // Handle empty or invalid notes
  if (!note || typeof note !== 'string') {
    return {
      confidence: 0,
      parse_method: 'failed',
      original_text: note || '',
    };
  }
  
  // Handle very long notes (>10KB) - truncate for safety
  const MAX_NOTE_LENGTH = 10240;
  let processedNote = note;
  if (note.length > MAX_NOTE_LENGTH) {
    processedNote = note.substring(0, MAX_NOTE_LENGTH);
  }
  
  const result: ParsedNoteData = {
    confidence: 0,
    parse_method: 'deterministic',
    original_text: note,
  };
  
  let matchCount = 0;
  let totalPatterns = 0;
  
  try {
    // Extract strength (Requirement 3.1)
    const strengthMatch = processedNote.match(PATTERNS.strength);
    if (strengthMatch) {
      result.strength_mg = parseFloat(strengthMatch[1]);
      matchCount++;
    }
    totalPatterns++;
    
    // Extract count range (Requirement 3.2)
    const countRangeMatch = processedNote.match(PATTERNS.count_range);
    if (countRangeMatch) {
      result.count_range = {
        min: parseInt(countRangeMatch[1], 10),
        max: parseInt(countRangeMatch[2], 10),
      };
      matchCount++;
    } else {
      // Try single count
      const countSingleMatch = processedNote.match(PATTERNS.count_single);
      if (countSingleMatch) {
        result.count = parseInt(countSingleMatch[1], 10);
        matchCount++;
      }
    }
    totalPatterns++;
    
    // Extract duration (Requirement 3.10)
    const durationMatch = processedNote.match(PATTERNS.duration);
    if (durationMatch) {
      const value = parseFloat(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      
      if (unit.startsWith('hour') || unit === 'hr') {
        result.duration_minutes = value * 60;
      } else {
        result.duration_minutes = value;
      }
      matchCount++;
    }
    totalPatterns++;
    
    // Parse based on semantic type or detect from content
    const effectiveType = semanticType || detectSemanticTypeFromNote(processedNote);
    
    if (effectiveType === SemanticType.NICOTINE_POUCHES || 
        effectiveType === SemanticType.VAPING_PUFFS ||
        processedNote.match(/pouch|vap|puff/i)) {
      parseNicotineData(processedNote, result);
      matchCount += result.nicotine ? 1 : 0;
      totalPatterns++;
    }
    
    if (effectiveType === SemanticType.POT_USE || 
        processedNote.match(/sesh|cannabis|pot|weed/i)) {
      parseCannabisData(processedNote, result);
      matchCount += result.cannabis ? 1 : 0;
      totalPatterns++;
    }
    
    if (effectiveType === SemanticType.ENERGY_DRINK || 
        processedNote.match(PATTERNS.caffeine_product)) {
      parseCaffeineData(processedNote, result);
      matchCount += result.caffeine ? 1 : 0;
      totalPatterns++;
    }
    
    if (effectiveType === SemanticType.SHOWER || 
        processedNote.match(/shower|bath|wash/i)) {
      parseShowerData(processedNote, result);
      matchCount += result.shower ? 1 : 0;
      totalPatterns++;
    }
    
    if (effectiveType === SemanticType.ORAL_HYGIENE_SESSIONS || 
        processedNote.match(/oral|teeth|brush|floss/i)) {
      parseOralHygieneData(processedNote, result);
      matchCount += result.oral_hygiene ? 1 : 0;
      totalPatterns++;
    }
    
    if (effectiveType === SemanticType.SKINCARE || 
        processedNote.match(/skincare|moisturi/i)) {
      result.skincare = { done: true };
      matchCount++;
      totalPatterns++;
    }
    
    if (effectiveType === SemanticType.SLEEP_PROXY || 
        processedNote.match(/sleep|slept|bed/i)) {
      parseSleepData(processedNote, result);
      matchCount += result.sleep ? 1 : 0;
      totalPatterns++;
    }
    
    // Parse social context (Requirement 3.9)
    if (processedNote.match(PATTERNS.social_context) || 
        processedNote.match(PATTERNS.social_location)) {
      parseSocialData(processedNote, result);
      matchCount += result.social ? 1 : 0;
      totalPatterns++;
    }
    
    // Calculate confidence score
    // Base confidence on match ratio, with minimum threshold
    if (totalPatterns > 0) {
      const matchRatio = matchCount / totalPatterns;
      
      // Boost confidence if we have strong matches
      if (matchCount >= 2) {
        result.confidence = Math.min(1.0, 0.7 + (matchRatio * 0.3));
      } else if (matchCount === 1) {
        result.confidence = 0.6;
      } else {
        result.confidence = 0.3;
      }
    } else {
      result.confidence = 0.3;
    }
    
    // If confidence is too low, mark as failed (Requirement 3.11)
    if (result.confidence < 0.5) {
      result.parse_method = 'failed';
    }
    
  } catch (error) {
    // Graceful degradation - never throw (Requirement 3.11)
    result.confidence = 0;
    result.parse_method = 'failed';
  }
  
  return result;
}

/**
 * Detect semantic type from note content
 */
function detectSemanticTypeFromNote(note: string): SemanticType | null {
  const lowerNote = note.toLowerCase();
  
  if (lowerNote.match(/pouch|zyn/)) return SemanticType.NICOTINE_POUCHES;
  if (lowerNote.match(/vap|puff/)) return SemanticType.VAPING_PUFFS;
  if (lowerNote.match(/sesh|cannabis|pot|weed/)) return SemanticType.POT_USE;
  if (lowerNote.match(/monster|lucozade|red bull|energy drink/)) return SemanticType.ENERGY_DRINK;
  if (lowerNote.match(/meal|cook|food/)) return SemanticType.MEALS_COOKED;
  if (lowerNote.match(/shower|bath/)) return SemanticType.SHOWER;
  if (lowerNote.match(/oral|teeth|brush|floss/)) return SemanticType.ORAL_HYGIENE_SESSIONS;
  if (lowerNote.match(/skincare|moisturi/)) return SemanticType.SKINCARE;
  if (lowerNote.match(/sleep|slept|bed/)) return SemanticType.SLEEP_PROXY;
  
  return null;
}

/**
 * Parse nicotine-specific data from note
 * Requirements: 3.1, 3.2
 */
function parseNicotineData(note: string, result: ParsedNoteData): void {
  const method = note.match(/vap|puff/i) ? 'vape' : 
                 note.match(/pouch/i) ? 'pouch' : 'other';
  
  result.nicotine = {
    method,
    strength_mg: result.strength_mg,
    count: result.count || result.count_range?.min,
  };
}

/**
 * Parse cannabis-specific data from note
 * Requirements: 3.3, 3.4
 */
function parseCannabisData(note: string, result: ParsedNoteData): void {
  const methodMatch = note.match(PATTERNS.cannabis_method);
  const sessionMatch = note.match(PATTERNS.cannabis_session);
  const sharedMatch = note.match(PATTERNS.cannabis_shared);
  
  let method: 'vaporizer' | 'bong' | 'edibles' | 'avb' | 'joint' | 'other' = 'other';
  
  if (methodMatch) {
    const methodStr = methodMatch[1].toLowerCase();
    if (methodStr.includes('vaporizer') || methodStr.includes('vape')) {
      method = 'vaporizer';
    } else if (methodStr.includes('bong')) {
      method = 'bong';
    } else if (methodStr.includes('edible')) {
      method = 'edibles';
    } else if (methodStr.includes('avb')) {
      method = 'avb';
    } else if (methodStr.includes('joint') || methodStr.includes('blunt')) {
      method = 'joint';
    }
  }
  
  result.cannabis = {
    method,
    sessions: sessionMatch ? parseFloat(sessionMatch[1]) : result.count,
    shared: !!sharedMatch,
  };
}

/**
 * Parse caffeine-specific data from note
 * Requirements: 3.7
 */
function parseCaffeineData(note: string, result: ParsedNoteData): void {
  const productMatch = note.match(PATTERNS.caffeine_product);
  const brandMatch = note.match(PATTERNS.caffeine_brand);
  
  if (productMatch) {
    result.caffeine = {
      product: productMatch[1].toLowerCase().replace(/\s+/g, ' '),
      brand: brandMatch ? brandMatch[1].toLowerCase().replace(/\s+/g, ' ') : undefined,
    };
  }
}

/**
 * Parse shower-specific data from note
 * Requirements: 3.5, 3.6
 */
function parseShowerData(note: string, result: ParsedNoteData): void {
  const typeMatch = note.match(PATTERNS.shower_type);
  const skincareMatch = note.match(PATTERNS.shower_includes_skincare);
  const oralMatch = note.match(PATTERNS.shower_includes_oral);
  
  let type: 'reg_shower' | 'head_shower' | 'proper_cleanse' | 'only_water' = 'reg_shower';
  
  if (typeMatch) {
    const typeStr = typeMatch[1].toLowerCase().replace(/\s+/g, '_');
    if (typeStr.includes('head')) {
      type = 'head_shower';
    } else if (typeStr.includes('proper') || typeStr.includes('complete')) {
      type = 'proper_cleanse';
    } else if (typeStr.includes('only_water')) {
      type = 'only_water';
    } else {
      type = 'reg_shower';
    }
  }
  
  result.shower = {
    type,
    includes_skincare: !!skincareMatch,
    includes_oral: !!oralMatch,
  };
}

/**
 * Parse oral hygiene data from note
 * Requirements: 3.6
 */
function parseOralHygieneData(note: string, result: ParsedNoteData): void {
  const sessionsMatch = note.match(PATTERNS.oral_sessions);
  
  result.oral_hygiene = {
    sessions: sessionsMatch ? parseInt(sessionsMatch[1], 10) : 1,
  };
}

/**
 * Parse sleep data from note
 * Requirements: 3.8
 */
function parseSleepData(note: string, result: ParsedNoteData): void {
  const timeRangeMatch = note.match(PATTERNS.time_range);
  
  if (timeRangeMatch) {
    const [, startHour, startMin = '00', startPeriod, endHour, endMin = '00', endPeriod] = timeRangeMatch;
    
    // Convert to 24-hour format and create ISO time strings
    const startHour24 = convertTo24Hour(parseInt(startHour, 10), startPeriod);
    const endHour24 = convertTo24Hour(parseInt(endHour, 10), endPeriod);
    
    result.sleep = {
      slept_from: `${String(startHour24).padStart(2, '0')}:${startMin}:00`,
      slept_to: `${String(endHour24).padStart(2, '0')}:${endMin}:00`,
    };
  }
}

/**
 * Parse social context data from note
 * Requirements: 3.9
 */
function parseSocialData(note: string, result: ParsedNoteData): void {
  const contextMatch = note.match(PATTERNS.social_context);
  const locationMatch = note.match(PATTERNS.social_location);
  
  result.social = {
    context: contextMatch ? contextMatch[1] : undefined,
    location: locationMatch ? locationMatch[1] : undefined,
    duration_minutes: result.duration_minutes,
  };
}

/**
 * Convert 12-hour time to 24-hour format
 */
function convertTo24Hour(hour: number, period?: string): number {
  if (!period) return hour;
  
  const isPM = period.toLowerCase() === 'pm';
  
  if (isPM && hour !== 12) {
    return hour + 12;
  }
  if (!isPM && hour === 12) {
    return 0;
  }
  
  return hour;
}
