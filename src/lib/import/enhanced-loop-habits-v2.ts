/**
 * Enhanced Loop Habits Import Service V2
 * 
 * Extends the existing import service to support per-habit exports with notes.
 * Integrates with the notes parser and taxonomy system to populate structured data.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.6
 */

import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';
import { parseNote, type ParsedNoteData } from '../habits/note-parser';
import { inferSemanticType, normalizeUnit, type SemanticType } from '../habits/taxonomy';

/**
 * Import format detection result
 */
export type ImportFormat = 'root' | 'per-habit';

/**
 * Per-habit import options
 */
export interface PerHabitImportOptions {
  files: File[]; // Array of per-habit checkmarks.csv files
  userId: string;
  conflictResolution?: ConflictResolution[];
}

/**
 * Conflict resolution strategy
 */
export interface ConflictResolution {
  habitName: string;
  resolution: 'merge' | 'replace' | 'skip' | 'rename';
  newName?: string;
}

/**
 * Import result summary
 */
export interface ImportResult {
  success: boolean;
  importedHabits: number;
  importedEntries: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

/**
 * Import error
 */
export interface ImportError {
  type: 'validation' | 'parsing' | 'database' | 'conflict';
  severity: 'error' | 'warning';
  message: string;
  details?: any;
  habitName?: string;
}

/**
 * Import warning
 */
export interface ImportWarning {
  type: 'validation' | 'parsing' | 'conflict';
  message: string;
  habitName?: string;
}

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
  habitId: string;
  habitName: string;
  confidence: number; // 0-100
}

/**
 * Detect import format from files
 * 
 * Determines whether the import is a root export (Habits.csv, Checkmarks.csv, Scores.csv)
 * or per-habit export (individual folders with Checkmarks.csv per habit).
 * 
 * @param files - Array of files to analyze
 * @returns 'root' or 'per-habit'
 * 
 * Requirements: 1.1
 */
export function detectImportFormat(files: File[]): ImportFormat {
  const fileNames = files.map(f => f.name.toLowerCase());
  
  // Check for root export files
  const hasHabitsCSV = fileNames.some(name => name === 'habits.csv');
  const hasCheckmarksCSV = fileNames.some(name => name === 'checkmarks.csv');
  const hasScoresCSV = fileNames.some(name => name === 'scores.csv');
  
  if (hasHabitsCSV && hasCheckmarksCSV) {
    return 'root';
  }
  
  // Check for per-habit structure (multiple Checkmarks.csv files)
  const checkmarksCount = fileNames.filter(name => name === 'checkmarks.csv').length;
  if (checkmarksCount > 1) {
    return 'per-habit';
  }
  
  // Default to root if ambiguous
  return 'root';
}

/**
 * Fuzzy match habit name to existing habits
 * 
 * Uses Levenshtein distance and other heuristics to find the best match
 * for a habit name among existing habits.
 * 
 * @param habitName - The habit name to match
 * @param existingHabits - Array of existing habits
 * @returns Best match with confidence score, or null if no good match
 * 
 * Requirements: 1.5
 */
export function fuzzyMatchHabit(
  habitName: string,
  existingHabits: Array<{ id: string; name: string }>
): FuzzyMatchResult | null {
  if (!habitName || existingHabits.length === 0) {
    return null;
  }
  
  const normalizedInput = habitName.toLowerCase().trim();
  let bestMatch: FuzzyMatchResult | null = null;
  let bestScore = 0;
  
  for (const habit of existingHabits) {
    const normalizedHabit = habit.name.toLowerCase().trim();
    
    // Exact match
    if (normalizedInput === normalizedHabit) {
      return {
        habitId: habit.id,
        habitName: habit.name,
        confidence: 100,
      };
    }
    
    // Calculate similarity score
    const score = calculateSimilarity(normalizedInput, normalizedHabit);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        habitId: habit.id,
        habitName: habit.name,
        confidence: Math.round(score),
      };
    }
  }
  
  // Only return matches with confidence >= 70%
  if (bestMatch && bestMatch.confidence >= 70) {
    return bestMatch;
  }
  
  return null;
}

/**
 * Calculate similarity between two strings
 * 
 * Uses a combination of Levenshtein distance and substring matching.
 */
