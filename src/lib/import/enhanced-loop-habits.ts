// src/lib/import/enhanced-loop-habits.ts - Enhanced Loop Habits Import with Error Handling
import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';

export interface ImportProgress {
  stage: 'validation' | 'parsing' | 'conflict_resolution' | 'importing' | 'calculating_streaks' | 'complete';
  progress: number; // 0-100
  message: string;
  details?: string;
}

export interface ImportError {
  type: 'validation' | 'parsing' | 'database' | 'conflict';
  severity: 'error' | 'warning';
  message: string;
  details?: any;
  recordIndex?: number;
  habitName?: string;
}

export interface ConflictResolution {
  habitName: string;
  existingHabit: {
    id: string;
    name: string;
    description: string;
    created_at: string;
    total_entries: number;
  };
  importedHabit: {
    name: string;
    description: string;
    entries_count: number;
  };
  resolution: 'merge' | 'replace' | 'skip' | 'rename';
  newName?: string;
}

export interface ImportSummary {
  success: boolean;
  totalHabits: number;
  importedHabits: number;
  skippedHabits: number;
  totalEntries: number;
  importedEntries: number;
  failedEntries: number;
  conflicts: ConflictResolution[];
  errors: ImportError[];
  warnings: ImportError[];
  recommendations: string[];
  processingTime: number;
  statistics: {
    habitsByCategory: Record<string, number>;
    entriesByMonth: Record<string, number>;
    averageStreakLength: number;
    mostActiveHabit: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ImportError[];
  warnings: ImportError[];
  sanitizedData?: any;
}

export class EnhancedLoopHabitsImporter {
  private progressCallback?: (progress: ImportProgress) => void;
  private supabase: any;
  private userId: string;
  private startTime: number = 0;

  constructor(cookies: AstroCookies, userId: string, progressCallback?: (progress: ImportProgress) => void) {
    this.supabase = createServerClient(cookies);
    this.userId = userId;
    this.progressCallback = progressCallback;
  }

