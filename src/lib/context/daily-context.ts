/**
 * Daily Context Aggregator
 * 
 * Aggregates yesterday's habits and recent patterns into actionable context
 * for Chain View and chain generation. Implements strict temporal semantics:
 * today's chain uses yesterday's data (D-1) plus trailing window, never same-day data.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 6.8
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';
import { SemanticType } from '../habits/taxonomy';
import type { ParsedNoteData } from '../habits/note-parser';

type HabitEntry = Database['public']['Tables']['habit_entries']['Row'];

/**
 * Daily Context data structure
 * 
 * Contains aggregated habit data from yesterday plus recent patterns,
 * used to inform chain generation and provide actionable insights.
 */
export interface DailyContext {
  date: string; // ISO date (YYYY-MM-DD)
  
  wake: {
    timestamp?: string; // ISO timestamp
    source?: 'wake_events' | 'habit' | 'manual';
    reliability: number; // 0.0-1.0
  };
  
  substances: {
    nicotine: {
      used: boolean;
      pouches?: number;
      strength_mg?: number;
      last_used_time?: string;
      reliability: number;
    };
    cannabis: {
      used: boolean;
      sessions?: number;
      method?: string;
      last_used_time?: string;
      reliability: number;
    };
    caffeine: {
      used: boolean;
      drinks?: string[];
      last_used_time?: string;
      reliability: number;
    };
  };
  
  meds: {
    taken: boolean;
    last_taken_time?: string;
    reliability: number;
  };
  
  hygiene: {
    shower_done: boolean;
    shower_type?: string;
    oral_sessions?: number;
    skincare_done?: boolean;
    reliability: number;
  };
  
  meals: {
    cooked_meals?: number;
    likely_meal_count?: 0 | 1 | 2 | 3;
    reliability: number;
  };
  
  day_flags: {
    low_energy_risk: boolean;
    sleep_debt_risk: boolean;
  };
  
  duration_priors: {
    bathroom_min: number;
    hygiene_min: number;
    shower_min: number;
    dress_min: number;
    pack_min: number;
    cook_simple_meal_min: number;
  };
}

/**
 * Query yesterday's habit entries (WHERE date < D)
 * 
 * CRITICAL: This enforces temporal boundary - we NEVER include same-day data.
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param date - Current date (D)
 * @returns Habit entries from yesterday (D-1)
 * 
 * Requirements: 5.1, 8.1, 8.6
 */