function calculateSimilarity(str1: string, str2: string): number {
  // Exact match
  if (str1 === str2) {
    return 100;
  }
  
  // Substring match bonus
  if (str1.includes(str2) || str2.includes(str1)) {
    const minLength = Math.min(str1.length, str2.length);
    const maxLength = Math.max(str1.length, str2.length);
    
    // If the shorter string is at least 60% of the longer, give high score
    if (minLength / maxLength >= 0.6) {
      return 90;
    }
    return 85;
  }
  
  // Prefix match bonus (one starts with the other)
  if (str1.startsWith(str2) || str2.startsWith(str1)) {
    const minLength = Math.min(str1.length, str2.length);
    const maxLength = Math.max(str1.length, str2.length);
    
    // If the shorter string is at least 60% of the longer, give high score
    if (minLength / maxLength >= 0.6) {
      return 88;
    }
    return 80;
  }
  
  // Levenshtein distance
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return similarity;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Normalize Loop Habits value
 * 
 * Loop Habits stores numerical values multiplied by 1000.
 * This function divides by 1000 to get the actual value.
 * Also handles YES/NO/SKIP/UNKNOWN mapping.
 * 
 * @param value - Raw value from Loop Habits export
 * @param type - Habit type ('NUMERICAL' or 'YES_NO')
 * @returns Normalized value
 * 
 * Requirements: 1.3, 1.4
 */
export function normalizeLoopValue(
  value: string | number,
  type: 'NUMERICAL' | 'YES_NO'
): number {
  if (value === null || value === undefined) {
    return 0;
  }
  
  // Convert to number if string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return 0;
  }
  
  if (type === 'NUMERICAL') {
    // Divide by 1000 to get actual value (Requirement 1.3)
    return numValue / 1000;
  }
  
  // YES_NO mapping (Requirement 1.4)
  // Loop Habits: 0 = missed, 2 = completed, 3 = skipped
  // Internal: 0 = missed, 1 = completed, 2 = skipped
  if (numValue === 0) return 0; // Missed
  if (numValue === 2) return 1; // Completed
  if (numValue === 3) return 2; // Skipped
  
  // Default to missed for unknown values
  return 0;
}

/**
 * Extract notes from per-habit CSV row
 * 
 * Per-habit exports may have a Notes column containing free-form text.
 * This function extracts the notes content if present.
 * 
 * @param row - CSV row object
 * @returns Notes content or null
 * 
 * Requirements: 1.2
 */
export function extractNotesFromPerHabit(row: Record<string, string>): string | null {
  // Check for Notes column (case-insensitive)
  const notesKey = Object.keys(row).find(key => key.toLowerCase() === 'notes');
  
  if (notesKey && row[notesKey]) {
    const notes = row[notesKey].trim();
    return notes.length > 0 ? notes : null;
  }
  
  return null;
}

/**
 * Enhanced Loop Habits Importer V2
 * 
 * Extends the existing importer with per-habit support and structured data parsing.
 */
export class EnhancedLoopHabitsImporterV2 {
  private supabase: any;
  private userId: string;
  
  constructor(cookies: AstroCookies, userId: string) {
    this.supabase = createServerClient(cookies);
    this.userId = userId;
  }
  
  /**
   * Import per-habit checkmarks with notes
   * 
   * Processes per-habit CSV files, extracts notes, parses them into structured data,
   * and stores entries with numeric_value, parsed, and source fields.
   * 
   * @param options - Import options
   * @returns Import result summary
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.6
   */
  async importPerHabitCheckmarks(
    options: PerHabitImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedHabits: 0,
      importedEntries: 0,
      errors: [],
      warnings: [],
    };
    