  private updateProgress(stage: ImportProgress['stage'], progress: number, message: string, details?: string) {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message, details });
    }
    console.log(`📊 [${stage}] ${progress}% - ${message}${details ? ` (${details})` : ''}`);
  }

  async importWithEnhancedHandling(
    csvFiles: { habits: string; checkmarks: string; scores: string },
    conflictResolutions?: ConflictResolution[]
  ): Promise<ImportSummary> {
    this.startTime = Date.now();
    const summary: ImportSummary = {
      success: false,
      totalHabits: 0,
      importedHabits: 0,
      skippedHabits: 0,
      totalEntries: 0,
      importedEntries: 0,
      failedEntries: 0,
      conflicts: [],
      errors: [],
      warnings: [],
      recommendations: [],
      processingTime: 0,
      statistics: {
        habitsByCategory: {},
        entriesByMonth: {},
        averageStreakLength: 0,
        mostActiveHabit: ''
      }
    };

    try {
      // Stage 1: Validation
      this.updateProgress('validation', 10, 'Validating CSV files');
      const validationResult = await this.validateCSVFiles(csvFiles);
      summary.errors.push(...validationResult.errors);
      summary.warnings.push(...validationResult.warnings);

      if (!validationResult.isValid) {
        summary.success = false;
        summary.processingTime = Date.now() - this.startTime;
        return summary;
      }

      // Stage 2: Parsing
      this.updateProgress('parsing', 25, 'Parsing CSV data');
      const parsedData = await this.parseCSVFiles(csvFiles);
      summary.totalHabits = parsedData.habits.length;
      summary.totalEntries = Object.values(parsedData.checkmarks)
        .reduce((total, habitEntries) => total + Object.keys(habitEntries).length, 0);

      // Stage 3: Conflict Detection and Resolution
      this.updateProgress('conflict_resolution', 40, 'Detecting conflicts with existing habits');
      const conflicts = await this.detectConflicts(parsedData.habits);
      summary.conflicts = conflicts;

      if (conflicts.length > 0 && !conflictResolutions) {
        // Return early with conflicts for user resolution
        summary.processingTime = Date.now() - this.startTime;
        return summary;
      }

      // Apply conflict resolutions
      const resolvedHabits = this.applyConflictResolutions(parsedData.habits, conflicts, conflictResolutions || []);

      // Stage 4: Import Habits
      this.updateProgress('importing', 60, 'Importing habits and entries');
      const importResult = await this.importHabitsAndEntries(resolvedHabits, parsedData);
      summary.importedHabits = importResult.importedHabits;
      summary.skippedHabits = importResult.skippedHabits;
      summary.importedEntries = importResult.importedEntries;
      summary.failedEntries = importResult.failedEntries;
      summary.errors.push(...importResult.errors);

      // Stage 5: Calculate Streaks
      this.updateProgress('calculating_streaks', 85, 'Calculating habit streaks');
      await this.calculateAllStreaks();

      // Stage 6: Generate Statistics and Recommendations
      this.updateProgress('complete', 100, 'Generating summary and recommendations');
      summary.statistics = await this.generateStatistics();
      summary.recommendations = this.generateRecommendations(summary);

      summary.success = true;
      summary.processingTime = Date.now() - this.startTime;

      return summary;

    } catch (error: any) {
      console.error('❌ Import error:', error);
      summary.errors.push({
        type: 'database',
        severity: 'error',
        message: `Import failed: ${error.message}`,
        details: error
      });
      summary.success = false;
      summary.processingTime = Date.now() - this.startTime;
      return summary;
    }
  }

  private async validateCSVFiles(csvFiles: { habits: string; checkmarks: string; scores: string }): Promise<ValidationResult> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    // Validate habits CSV
    const habitsValidation = this.validateHabitsCSV(csvFiles.habits);
    errors.push(...habitsValidation.errors);
    warnings.push(...habitsValidation.warnings);

    // Validate checkmarks CSV
    const checkmarksValidation = this.validateCheckmarksCSV(csvFiles.checkmarks);
    errors.push(...checkmarksValidation.errors);
    warnings.push(...checkmarksValidation.warnings);

    // Validate scores CSV
    const scoresValidation = this.validateScoresCSV(csvFiles.scores);
    errors.push(...scoresValidation.errors);
    warnings.push(...scoresValidation.warnings);

    // Cross-validation: ensure habit names match across files
    const crossValidation = this.crossValidateFiles(csvFiles);
    errors.push(...crossValidation.errors);
    warnings.push(...crossValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateHabitsCSV(csv: string): { errors: ImportError[]; warnings: ImportError[] } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    if (!csv || csv.trim().length === 0) {
      errors.push({
        type: 'validation',
        severity: 'error',
        message: 'Habits CSV file is empty or missing'
      });
      return { errors, warnings };
    }

    const lines = csv.split('\n');
    if (lines.length < 2) {
      errors.push({
        type: 'validation',
        severity: 'error',
        message: 'Habits CSV must have at least a header and one data row'
      });
      return { errors, warnings };
    }

    // Validate header
    const header = lines[0].toLowerCase();
    const requiredColumns = ['position', 'name', 'question', 'description'];
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    
    if (missingColumns.length > 0) {
      errors.push({
        type: 'validation',
        severity: 'error',
        message: `Habits CSV missing required columns: ${missingColumns.join(', ')}`
      });
    }

    // Validate data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',');
      if (parts.length < 4) {
        warnings.push({
          type: 'validation',
          severity: 'warning',
          message: `Row ${i + 1} has insufficient columns, may be skipped`,
          recordIndex: i
        });
      }

      // Validate habit name
      const habitName = parts[1]?.trim();
      if (!habitName) {
        errors.push({
          type: 'validation',
          severity: 'error',
          message: `Row ${i + 1} missing habit name`,
          recordIndex: i
        });
      }
    }

    return { errors, warnings };
  }

  private validateCheckmarksCSV(csv: string): { errors: ImportError[]; warnings: ImportError[] } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    if (!csv || csv.trim().length === 0) {
      errors.push({
        type: 'validation',
        severity: 'error',
        message: 'Checkmarks CSV file is empty or missing'
      });
      return { errors, warnings };
    }

    const lines = csv.split('\n');
    if (lines.length < 2) {
      warnings.push({
        type: 'validation',
        severity: 'warning',
        message: 'Checkmarks CSV has no data rows - no habit entries will be imported'
      });
      return { errors, warnings };
    }

    // Validate date format in first column
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const dateStr = line.split(',')[0];
      if (dateStr && !this.isValidDate(dateStr)) {
        warnings.push({
          type: 'validation',
          severity: 'warning',
          message: `Row ${i + 1} has invalid date format: ${dateStr}`,
          recordIndex: i
        });
      }
    }

    return { errors, warnings };
  }

  private validateScoresCSV(csv: string): { errors: ImportError[]; warnings: ImportError[] } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    if (!csv || csv.trim().length === 0) {
      warnings.push({
        type: 'validation',
        severity: 'warning',
        message: 'Scores CSV file is empty - scores will not be imported'
      });
    }

    return { errors, warnings };
  }

  private crossValidateFiles(csvFiles: { habits: string; checkmarks: string; scores: string }): { errors: ImportError[]; warnings: ImportError[] } {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];

    try {
      // Get habit names from habits CSV
      const habitsLines = csvFiles.habits.split('\n');
      const habitNames = new Set<string>();
      for (let i = 1; i < habitsLines.length; i++) {
        const line = habitsLines[i].trim();
        if (!line) continue;
        const habitName = line.split(',')[1]?.trim();
        if (habitName) habitNames.add(habitName);
      }

      // Get habit names from checkmarks CSV header
      const checkmarksHeader = csvFiles.checkmarks.split('\n')[0];
      const checkmarksHabits = checkmarksHeader.split(',').slice(1).map(h => h.trim());

      // Find mismatches
      const missingInCheckmarks = Array.from(habitNames).filter(name => !checkmarksHabits.includes(name));
      const extraInCheckmarks = checkmarksHabits.filter(name => name && !habitNames.has(name));

      if (missingInCheckmarks.length > 0) {
        warnings.push({
          type: 'validation',
          severity: 'warning',
          message: `Habits missing from checkmarks CSV: ${missingInCheckmarks.join(', ')}`
        });
      }

      if (extraInCheckmarks.length > 0) {
        warnings.push({
          type: 'validation',
          severity: 'warning',
          message: `Extra habits in checkmarks CSV: ${extraInCheckmarks.join(', ')}`
        });
      }

    } catch (error: any) {
      warnings.push({
        type: 'validation',
        severity: 'warning',
        message: `Could not cross-validate files: ${error.message}`
      });
    }

    return { errors, warnings };
  }

  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private async parseCSVFiles(csvFiles: { habits: string; checkmarks: string; scores: string }) {
    // Use existing parsing logic but with enhanced error handling
    const habitsData = this.parseHabitsCSVEnhanced(csvFiles.habits);
    const checkmarksData = this.parseCheckmarksCSVEnhanced(csvFiles.checkmarks);
    const scoresData = this.parseScoresCSVEnhanced(csvFiles.scores);

    return {
      habits: habitsData,
      checkmarks: checkmarksData,
      scores: scoresData
    };
  }

  private parseHabitsCSVEnhanced(csv: string) {
    const lines = csv.split('\n').slice(1);
    const habits = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const parts = line.split(',');
        if (parts.length >= 4) {
          habits.push({
            position: parseInt(parts[0]) || i,
            name: this.sanitizeString(parts[1]),
            question: this.sanitizeString(parts[2]),
            description: this.sanitizeString(parts[3]),
            numRepetitions: parseInt(parts[4]) || 1,
            interval: parseInt(parts[5]) || 1,
            color: this.sanitizeColor(parts[6]) || '#3b82f6'
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse habit row ${i + 1}:`, error);
      }
    }
    
    return habits;
  }

  private parseCheckmarksCSVEnhanced(csv: string) {
    // Enhanced version of existing parseCheckmarksCSV with better error handling
    const lines = csv.split('\n');
    const header = lines[0].split(',').map(s => s.trim());
    const data: Record<string, Record<string, number>> = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = line.split(',').map(s => s.trim());
        const dateStr = values[0];
        if (!dateStr || !this.isValidDate(dateStr)) continue;
        
        for (let j = 1; j < values.length && j < header.length; j++) {
          const habitName = header[j];
          if (!habitName) continue;
          
          if (!data[habitName]) data[habitName] = {};
          
          const rawValue = parseInt(values[j]) || 0;
          data[habitName][dateStr] = this.normalizeHabitValue(rawValue, habitName);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse checkmarks row ${i + 1}:`, error);
      }
    }
    
    return data;
  }

  private parseScoresCSVEnhanced(csv: string) {
    if (!csv || csv.trim().length === 0) return {};
    
    const lines = csv.split('\n');
    const header = lines[0].split(',').map(s => s.trim());
    const data: Record<string, Record<string, number>> = {};
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const values = line.split(',').map(s => s.trim());
        const dateStr = values[0];
        if (!dateStr || !this.isValidDate(dateStr)) continue;
        
        for (let j = 1; j < values.length && j < header.length; j++) {
          const habitName = header[j];
          if (!habitName) continue;
          
          if (!data[habitName]) data[habitName] = {};
          
          const score = parseFloat(values[j]);
          if (!isNaN(score)) {
            data[habitName][dateStr] = score;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse scores row ${i + 1}:`, error);
      }
    }
    
    return data;
  }

  private sanitizeString(str: string | undefined): string {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, ''); // Remove potential HTML tags
  }

  private sanitizeColor(color: string | undefined): string {
    if (!color) return '#3b82f6';
    const sanitized = color.trim();
    // Validate hex color format
    if (/^#[0-9A-F]{6}$/i.test(sanitized)) {
      return sanitized;
    }
    return '#3b82f6'; // Default color
  }

  private normalizeHabitValue(rawValue: number, habitName: string): number {
    // Enhanced logic from existing parseCheckmarksCSV
    const lower = habitName.toLowerCase();
    
    if (lower.includes('vap')) {
      if (rawValue === 2) return 0; // Success (0 puffs)
      if (rawValue === 0) return 1; // Failure (had puffs)
      if (rawValue === 3) return 3; // Skip
      return 0; // Default to success
    } else if (lower.includes('no ') || lower.includes('quit')) {
      if (rawValue === 0) return 0; // Failure
      if (rawValue === 2) return 1; // Success
      if (rawValue === 3) return 3; // Skip
      return 0; // Default to failure
    } else {
      if (rawValue === 0) return 0; // Failure
      if (rawValue === 2) return 1; // Success
      if (rawValue === 3) return 3; // Skip
      return 0; // Default to failure
    }
  }

  private async detectConflicts(importedHabits: any[]): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    
    // Get existing habits for this user
    const { data: existingHabits } = await this.supabase
      .from('habits')
      .select('id, name, description, created_at')
      .eq('user_id', this.userId);
    
    if (!existingHabits) return conflicts;
    
    for (const importedHabit of importedHabits) {
      const existingHabit = existingHabits.find(h => 
        h.name.toLowerCase() === importedHabit.name.toLowerCase()
      );
      
      if (existingHabit) {
        // Get entry count for existing habit
        const { count } = await this.supabase
          .from('habit_entries')
          .select('*', { count: 'exact', head: true })
          .eq('habit_id', existingHabit.id);
        
        conflicts.push({
          habitName: importedHabit.name,
          existingHabit: {
            ...existingHabit,
            total_entries: count || 0
          },
          importedHabit: {
            name: importedHabit.name,
            description: importedHabit.description,
            entries_count: 0 // Will be calculated
          },
          resolution: 'merge' // Default resolution
        });
      }
    }
    
    return conflicts;
  }

  private applyConflictResolutions(
    importedHabits: any[], 
    conflicts: ConflictResolution[], 
    resolutions: ConflictResolution[]
  ): any[] {
    const resolvedHabits = [...importedHabits];
    
    for (const resolution of resolutions) {
      const habitIndex = resolvedHabits.findIndex(h => h.name === resolution.habitName);
      if (habitIndex === -1) continue;
      
      switch (resolution.resolution) {
        case 'skip':
          resolvedHabits.splice(habitIndex, 1);
          break;
        case 'rename':
          if (resolution.newName) {
            resolvedHabits[habitIndex].name = resolution.newName;
          }
          break;
        case 'replace':
          // Will be handled in import phase
          break;
        case 'merge':
          // Will be handled in import phase
          break;
      }
    }
    
    return resolvedHabits;
  }

  private async importHabitsAndEntries(habits: any[], parsedData: any) {
    let importedHabits = 0;
    let skippedHabits = 0;
    let importedEntries = 0;
    let failedEntries = 0;
    const errors: ImportError[] = [];
    
    const habitMap = new Map<string, string>();
    
    // Get existing habits to avoid duplicates
    const { data: existingHabits } = await this.supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', this.userId);
    
    const existingHabitsMap = new Map<string, string>();
    if (existingHabits) {
      for (const habit of existingHabits) {
        existingHabitsMap.set(habit.name.toLowerCase().trim(), habit.id);
      }
    }
    
    // Import habits
    for (const habit of habits) {
      try {
        const habitKey = habit.name.toLowerCase().trim();
        
        // Check if habit already exists
        if (existingHabitsMap.has(habitKey)) {
          const existingId = existingHabitsMap.get(habitKey);
          habitMap.set(habit.name, existingId!);
          console.log(`📋 Using existing habit: ${habit.name} (${existingId})`);
          skippedHabits++;
          continue;
        }
        
        const { data: insertedHabit } = await this.supabase
          .from('habits')
          .insert({
            user_id: this.userId,
            name: habit.name,
            description: habit.description || habit.question,
            category: this.categorizeHabit(habit.name),
            type: this.determineHabitType(habit.name),
            measurement_type: this.determineMeasurementType(habit),
            color: habit.color,
            position: habit.position,
            target_value: habit.numRepetitions,
          })
          .select('id, name')
          .single();
        
        if (insertedHabit) {
          habitMap.set(habit.name, insertedHabit.id);
          existingHabitsMap.set(habitKey, insertedHabit.id); // Update the map
          console.log(`✅ Created new habit: ${habit.name} (${insertedHabit.id})`);
          importedHabits++;
        } else {
          skippedHabits++;
        }
      } catch (error: any) {
        // Check if it's a duplicate key error
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          console.log(`🔄 Duplicate habit detected, skipping: ${habit.name}`);
          skippedHabits++;
          continue;
        }
        
        errors.push({
          type: 'database',
          severity: 'error',
          message: `Failed to import habit: ${habit.name}`,
          details: error.message,
          habitName: habit.name
        });
        skippedHabits++;
      }
    }
    
    // Import entries - check for existing entries to avoid duplicates
    const entries = [];
    const existingEntriesMap = new Map<string, boolean>();
    
    // Get existing entries to avoid duplicates
    if (habitMap.size > 0) {
      const { data: existingEntries } = await this.supabase
        .from('habit_entries')
        .select('habit_id, date')
        .eq('user_id', this.userId)
        .in('habit_id', Array.from(habitMap.values()));
      
      if (existingEntries) {
        for (const entry of existingEntries) {
          existingEntriesMap.set(`${entry.habit_id}-${entry.date}`, true);
        }
      }
    }
    
    for (const [habitName, dateEntries] of Object.entries(parsedData.checkmarks)) {
      const habitId = habitMap.get(habitName);
      if (!habitId) continue;
      
      for (const [dateStr, value] of Object.entries(dateEntries as Record<string, number>)) {
        if (value !== null && value !== undefined && value >= 0) {
          try {
            const entryKey = `${habitId}-${dateStr}`;
            
            // Skip if entry already exists
            if (existingEntriesMap.has(entryKey)) {
              console.log(`📝 Skipping existing entry: ${habitName} on ${dateStr}`);
              continue;
            }
            
            const isoDate = new Date(dateStr).toISOString();
            const entry = {
              habit_id: habitId,
              user_id: this.userId,
              value: value,
              logged_at: isoDate,
              date: dateStr
            };
            
            // Validate entry before adding
            if (!entry.habit_id || !entry.user_id || entry.value === null || entry.value === undefined) {
              console.error('❌ Invalid entry data:', entry);
              errors.push({
                type: 'parsing',
                severity: 'error',
                message: `Invalid entry data for ${habitName} on ${dateStr}`,
                habitName: habitName
              });
              failedEntries++;
              continue;
            }
            
            entries.push(entry);
          } catch (error: any) {
            errors.push({
              type: 'parsing',
              severity: 'warning',
              message: `Invalid date format: ${dateStr}`,
              habitName: habitName
            });
            failedEntries++;
          }
        }
      }
    }
    
    console.log(`📊 Prepared ${entries.length} new entries for import`);
    
    // Batch insert entries
    if (entries.length > 0) {
      console.log(`📝 About to insert ${entries.length} entries. First entry sample:`, entries[0]);
      
      try {
        // Use safe insertion to prevent duplicates and auto-update streaks
        console.log(`📦 Inserting ${entries.length} entries using safe insertion (prevents duplicates)`);
        let insertedCount = 0;
        
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          
          try {
            // Use the safe insertion function that prevents duplicates
            const { data, error } = await this.supabase
              .rpc('insert_habit_entry_safe', {
                p_habit_id: entry.habit_id,
                p_user_id: entry.user_id,
                p_date: entry.date,
                p_value: entry.value,
                p_notes: entry.notes
              });

            if (error) {
              console.error(`❌ Failed to insert entry ${i + 1}:`, error);
              errors.push({
                type: 'database',
                severity: 'error',
                message: `Failed to insert entry for ${entry.date}: ${error.message}`,
                details: { entry, error }
              });
              failedEntries++;
            } else {
              insertedCount++;
              if ((i + 1) % 100 === 0) {
                console.log(`✅ Processed ${i + 1}/${entries.length} entries (${insertedCount} inserted/updated)`);
              }
            }
          } catch (insertError: any) {
            console.error(`❌ Exception inserting entry ${i + 1}:`, insertError);
            errors.push({
              type: 'database',
              severity: 'error',
              message: `Exception inserting entry for ${entry.date}: ${insertError.message}`,
              details: { entry, error: insertError }
            });
            failedEntries++;
          }
        }
        
        importedEntries = insertedCount;
        if (insertedCount > 0) {
          console.log(`✅ Successfully processed ${importedEntries} habit entries (inserted/updated with duplicate prevention)`);
        }
        
      } catch (error: any) {
        console.error('❌ Database error during entry insertion:', error);
        console.error('❌ Error stack:', error.stack);
        errors.push({
          type: 'database',
          severity: 'error',
          message: 'Database error during entry insertion',
          details: `${error.message} | Stack: ${error.stack?.split('\n')[0] || 'no stack'}`
        });
        failedEntries += entries.length;
      }
    } else {
      console.log('ℹ️ No new entries to import');
    }
    
    return {
      importedHabits,
      skippedHabits,
      importedEntries,
      failedEntries,
      errors
    };
  }

  private async calculateAllStreaks() {
    // Use existing streak calculation logic
    const { data: habits } = await this.supabase
      .from('habits')
      .select('id, name, type')
      .eq('user_id', this.userId);
    
    if (!habits) return;
    
    for (const habit of habits) {
      const { data: entries } = await this.supabase
        .from('habit_entries')
        .select('date, value')
        .eq('habit_id', habit.id)
        .order('date', { ascending: false });
      
      if (!entries || entries.length === 0) continue;
      
      const { currentStreak, bestStreak, totalCompletions } = this.calculateStreakForHabit(
        entries, habit.name, habit.type
      );
      
      await this.supabase
        .from('habits')
        .update({ 
          streak_count: currentStreak,
          best_streak: Math.max(bestStreak, currentStreak),
          total_completions: totalCompletions
        })
        .eq('id', habit.id);
    }
  }

  private calculateStreakForHabit(entries: any[], habitName: string, habitType: string) {
    const isSuccess = (value: number): boolean => {
      const lower = habitName.toLowerCase();
      if (lower.includes('vap')) {
        return value === 0; // 0 puffs = success
      } else if (habitType === 'break') {
        return value === 1; // 1 = success for break habits
      } else {
        return value === 1; // 1 = success for build habits
      }
    };
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let totalCompletions = 0;
    
    const today = new Date();
    const entryMap = new Map(entries.map(e => [e.date, e.value]));
    
    // Calculate current streak
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const value = entryMap.get(dateStr);
      const hasEntry = value !== undefined;
      const success = hasEntry ? isSuccess(value) : false;
      
      if (success) {
        currentStreak++;
        totalCompletions++;
      } else if (hasEntry) {
        break;
      } else if (currentStreak > 0) {
        break;
      }
    }
    
    // Calculate best streak
    const allEntries = entries.reverse();
    for (const entry of allEntries) {
      if (isSuccess(entry.value)) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Count total completions
    totalCompletions = entries.filter(e => isSuccess(e.value)).length;
    
    return { currentStreak, bestStreak, totalCompletions };
  }

  private async generateStatistics() {
    const { data: habits } = await this.supabase
      .from('habits')
      .select('id, name, category, streak_count, total_completions')
      .eq('user_id', this.userId);
    
    if (!habits) return {
      habitsByCategory: {},
      entriesByMonth: {},
      averageStreakLength: 0,
      mostActiveHabit: ''
    };
    
    const habitsByCategory: Record<string, number> = {};
    let totalStreakLength = 0;
    let mostActiveHabit = '';
    let maxCompletions = 0;
    
    for (const habit of habits) {
      // Count by category
      habitsByCategory[habit.category] = (habitsByCategory[habit.category] || 0) + 1;
      
      // Track streak lengths
      totalStreakLength += habit.streak_count || 0;
      
      // Find most active habit
      if ((habit.total_completions || 0) > maxCompletions) {
        maxCompletions = habit.total_completions || 0;
        mostActiveHabit = habit.name;
      }
    }
    
    // Get entries by month
    const { data: entries } = await this.supabase
      .from('habit_entries')
      .select('date')
      .eq('user_id', this.userId);
    
    const entriesByMonth: Record<string, number> = {};
    if (entries) {
      for (const entry of entries) {
        const month = entry.date.substring(0, 7); // YYYY-MM
        entriesByMonth[month] = (entriesByMonth[month] || 0) + 1;
      }
    }
    
    return {
      habitsByCategory,
      entriesByMonth,
      averageStreakLength: habits.length > 0 ? totalStreakLength / habits.length : 0,
      mostActiveHabit
    };
  }

  private generateRecommendations(summary: ImportSummary): string[] {
    const recommendations: string[] = [];
    
    if (summary.importedHabits > 0) {
      recommendations.push(`✅ Successfully imported ${summary.importedHabits} habits with ${summary.importedEntries} entries`);
    }
    
    if (summary.conflicts.length > 0) {
      recommendations.push(`🔄 Resolved ${summary.conflicts.length} naming conflicts - review merged habits`);
    }
    
    if (summary.warnings.length > 0) {
      recommendations.push(`⚠️ ${summary.warnings.length} warnings encountered - check data quality`);
    }
    
    if (summary.statistics.averageStreakLength > 7) {
      recommendations.push(`🔥 Great streak performance! Average streak: ${Math.round(summary.statistics.averageStreakLength)} days`);
    }
    
    if (summary.statistics.mostActiveHabit) {
      recommendations.push(`🏆 Most consistent habit: ${summary.statistics.mostActiveHabit}`);
    }
    
    recommendations.push(`📊 Visit the Analytics dashboard to explore your habit patterns`);
    recommendations.push(`🎯 Consider setting up habit reminders for better consistency`);
    
    return recommendations;
  }

  // Helper methods from original implementation
  private categorizeHabit(name: string | undefined | null): string {
    if (!name) return 'General';
    const lower = name.toLowerCase().trim();
    if (lower.includes('gym') || lower.includes('walk') || lower.includes('exercise')) return 'Fitness';
    if (lower.includes('vap') || lower.includes('smoke') || lower.includes('drink') || lower.includes('pot')) return 'Health';
    if (lower.includes('code') || lower.includes('build') || lower.includes('university')) return 'Productivity';
    if (lower.includes('shower') || lower.includes('wake')) return 'Self Care';
    if (lower.includes('valorant') || lower.includes('game')) return 'Entertainment';
    return 'General';
  }

  private determineHabitType(name: string | undefined | null): 'build' | 'break' {
    if (!name) return 'build';
    const lower = name.toLowerCase().trim();
    if (lower.includes('quit') || lower.includes('no ') || lower.includes('stop')) return 'break';
    return 'build';
  }

  private determineMeasurementType(habit: any): 'boolean' | 'count' | 'duration' | 'rating' {
    if (habit.question?.toLowerCase().includes('did you')) return 'boolean';
    if (habit.question?.toLowerCase().includes('how many')) return 'count';
    if (habit.numRepetitions === 1) return 'boolean';
    return 'count';
  }
}