async function queryYesterdayHabits(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  date: Date
): Promise<HabitEntry[]> {
  // Calculate yesterday's date
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('habit_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', yesterdayStr)
    .order('logged_at', { ascending: false });
  
  if (error) {
    console.error('Error querying yesterday habits:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Query trailing window of habit entries (7-30 days before yesterday)
 * 
 * Used for pattern detection and duration priors calculation.
 * 
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param date - Current date (D)
 * @param days - Number of days to look back (default 30)
 * @returns Habit entries from trailing window
 * 
 * Requirements: 5.2
 */
async function queryTrailingWindow(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  date: Date,
  days: number = 30
): Promise<HabitEntry[]> {
  // Calculate date range: from (D - days - 1) to (D - 1)
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() - 1); // Yesterday
  
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - days - 1);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('habit_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error querying trailing window:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Aggregate substance data (nicotine, cannabis, caffeine)
 * 
 * @param entries - Habit entries to aggregate
 * @returns Aggregated substance data
 * 
 * Requirements: 5.4, 5.5, 5.6
 */
function aggregateSubstances(entries: HabitEntry[]): DailyContext['substances'] {
  const nicotineEntries = entries.filter(e => 
    e.notes?.toLowerCase().includes('pouch') || 
    e.notes?.toLowerCase().includes('nicotine')
  );
  
  const cannabisEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('sesh') ||
    e.notes?.toLowerCase().includes('pot') ||
    e.notes?.toLowerCase().includes('cannabis')
  );
  
  const caffeineEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('monster') ||
    e.notes?.toLowerCase().includes('lucozade') ||
    e.notes?.toLowerCase().includes('red bull') ||
    e.notes?.toLowerCase().includes('energy drink')
  );
  
  // Aggregate nicotine
  let totalPouches = 0;
  let totalStrength = 0;
  let strengthCount = 0;
  let lastNicotineTime: string | undefined;
  
  for (const entry of nicotineEntries) {
    if (entry.notes) {
      // Extract pouch count
      const pouchMatch = entry.notes.match(/(\d+)\s*pouch/i);
      if (pouchMatch) {
        totalPouches += parseInt(pouchMatch[1]);
      }
      
      // Extract strength
      const strengthMatch = entry.notes.match(/(\d+(?:\.\d+)?)\s*mg/i);
      if (strengthMatch) {
        totalStrength += parseFloat(strengthMatch[1]);
        strengthCount++;
      }
    }
    
    if (entry.logged_at && !lastNicotineTime) {
      lastNicotineTime = entry.logged_at;
    }
  }
  
  // Aggregate cannabis
  let totalSessions = 0;
  let primaryMethod: string | undefined;
  let lastCannabisTime: string | undefined;
  
  for (const entry of cannabisEntries) {
    if (entry.notes) {
      // Extract session count
      const sessionMatch = entry.notes.match(/(\d+(?:\.\d+)?)\s*sesh/i);
      if (sessionMatch) {
        totalSessions += parseFloat(sessionMatch[1]);
      } else if (entry.value === 1) {
        totalSessions += 1; // Default to 1 session if completed
      }
      
      // Extract method
      const methodMatch = entry.notes.match(/(vaporizer|bong|edible|avb|joint)/i);
      if (methodMatch && !primaryMethod) {
        primaryMethod = methodMatch[1].toLowerCase();
      }
    }
    
    if (entry.logged_at && !lastCannabisTime) {
      lastCannabisTime = entry.logged_at;
    }
  }
  
  // Aggregate caffeine
  const drinks: string[] = [];
  let lastCaffeineTime: string | undefined;
  
  for (const entry of caffeineEntries) {
    if (entry.notes) {
      const drinkMatch = entry.notes.match(/(monster|lucozade|red bull|energy drink)(?:\s+(ultra\s+\w+|original|sugar\s+free))?/i);
      if (drinkMatch) {
        const drink = drinkMatch[2] 
          ? `${drinkMatch[1]} ${drinkMatch[2]}`.toLowerCase()
          : drinkMatch[1].toLowerCase();
        drinks.push(drink);
      }
    }
    
    if (entry.logged_at && !lastCaffeineTime) {
      lastCaffeineTime = entry.logged_at;
    }
  }
  
  return {
    nicotine: {
      used: nicotineEntries.length > 0,
      pouches: totalPouches > 0 ? totalPouches : undefined,
      strength_mg: strengthCount > 0 ? totalStrength / strengthCount : undefined,
      last_used_time: lastNicotineTime,
      reliability: calculateReliability(nicotineEntries, 'nicotine', 7),
    },
    cannabis: {
      used: cannabisEntries.length > 0,
      sessions: totalSessions > 0 ? totalSessions : undefined,
      method: primaryMethod,
      last_used_time: lastCannabisTime,
      reliability: calculateReliability(cannabisEntries, 'cannabis', 7),
    },
    caffeine: {
      used: caffeineEntries.length > 0,
      drinks: drinks.length > 0 ? drinks : undefined,
      last_used_time: lastCaffeineTime,
      reliability: calculateReliability(caffeineEntries, 'caffeine', 7),
    },
  };
}

/**
 * Aggregate medication data
 * 
 * @param entries - Habit entries to aggregate
 * @returns Aggregated meds data
 * 
 * Requirements: 5.9
 */
function aggregateMeds(entries: HabitEntry[]): DailyContext['meds'] {
  const medsEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('med') ||
    e.notes?.toLowerCase().includes('pill') ||
    e.notes?.toLowerCase().includes('supplement')
  );
  
  const taken = medsEntries.some(e => e.value === 1);
  const lastTakenEntry = medsEntries.find(e => e.value === 1);
  
  return {
    taken,
    last_taken_time: lastTakenEntry?.logged_at || undefined,
    reliability: calculateReliability(medsEntries, 'meds', 7),
  };
}