    try {
      // Get existing habits for fuzzy matching
      const { data: existingHabits, error: habitsError } = await this.supabase
        .from('habits')
        .select('id, name, type, measurement_type')
        .eq('user_id', this.userId);
      
      if (habitsError) {
        result.errors.push({
          type: 'database',
          severity: 'error',
          message: `Failed to fetch existing habits: ${habitsError.message}`,
        });
        return result;
      }
      
      // Process each file
      for (const file of options.files) {
        try {
          const fileResult = await this.processPerHabitFile(
            file,
            existingHabits || [],
            options.conflictResolution || []
          );
          
          result.importedHabits += fileResult.importedHabits;
          result.importedEntries += fileResult.importedEntries;
          result.errors.push(...fileResult.errors);
          result.warnings.push(...fileResult.warnings);
        } catch (error: any) {
          result.errors.push({
            type: 'parsing',
            severity: 'error',
            message: `Failed to process file ${file.name}: ${error.message}`,
          });
        }
      }
      
      result.success = result.errors.filter(e => e.severity === 'error').length === 0;
      return result;
      
    } catch (error: any) {
      result.errors.push({
        type: 'database',
        severity: 'error',
        message: `Import failed: ${error.message}`,
      });
      return result;
    }
  }
  
  /**
   * Process a single per-habit CSV file
   */
  private async processPerHabitFile(
    file: File,
    existingHabits: Array<{ id: string; name: string; type: string; measurement_type: string }>,
    conflictResolutions: ConflictResolution[]
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedHabits: 0,
      importedEntries: 0,
      errors: [],
      warnings: [],
    };
    
    // Extract habit name from file path or folder structure
    // Per-habit exports are typically in folders like "001 Habit Name/Checkmarks.csv"
    const habitName = this.extractHabitNameFromFile(file);
    
    if (!habitName) {
      result.errors.push({
        type: 'validation',
        severity: 'error',
        message: `Could not extract habit name from file: ${file.name}`,
      });
      return result;
    }
    
    // Fuzzy match to existing habit (Requirement 1.5)
    const match = fuzzyMatchHabit(habitName, existingHabits);
    
    let habitId: string;
    let habitType: string;
    let measurementType: string;
    let semanticType: SemanticType | null = null;
    
    if (match) {
      // Use existing habit
      habitId = match.habitId;
      const existingHabit = existingHabits.find(h => h.id === match.habitId);
      habitType = existingHabit?.type || 'build';
      measurementType = existingHabit?.measurement_type || 'boolean';
      
      result.warnings.push({
        type: 'conflict',
        message: `Matched "${habitName}" to existing habit "${match.habitName}" (${match.confidence}% confidence)`,
        habitName,
      });
    } else {
      // Create new habit
      const { data: newHabit, error: createError } = await this.supabase
        .from('habits')
        .insert({
          user_id: this.userId,
          name: habitName,
          category: this.categorizeHabit(habitName),
          type: this.determineHabitType(habitName),
          measurement_type: 'boolean',
        })
        .select('id, type, measurement_type')
        .single();
      
      if (createError || !newHabit) {
        result.errors.push({
          type: 'database',
          severity: 'error',
          message: `Failed to create habit "${habitName}": ${createError?.message}`,
          habitName,
        });
        return result;
      }
      
      habitId = newHabit.id;
      habitType = newHabit.type;
      measurementType = newHabit.measurement_type;
      result.importedHabits++;
    }
    
    // Infer semantic type for better parsing
    semanticType = inferSemanticType(habitName);
    
    // Parse CSV content
    const csvContent = await file.text();
    const entries = this.parsePerHabitCSV(csvContent, habitName);
    
    // Process each entry
    for (const entry of entries) {
      try {
        // Parse notes if present (Requirement 1.2)
        let parsedData: ParsedNoteData | null = null;
        let numericValue: number | null = null;
        
        if (entry.notes) {
          parsedData = parseNote(entry.notes, semanticType || undefined);
          
          // Extract numeric value from parsed data
          numericValue = this.extractNumericValue(parsedData, measurementType);
        }
        
        // Normalize Loop value (Requirement 1.3, 1.4)
        const normalizedValue = normalizeLoopValue(
          entry.value,
          measurementType === 'count' ? 'NUMERICAL' : 'YES_NO'
        );
        
        // Insert entry with structured data
        const { error: insertError } = await this.supabase
          .from('habit_entries')
          .insert({
            habit_id: habitId,
            user_id: this.userId,
            date: entry.date,
            value: normalizedValue,
            notes: entry.notes,
            numeric_value: numericValue, // New field (Requirement 2.1)
            parsed: parsedData ? JSON.stringify(parsedData) : null, // New field (Requirement 2.2)
            source: 'loop_per_habit', // New field (Requirement 2.6)
            logged_at: new Date(entry.date).toISOString(),
          });
        
        if (insertError) {
          // Check for duplicate entry
          if (insertError.code === '23505') {
            result.warnings.push({
              type: 'conflict',
              message: `Duplicate entry for ${habitName} on ${entry.date}`,
              habitName,
            });
          } else {
            result.errors.push({
              type: 'database',
              severity: 'warning',
              message: `Failed to insert entry for ${habitName} on ${entry.date}: ${insertError.message}`,
              habitName,
            });
          }
        } else {
          result.importedEntries++;
        }
      } catch (error: any) {
        result.errors.push({
          type: 'parsing',
          severity: 'warning',
          message: `Failed to process entry for ${habitName} on ${entry.date}: ${error.message}`,
          habitName,
        });
      }
    }
    
    result.success = true;
    return result;
  }
  
  /**
   * Extract habit name from file path
   */
  private extractHabitNameFromFile(file: File): string | null {
    // Try to extract from webkitRelativePath (folder structure)
    if ((file as any).webkitRelativePath) {
      const path = (file as any).webkitRelativePath as string;
      const parts = path.split('/');
      
      // Format: "001 Habit Name/Checkmarks.csv"
      if (parts.length >= 2) {
        const folderName = parts[parts.length - 2];
        // Remove leading numbers and trim
        const habitName = folderName.replace(/^\d+\s*/, '').trim();
        return habitName;
      }
    }
    
    // Fallback: try to extract from file name
    if (file.name !== 'Checkmarks.csv') {
      return file.name.replace(/\.csv$/i, '').trim();
    }
    
    return null;
  }
  
  /**
   * Parse per-habit CSV content
   */
  private parsePerHabitCSV(
    csvContent: string,
    habitName: string
  ): Array<{ date: string; value: number; notes: string | null }> {
    const lines = csvContent.split('\n');
    const entries: Array<{ date: string; value: number; notes: string | null }> = [];
    
    if (lines.length < 2) {
      return entries;
    }
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dateIndex = header.findIndex(h => h === 'timestamp' || h === 'date');
    const valueIndex = header.findIndex(h => h === 'value');
    const notesIndex = header.findIndex(h => h === 'notes');
    
    if (dateIndex === -1 || valueIndex === -1) {
      return entries;
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim());
      
      if (values.length <= Math.max(dateIndex, valueIndex)) {
        continue;
      }
      
      const dateStr = values[dateIndex];
      const valueStr = values[valueIndex];
      const notes = notesIndex !== -1 && values[notesIndex] ? values[notesIndex] : null;
      
      // Parse date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        continue;
      }
      
      // Parse value
      const value = parseInt(valueStr, 10);
      if (isNaN(value)) {
        continue;
      }
      
      entries.push({
        date: date.toISOString().split('T')[0],
        value,
        notes,
      });
    }
    
    return entries;
  }
  
  /**
   * Extract numeric value from parsed note data
   */
  private extractNumericValue(
    parsedData: ParsedNoteData,
    measurementType: string
  ): number | null {
    // Try to extract numeric value based on measurement type
    if (parsedData.count !== undefined) {
      return parsedData.count;
    }
    
    if (parsedData.count_range) {
      // Use average of range
      return (parsedData.count_range.min + parsedData.count_range.max) / 2;
    }
    
    if (parsedData.duration_minutes !== undefined) {
      return parsedData.duration_minutes;
    }
    
    // Check substance-specific counts
    if (parsedData.nicotine?.count !== undefined) {
      return parsedData.nicotine.count;
    }
    
    if (parsedData.cannabis?.sessions !== undefined) {
      return parsedData.cannabis.sessions;
    }
    
    if (parsedData.oral_hygiene?.sessions !== undefined) {
      return parsedData.oral_hygiene.sessions;
    }
    
    return null;
  }
  
  /**
   * Categorize habit by name
   */
  private categorizeHabit(name: string): string {
    const lower = name.toLowerCase();
    
    if (lower.includes('gym') || lower.includes('walk') || lower.includes('exercise')) {
      return 'Fitness';
    }
    if (lower.includes('vap') || lower.includes('smoke') || lower.includes('drink') || lower.includes('pot')) {
      return 'Health';
    }
    if (lower.includes('code') || lower.includes('build') || lower.includes('university')) {
      return 'Productivity';
    }
    if (lower.includes('shower') || lower.includes('wake')) {
      return 'Self Care';
    }
    
    return 'General';
  }
  
  /**
   * Determine habit type by name
   */
  private determineHabitType(name: string): 'build' | 'break' {
    const lower = name.toLowerCase();
    
    if (lower.includes('quit') || lower.includes('no ') || lower.includes('stop')) {
      return 'break';
    }
    
    return 'build';
  }
}