/**
 * Aggregate hygiene data (shower, oral, skincare)
 * 
 * @param entries - Habit entries to aggregate
 * @returns Aggregated hygiene data
 * 
 * Requirements: 5.7
 */
function aggregateHygiene(entries: HabitEntry[]): DailyContext['hygiene'] {
  const showerEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('shower') ||
    e.notes?.toLowerCase().includes('bath') ||
    e.notes?.toLowerCase().includes('wash')
  );
  
  const oralEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('oral') ||
    e.notes?.toLowerCase().includes('teeth') ||
    e.notes?.toLowerCase().includes('brush') ||
    e.notes?.toLowerCase().includes('floss')
  );
  
  const skincareEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('skincare') ||
    e.notes?.toLowerCase().includes('moisturi')
  );
  
  // Determine shower type
  let showerType: string | undefined;
  for (const entry of showerEntries) {
    if (entry.notes) {
      const typeMatch = entry.notes.match(/(reg(?:ular)?\s*shower|head\s*shower|proper\s*cleanse|only\s*water)/i);
      if (typeMatch) {
        showerType = typeMatch[1].toLowerCase().replace(/\s+/g, '_');
        break;
      }
    }
  }
  
  // Count oral hygiene sessions
  let oralSessions = 0;
  for (const entry of oralEntries) {
    if (entry.value === 1) {
      oralSessions++;
    }
  }
  
  return {
    shower_done: showerEntries.some(e => e.value === 1),
    shower_type: showerType,
    oral_sessions: oralSessions > 0 ? oralSessions : undefined,
    skincare_done: skincareEntries.some(e => e.value === 1),
    reliability: calculateReliability([...showerEntries, ...oralEntries, ...skincareEntries], 'hygiene', 7),
  };
}

/**
 * Aggregate meal data
 * 
 * @param entries - Habit entries to aggregate
 * @returns Aggregated meal data
 * 
 * Requirements: 5.8
 */
function aggregateMeals(entries: HabitEntry[]): DailyContext['meals'] {
  const mealEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('meal') ||
    e.notes?.toLowerCase().includes('cook') ||
    e.notes?.toLowerCase().includes('food')
  );
  
  let cookedMeals = 0;
  
  for (const entry of mealEntries) {
    if (entry.notes) {
      // Extract meal count
      const mealMatch = entry.notes.match(/(\d+)\s*meal/i);
      if (mealMatch) {
        cookedMeals += parseInt(mealMatch[1]);
      } else if (entry.value === 1) {
        cookedMeals += 1; // Default to 1 meal if completed
      }
    }
  }
  
  // Estimate likely total meal count (cooked + takeout/simple)
  let likelyMealCount: 0 | 1 | 2 | 3 = 0;
  if (cookedMeals >= 3) {
    likelyMealCount = 3;
  } else if (cookedMeals === 2) {
    likelyMealCount = 3; // Likely had 1 simple meal
  } else if (cookedMeals === 1) {
    likelyMealCount = 2; // Likely had 1-2 simple meals
  } else {
    likelyMealCount = 1; // Likely had at least 1 simple meal
  }
  
  return {
    cooked_meals: cookedMeals > 0 ? cookedMeals : undefined,
    likely_meal_count: likelyMealCount,
    reliability: calculateReliability(mealEntries, 'meals', 7),
  };
}

/**
 * Calculate duration priors from trailing window
 * 
 * Uses median durations from recent history to provide realistic
 * time estimates for common activities.
 * 
 * @param entries - Habit entries from trailing window
 * @returns Duration priors in minutes
 * 
 * Requirements: 5.10, 5.11
 */
function calculateDurationPriors(entries: HabitEntry[]): DailyContext['duration_priors'] {
  // Extract duration data by activity type
  const bathroomDurations: number[] = [];
  const hygieneDurations: number[] = [];
  const showerDurations: number[] = [];
  const dressDurations: number[] = [];
  const packDurations: number[] = [];
  const cookDurations: number[] = [];
  
  for (const entry of entries) {
    if (entry.duration_minutes && entry.duration_minutes > 0) {
      const notes = entry.notes?.toLowerCase() || '';
      
      if (notes.includes('bathroom')) {
        bathroomDurations.push(entry.duration_minutes);
      }
      if (notes.includes('hygiene') || notes.includes('oral') || notes.includes('teeth')) {
        hygieneDurations.push(entry.duration_minutes);
      }
      if (notes.includes('shower') || notes.includes('bath')) {
        showerDurations.push(entry.duration_minutes);
      }
      if (notes.includes('dress') || notes.includes('clothes')) {
        dressDurations.push(entry.duration_minutes);
      }
      if (notes.includes('pack') || notes.includes('bag')) {
        packDurations.push(entry.duration_minutes);
      }
      if (notes.includes('cook') || notes.includes('meal')) {
        cookDurations.push(entry.duration_minutes);
      }
    }
  }
  
  // Calculate medians with fallback defaults
  return {
    bathroom_min: median(bathroomDurations) || 5,
    hygiene_min: median(hygieneDurations) || 8,
    shower_min: median(showerDurations) || 10,
    dress_min: median(dressDurations) || 5,
    pack_min: median(packDurations) || 3,
    cook_simple_meal_min: median(cookDurations) || 20,
  };
}

/**
 * Detect risk flags based on patterns
 * 
 * @param entries - Habit entries to analyze
 * @param wakeTime - Optional wake time for sleep analysis
 * @returns Risk flags
 * 
 * Requirements: 5.11, 5.12
 */
function detectRiskFlags(
  entries: HabitEntry[],
  wakeTime?: Date
): DailyContext['day_flags'] {
  // Detect low energy risk (late caffeine or insufficient sleep)
  const caffeineEntries = entries.filter(e =>
    e.notes?.toLowerCase().includes('monster') ||
    e.notes?.toLowerCase().includes('lucozade') ||
    e.notes?.toLowerCase().includes('energy drink')
  );
  
  let lowEnergyRisk = false;
  
  // Check for late caffeine consumption (after 6pm)
  for (const entry of caffeineEntries) {
    if (entry.logged_at) {
      const loggedTime = new Date(entry.logged_at);
      const hour = loggedTime.getHours();
      if (hour >= 18) {
        lowEnergyRisk = true;
        break;
      }
    }
  }
  
  // Check for insufficient sleep (wake time after 9am)
  if (wakeTime && wakeTime.getHours() >= 9) {
    lowEnergyRisk = true;
  }
  
  // Detect sleep debt risk (consistent late wake times)
  let sleepDebtRisk = false;
  
  if (wakeTime && wakeTime.getHours() >= 10) {
    sleepDebtRisk = true;
  }
  
  return {
    low_energy_risk: lowEnergyRisk,
    sleep_debt_risk: sleepDebtRisk,
  };
}

/**
 * Calculate reliability score for a category
 * 
 * Reliability is based on:
 * - Recency: More recent data = higher reliability
 * - Completeness: More entries = higher reliability
 * - Consistency: Less variance = higher reliability
 * 
 * @param entries - Habit entries for the category
 * @param category - Category name (for logging)
 * @param trailingWindowDays - Number of days in trailing window
 * @returns Reliability score (0.0-1.0)
 * 
 * Requirements: 5.14, 6.8
 */
function calculateReliability(
  entries: HabitEntry[],
  category: string,
  trailingWindowDays: number
): number {
  if (entries.length === 0) {
    return 0.0;
  }
  
  // Recency score: based on how recent the entries are
  const now = new Date();
  const recentEntries = entries.filter(e => {
    if (!e.date) return false;
    const entryDate = new Date(e.date);
    const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= trailingWindowDays;
  });
  
  const recencyScore = Math.min(1.0, recentEntries.length / trailingWindowDays);
  
  // Completeness score: based on number of entries
  const completenessScore = Math.min(1.0, entries.length / 7); // 7 days ideal
  
  // Consistency score: based on variance in values
  const values = entries.map(e => e.value || 0);
  const consistencyScore = values.length > 1 ? 1.0 - (variance(values) / Math.max(...values, 1)) : 0.5;
  
  // Weighted average
  return Math.max(0.0, Math.min(1.0, 
    recencyScore * 0.4 + completenessScore * 0.3 + consistencyScore * 0.3
  ));
}

/**
 * Calculate median of an array of numbers
 */
function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

/**
 * Calculate variance of an array of numbers
 */
function variance(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Generate daily context for a given date
 * 
 * This is the main entry point for the daily context aggregator.
 * It queries yesterday's habits and trailing window, then aggregates
 * all data into a comprehensive DailyContext object.
 * 
 * CRITICAL: Enforces temporal boundary - only uses data WHERE date < D.
 * 
 * @param userId - User ID
 * @param date - Current date (D)
 * @param supabaseUrl - Supabase URL (optional, uses env var if not provided)
 * @param supabaseKey - Supabase key (optional, uses env var if not provided)
 * @returns Daily context object
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 5.14, 6.8
 */
export async function generateDailyContext(
  userId: string,
  date: Date,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<DailyContext> {
  // Create Supabase client
  const runtimeEnv = (import.meta as any).env || {};
  const url =
    supabaseUrl ||
    runtimeEnv.PUBLIC_SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL ||
    '';
  const key =
    supabaseKey ||
    runtimeEnv.PUBLIC_SUPABASE_ANON_KEY ||
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
    '';
  
  if (!url || !key) {
    throw new Error('Supabase URL and key are required');
  }
  
  const supabase = createClient<Database>(url, key);
  
  // Query yesterday's habits (WHERE date < D)
  const yesterdayEntries = await queryYesterdayHabits(supabase, userId, date);
  
  // Query trailing window for pattern detection
  const trailingEntries = await queryTrailingWindow(supabase, userId, date, 30);
  
  // Handle fallback when yesterday has zero entries
  const primaryEntries = yesterdayEntries.length > 0 ? yesterdayEntries : trailingEntries;
  
  // Aggregate all data
  const substances = aggregateSubstances(primaryEntries);
  const meds = aggregateMeds(primaryEntries);
  const hygiene = aggregateHygiene(primaryEntries);
  const meals = aggregateMeals(primaryEntries);
  const durationPriors = calculateDurationPriors(trailingEntries);
  const dayFlags = detectRiskFlags(primaryEntries);
  
  // Build DailyContext
  const context: DailyContext = {
    date: date.toISOString().split('T')[0],
    wake: {
      reliability: 0.0, // No wake_events table yet
    },
    substances,
    meds,
    hygiene,
    meals,
    day_flags: dayFlags,
    duration_priors: durationPriors,
  };
  
  // Adjust reliability scores if using fallback
  if (yesterdayEntries.length === 0) {
    context.substances.nicotine.reliability = Math.min(0.4, context.substances.nicotine.reliability);
    context.substances.cannabis.reliability = Math.min(0.4, context.substances.cannabis.reliability);
    context.substances.caffeine.reliability = Math.min(0.4, context.substances.caffeine.reliability);
    context.meds.reliability = Math.min(0.4, context.meds.reliability);
    context.hygiene.reliability = Math.min(0.4, context.hygiene.reliability);
    context.meals.reliability = Math.min(0.4, context.meals.reliability);
  }
  
  return context;
}
