// Daily Plan Generator V1 - Plan Builder Service

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Location } from '../../types/uk-student-travel';
import type { CalendarEvent } from '../../types/calendar';
import type { Task } from '../../types/task-management';
import type { Routine as RoutineType } from '../../types/uk-student';
import type {
  DailyPlan,
  PlanInput,
  TimeBlock,
  EnergyState,
  ActivityType,
  CreateDailyPlan,
  CreateTimeBlock,
  CreateExitTime,
} from '../../types/daily-plan';
import { calendarService } from '../calendar/calendar-service';
import { TaskService } from '../task-management/task-service';
import { RoutineService } from '../uk-student/routine-service';
import { ExitTimeCalculator, type Commitment, type ExitTimeResult } from './exit-time-calculator';
import {
  createDailyPlan,
  createTimeBlocks,
  createExitTimes,
  getDailyPlanByDateWithBlocks,
  getDailyPlanWithBlocks,
  updateDailyPlan,
  updateTimeBlock,
  deleteTimeBlock,
  createTimeBlock,
} from './database';

// V2 Chain-Based Execution imports
import { AnchorService } from '../anchors/anchor-service';
import { ChainGenerator } from '../chains/chain-generator';
import { LocationStateTracker } from '../chains/location-state';
import { WakeRampGenerator } from '../chains/wake-ramp';
import type { ExecutionChain, HomeInterval, LocationPeriod, WakeRamp } from '../chains/types';

// Internal types for plan building
interface Activity {
  type: ActivityType;
  name: string;
  duration: number; // minutes
  isFixed: boolean;
  startTime?: Date; // For fixed commitments
  location?: Location;
  activityId?: string; // Reference to task/commitment/routine
}

interface PlanInputs {
  commitments: Commitment[];
  tasks: Task[];
  routines: {
    morning?: RoutineType;
    evening?: RoutineType;
  };
}

// Meal scheduling constants for V1.2
// Requirements: 1.1, 1.2, 1.3, 2.1, 5.1, 5.2, 5.3, 5.4
const MEAL_WINDOWS = {
  breakfast: { start: '06:30', end: '11:30' },
  lunch: { start: '11:30', end: '15:30' },
  dinner: { start: '17:00', end: '21:30' }
};

const MIN_MEAL_GAP_MINUTES = 180; // 3 hours

const DEFAULT_MEAL_TIMES = {
  breakfast: '09:30',
  lunch: '13:00',
  dinner: '19:00'
};

// Meal durations (in minutes)
const MEAL_DURATIONS = {
  breakfast: 15,
  lunch: 30,
  dinner: 45
};

// Types for meal placement
type MealType = 'breakfast' | 'lunch' | 'dinner';

interface MealPlacement {
  meal: MealType;
  time?: Date;
  duration?: number;
  skipped: boolean;
  skipReason?: string;
  metadata?: {
    targetTime?: Date;
    placementReason?: 'anchor-aware' | 'default';
  };
}

/**
 * Parse time string (HH:MM) and apply to a date
 */
function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Check if a time slot conflicts with any anchors
 */
function hasConflict(
  proposedStart: Date,
  proposedEnd: Date,
  anchors: TimeBlock[]
): boolean {
  for (const anchor of anchors) {
    const anchorStart = anchor.startTime.getTime();
    const anchorEnd = anchor.endTime.getTime();
    const propStart = proposedStart.getTime();
    const propEnd = proposedEnd.getTime();

    // Check for overlap
    if (propStart < anchorEnd && propEnd > anchorStart) {
      return true;
    }
  }
  return false;
}

/**
 * Check meal spacing constraint
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
function checkMealSpacing(
  proposedTime: Date,
  previousMealEndTime: Date | null
): boolean {
  if (!previousMealEndTime) {
    return true; // No previous meal, spacing is satisfied
  }

  const gapMinutes = (proposedTime.getTime() - previousMealEndTime.getTime()) / 60000;
  return gapMinutes >= MIN_MEAL_GAP_MINUTES;
}

/**
 * Clamp target time to meal window
 * Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3
 */
function clampToMealWindow(
  targetTime: Date,
  mealType: MealType,
  now: Date
): Date | null {
  const window = MEAL_WINDOWS[mealType];
  const windowStart = parseTimeToDate(window.start, targetTime);
  const windowEnd = parseTimeToDate(window.end, targetTime);

  // Check if current time is past the window
  if (now > windowEnd) {
    return null; // Past meal window
  }

  // Clamp target time to window
  let clamped = new Date(targetTime);
  if (clamped < windowStart) {
    clamped = windowStart;
  }
  if (clamped > windowEnd) {
    clamped = windowEnd;
  }

  // Ensure clamped time is not in the past
  if (clamped < now) {
    clamped = new Date(now);
  }

  // Final check: if clamped time is past window end, return null
  if (clamped > windowEnd) {
    return null;
  }

  return clamped;
}

/**
 * Find available slot near target time
 * Requirements: 7.3, 7.4
 */
function findAvailableSlot(
  targetTime: Date,
  duration: number,
  anchors: TimeBlock[],
  searchRangeMinutes: number = 30
): Date | null {
  // Try the target time first
  const targetEnd = new Date(targetTime.getTime() + duration * 60000);
  if (!hasConflict(targetTime, targetEnd, anchors)) {
    return targetTime;
  }

  // Search forward in 5-minute increments
  for (let offset = 5; offset <= searchRangeMinutes; offset += 5) {
    const candidateTime = new Date(targetTime.getTime() + offset * 60000);
    const candidateEnd = new Date(candidateTime.getTime() + duration * 60000);
    if (!hasConflict(candidateTime, candidateEnd, anchors)) {
      return candidateTime;
    }
  }

  // Search backward in 5-minute increments
  for (let offset = 5; offset <= searchRangeMinutes; offset += 5) {
    const candidateTime = new Date(targetTime.getTime() - offset * 60000);
    const candidateEnd = new Date(candidateTime.getTime() + duration * 60000);
    if (!hasConflict(candidateTime, candidateEnd, anchors)) {
      return candidateTime;
    }
  }

  return null; // No available slot found
}

/**
 * Calculate target time for a meal based on anchors or defaults
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4
 */
function calculateMealTargetTime(
  mealType: MealType,
  anchors: TimeBlock[],
  wakeTime: Date,
  now: Date
): Date {
  // If no anchors, use default times
  if (anchors.length === 0) {
    const defaultTime = parseTimeToDate(DEFAULT_MEAL_TIMES[mealType], wakeTime);
    
    // Special handling for breakfast based on wake time
    if (mealType === 'breakfast') {
      if (wakeTime.getHours() >= 9) {
        // If wake time is 9am or later, schedule breakfast 45 minutes after wake
        return new Date(wakeTime.getTime() + 45 * 60000);
      }
    }
    
    return defaultTime;
  }

  // Anchor-aware placement
  switch (mealType) {
    case 'breakfast': {
      // Place near wake time if within breakfast window
      const breakfastTarget = new Date(wakeTime.getTime() + 45 * 60000);
      return breakfastTarget;
    }

    case 'lunch': {
      // Find morning anchors (before 12:00)
      const noon = new Date(wakeTime);
      noon.setHours(12, 0, 0, 0);
      
      const morningAnchors = anchors.filter(a => a.endTime < noon);
      
      if (morningAnchors.length > 0) {
        // Place after last morning anchor
        const lastMorningAnchor = morningAnchors[morningAnchors.length - 1];
        return new Date(lastMorningAnchor.endTime.getTime() + 30 * 60000);
      }
      
      // Default to 12:30
      const lunchDefault = new Date(wakeTime);
      lunchDefault.setHours(12, 30, 0, 0);
      return lunchDefault;
    }

    case 'dinner': {
      // Find evening anchors (after 15:00)
      const afternoon = new Date(wakeTime);
      afternoon.setHours(15, 0, 0, 0);
      
      const eveningAnchors = anchors.filter(a => a.endTime > afternoon);
      
      if (eveningAnchors.length > 0) {
        // Place after last evening anchor
        const lastEveningAnchor = eveningAnchors[eveningAnchors.length - 1];
        return new Date(lastEveningAnchor.endTime.getTime() + 30 * 60000);
      }
      
      // Default to 19:00
      const dinnerDefault = new Date(wakeTime);
      dinnerDefault.setHours(19, 0, 0, 0);
      return dinnerDefault;
    }
  }
}

/**
 * Check if a time falls within any home interval
 * Requirements: 8.5, 11.2, 17.5
 */
function isInHomeInterval(
  time: Date,
  homeIntervals: HomeInterval[]
): boolean {
  if (homeIntervals.length === 0) {
    // If no home intervals provided (V1.2 mode), assume always at home
    return true;
  }

  const timeMs = time.getTime();
  for (const interval of homeIntervals) {
    if (timeMs >= interval.start.getTime() && timeMs <= interval.end.getTime()) {
      return true;
    }
  }
  return false;
}

/**
 * Place meals with constraints
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.5, 11.2, 11.3, 17.5
 */
function placeMeals(
  anchors: TimeBlock[],
  wakeTime: Date,
  sleepTime: Date,
  now: Date,
  homeIntervals: HomeInterval[] = [] // V2: Home intervals for location-aware placement
): MealPlacement[] {
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner'];
  const placements: MealPlacement[] = [];
  let previousMealEnd: Date | null = null;

  console.log('[placeMeals] Starting meal placement');
  console.log(`[placeMeals] Wake: ${wakeTime.toLocaleTimeString()}, Sleep: ${sleepTime.toLocaleTimeString()}, Now: ${now.toLocaleTimeString()}`);
  console.log(`[placeMeals] Home intervals: ${homeIntervals.length}`);

  for (const meal of meals) {
    console.log(`[placeMeals] Processing ${meal}...`);
    
    // 1. Calculate target time
    const targetTime = calculateMealTargetTime(meal, anchors, wakeTime, now);
    console.log(`[placeMeals]   Target time calculated: ${targetTime.toLocaleTimeString()}`);
    
    // 2. Clamp to meal window
    const clampedTime = clampToMealWindow(targetTime, meal, now);
    if (!clampedTime) {
      console.log(`[placeMeals]   SKIP: Past meal window`);
      placements.push({
        meal,
        skipped: true,
        skipReason: 'Past meal window',
      });
      continue;
    }
    console.log(`[placeMeals]   Clamped to window: ${clampedTime.toLocaleTimeString()}`);
    
    // 3. Check spacing constraint
    if (!checkMealSpacing(clampedTime, previousMealEnd)) {
      console.log(`[placeMeals]   SKIP: Spacing constraint (previous meal ended at ${previousMealEnd?.toLocaleTimeString()})`);
      placements.push({
        meal,
        skipped: true,
        skipReason: 'Spacing constraint',
      });
      continue;
    }
    console.log(`[placeMeals]   Spacing check passed`);
    
    // 4. Find available slot
    const duration = MEAL_DURATIONS[meal];
    const slot = findAvailableSlot(clampedTime, duration, anchors);
    if (!slot) {
      console.log(`[placeMeals]   SKIP: No valid slot found`);
      placements.push({
        meal,
        skipped: true,
        skipReason: 'No valid slot',
      });
      continue;
    }
    console.log(`[placeMeals]   Available slot found: ${slot.toLocaleTimeString()}`);
    
    // 5. V2: Check if meal time falls in home interval
    // Requirements: 8.5, 11.2, 11.3, 17.5
    if (!isInHomeInterval(slot, homeIntervals)) {
      console.log(`[placeMeals]   SKIP: Not in home interval`);
      placements.push({
        meal,
        skipped: true,
        skipReason: 'No home interval',
      });
      continue;
    }
    console.log(`[placeMeals]   Home interval check passed`);
    
    // 6. Check if meal fits before sleep time
    const mealEnd = new Date(slot.getTime() + duration * 60000);
    if (mealEnd > sleepTime) {
      console.log(`[placeMeals]   SKIP: Would exceed sleep time (${mealEnd.toLocaleTimeString()} > ${sleepTime.toLocaleTimeString()})`);
      placements.push({
        meal,
        skipped: true,
        skipReason: 'Would exceed sleep time',
      });
      continue;
    }
    
    // 7. Place meal
    const placementReason = anchors.length > 0 ? 'anchor-aware' : 'default';
    console.log(`[placeMeals]   PLACED: ${slot.toLocaleTimeString()} - ${mealEnd.toLocaleTimeString()} (${placementReason})`);
    placements.push({
      meal,
      time: slot,
      duration,
      skipped: false,
      metadata: {
        targetTime,
        placementReason,
      },
    });
    
    previousMealEnd = mealEnd;
  }

  console.log(`[placeMeals] Completed: ${placements.filter(p => !p.skipped).length} meals placed, ${placements.filter(p => p.skipped).length} skipped`);
  return placements;
}

export class PlanBuilderService {
  private supabase: SupabaseClient<any, any, any>;
  private exitTimeCalculator: ExitTimeCalculator;
  
  // V2 Chain-Based Execution services
  private anchorService: AnchorService;
  private chainGenerator: ChainGenerator;
  private locationStateTracker: LocationStateTracker;
  private wakeRampGenerator: WakeRampGenerator;

  constructor(supabase: SupabaseClient<any, any, any>) {
    this.supabase = supabase;
    this.exitTimeCalculator = new ExitTimeCalculator();
    
    // Initialize V2 services
    this.anchorService = new AnchorService();
    this.chainGenerator = new ChainGenerator();
    this.locationStateTracker = new LocationStateTracker();
    this.wakeRampGenerator = new WakeRampGenerator();
  }

  /**
   * Round up to next 5-minute interval
   */
  private roundUpToNext5Minutes(date: Date): Date {
    const rounded = new Date(date);
    const minutes = rounded.getMinutes();
    const remainder = minutes % 5;
    if (remainder !== 0) {
      rounded.setMinutes(minutes + (5 - remainder));
    }
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  }

  /**
   * Generate a daily plan
   * 
   * Requirements: 1.1, 9.1, 12.1, 12.2, 12.3, 12.4, 12.5
   */
  async generateDailyPlan(input: PlanInput, currentLocation: Location): Promise<DailyPlan> {
    // Step 1: Compute plan start time (max of wake time or current time rounded up)
    const now = new Date();
    const roundedNow = this.roundUpToNext5Minutes(now);
    const planStartTime = new Date(Math.max(input.wakeTime.getTime(), roundedNow.getTime()));

    // Step 2: Generate Wake Ramp (V2)
    // Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2
    const wakeRamp = this.wakeRampGenerator.generateWakeRamp(
      planStartTime,
      input.wakeTime,
      input.energyState
    );
    
    console.log('[V2 Chain Generation] Wake Ramp:', wakeRamp.skipped ? 'SKIPPED' : `${wakeRamp.duration} minutes`);

    // Step 3: Get anchors from calendar (V2)
    // Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
    const anchors = await this.anchorService.getAnchorsForDate(input.date, input.userId, this.supabase);
    console.log(`[V2 Chain Generation] Found ${anchors.length} anchors`);

    // Step 4: Generate execution chains (V2)
    // Requirements: 12.1, 12.2, 12.3, 12.4
    const chains = await this.chainGenerator.generateChainsForDate(
      anchors,
      {
        userId: input.userId,
        date: input.date,
        config: {
          currentLocation,
        },
      }
    );
    console.log(`[V2 Chain Generation] Generated ${chains.length} execution chains`);

    // Step 5: Calculate location periods and home intervals (V2)
    // Requirements: 8.1, 8.2, 8.3, 8.4, 17.1, 17.2, 17.3, 17.4
    const locationPeriods = this.locationStateTracker.calculateLocationPeriods(
      chains,
      planStartTime,
      input.sleepTime
    );
    const homeIntervals = this.locationStateTracker.calculateHomeIntervals(
      locationPeriods
    );
    console.log(`[V2 Chain Generation] Calculated ${homeIntervals.length} home intervals`);

    // Step 6: Gather inputs (V1.2 - kept for backward compatibility)
    const inputs = await this.gatherInputs(input.userId, input.date);

    // Step 7: Build activity list (V1.2 - kept for backward compatibility)
    const activities = this.buildActivityList(inputs, input.energyState);

    // Step 8: Create time blocks with exit times (V1.2 - demoted to timeline generation)
    // Now includes home intervals for meal placement
    const { timeBlocks, exitTimes, commitmentTravelMap } = await this.createTimeBlocksWithExitTimes(
      activities,
      inputs,
      input.wakeTime,
      input.sleepTime,
      currentLocation,
      planStartTime,
      input.energyState,
      homeIntervals // Pass home intervals for meal placement
    );

    // Step 9: Save to database (includes chains, wake_ramp, location_periods, home_intervals)
    const plan = await this.savePlan(
      input,
      timeBlocks,
      exitTimes,
      commitmentTravelMap,
      chains,
      wakeRamp,
      locationPeriods,
      homeIntervals
    );

    return plan;
  }

  /**
   * Gather inputs for plan generation
   * 
   * Requirements: 5.1, 7.1, 10.1
   */
  private async gatherInputs(userId: string, date: Date): Promise<PlanInputs> {
    // Fetch calendar commitments for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const calendarEvents = await calendarService.getCalendarEvents(
      userId,
      {
        startDate: startOfDay,
        endDate: endOfDay,
      },
      this.supabase
    );

    // Convert calendar events to commitments
    const commitments: Commitment[] = calendarEvents
      .filter(event => event.event_type !== 'task') // Exclude task events
      .map(event => ({
        id: event.id,
        title: event.title,
        startTime: new Date(event.start_time),
        endTime: new Date(event.end_time),
        location: event.location ? this.parseLocation(event.location) : undefined,
      }));

    // Fetch pending tasks (limit 10)
    const tasksResponse = await TaskService.getTasks(
      userId,
      {
        status: 'pending',
        limit: 10,
        sort_by: 'deadline',
        sort_order: 'asc',
      },
      this.supabase as any
    );
    const tasks = tasksResponse.tasks;

    // Fetch active routines (with fallback to defaults if service unavailable)
    let routines: { morning?: RoutineType; evening?: RoutineType } = {};
    try {
      const routineService = new RoutineService(this.supabase as any, userId);
      const activeRoutines = await routineService.getActiveRoutines();

      // Find morning and evening routines
      routines.morning = activeRoutines.find(r => r.routine_type === 'morning');
      routines.evening = activeRoutines.find(r => r.routine_type === 'evening');
    } catch (error) {
      console.warn('Failed to fetch routines, will use defaults:', error);
      // Fallback to defaults will be handled in buildActivityList
    }

    return {
      commitments,
      tasks,
      routines,
    };
  }

  /**
   * Parse location string into Location object
   */
  private parseLocation(locationStr: string): Location | undefined {
    // Simple parsing - in production, this would use geocoding
    // For now, just return undefined if we can't parse
    // The exit time calculator will handle missing locations
    return undefined;
  }

  /**
   * Build activity list from inputs
   * 
   * Requirements: 1.2, 7.2, 7.3, 10.2, 10.3, 10.4, 4.1, 4.2, 4.3
   */
  private buildActivityList(inputs: PlanInputs, energyState: EnergyState): Activity[] {
    const activities: Activity[] = [];

    // 1. Morning routine (if exists, else default 30min block)
    // Requirement: 7.2
    const morningRoutine = inputs.routines.morning;
    if (morningRoutine) {
      activities.push({
        type: 'routine',
        name: morningRoutine.name,
        duration: morningRoutine.estimated_duration,
        isFixed: false,
        activityId: morningRoutine.id,
      });
    } else {
      // Default morning routine
      activities.push({
        type: 'routine',
        name: 'Morning Routine',
        duration: 30,
        isFixed: false,
      });
    }

    // 2. Fixed commitments (will be pinned to their times)
    // Requirement: 1.2
    for (const commitment of inputs.commitments) {
      const duration = Math.round(
        (commitment.endTime.getTime() - commitment.startTime.getTime()) / 60000
      );
      activities.push({
        type: 'commitment',
        name: commitment.title,
        duration,
        isFixed: true,
        startTime: commitment.startTime,
        location: commitment.location,
        activityId: commitment.id,
      });
    }

    // 3. Meal blocks - REMOVED from normal activity list
    // Meals will be placed separately using placeMeals() function
    // Requirements: 4.1, 4.2, 4.3

    // 4. Tasks (max 1-3 based on energy) OR Primary Focus Block if no tasks
    // Requirements: 10.2, 10.3, 10.4, 3.1, 3.2, 3.3, 3.4, 3.5
    const taskLimit = this.getTaskLimit(energyState);
    const selectedTasks = inputs.tasks.slice(0, taskLimit);
    
    if (selectedTasks.length === 0) {
      // No tasks available - insert Primary Focus Block
      // Requirements: 3.1, 3.2, 3.3, 3.4
      activities.push({
        type: 'task',
        name: 'Primary Focus Block',
        duration: 60, // 60 minutes
        isFixed: false,
      });
    } else {
      // Tasks exist - add them to activities
      // Requirement: 3.5
      for (const task of selectedTasks) {
        activities.push({
          type: 'task',
          name: task.title,
          duration: task.estimated_duration || 60, // Default 60 minutes if not specified
          isFixed: false,
          activityId: task.id,
        });
      }
    }

    // 5. Evening routine - NOT added here, will be scheduled specially at the end
    // Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

    return activities;
  }

  /**
   * Get evening routine activity from inputs
   * 
   * Requirements: 7.1, 7.2, 7.3
   */
  private getEveningRoutineActivity(inputs: PlanInputs): Activity {
    const eveningRoutine = inputs.routines.evening;
    if (eveningRoutine) {
      return {
        type: 'routine',
        name: eveningRoutine.name,
        duration: eveningRoutine.estimated_duration,
        isFixed: false,
        activityId: eveningRoutine.id,
      };
    } else {
      // Default evening routine
      return {
        type: 'routine',
        name: 'Evening Routine',
        duration: 20,
        isFixed: false,
      };
    }
  }

  /**
   * Get task limit based on energy state
   * 
   * Requirements: 10.2, 10.3, 10.4
   */
  private getTaskLimit(energyState: EnergyState): number {
    switch (energyState) {
      case 'low':
        return 1;
      case 'medium':
        return 2;
      case 'high':
        return 3;
      default:
        return 2; // Default to medium
    }
  }

  /**
   * Create time blocks with pinned commitments and gap-fill scheduling
   * 
   * Requirements: 1.1, 1.4, 1.5, 2.1, 7.1, 7.2, 7.3, 7.4, 7.5, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 11.2, 11.3, 17.5
   */
  private async createTimeBlocksWithExitTimes(
    activities: Activity[],
    inputs: PlanInputs,
    wakeTime: Date,
    sleepTime: Date,
    currentLocation: Location,
    planStartTime: Date,
    energyState: EnergyState,
    homeIntervals: HomeInterval[] = [] // V2: Home intervals for meal placement
  ): Promise<{ timeBlocks: TimeBlock[]; exitTimes: ExitTimeResult[]; commitmentTravelMap: Map<string, number> }> {
    const BUFFER_MINUTES = 5;
    const EVENING_ROUTINE_EARLIEST_TIME = 18; // 6:00 PM
    const blocks: Omit<TimeBlock, 'id' | 'planId' | 'createdAt' | 'updatedAt'>[] = [];
    const exitTimes: ExitTimeResult[] = [];
    const commitmentTravelMap = new Map<string, number>(); // Maps commitment ID to travel block sequence order

    // Get evening routine activity (will be scheduled at the end)
    const eveningRoutineActivity = this.getEveningRoutineActivity(inputs);

    // Step 1: Calculate exit times for all commitments
    // Requirement: 2.1
    const exitTimeResults = await this.exitTimeCalculator.calculateExitTimes(
      inputs.commitments,
      { currentLocation }
    );
    exitTimes.push(...exitTimeResults);

    // Step 2: Create anchor blocks (commitments with travel and prep)
    // Requirements: 4.1, 4.2
    const anchorBlocks: TimeBlock[] = [];

    for (const commitment of inputs.commitments) {
      const exitTimeResult = exitTimeResults.find(et => et.commitmentId === commitment.id);
      
      if (exitTimeResult) {
        // Add travel block
        const travelStart = exitTimeResult.exitTime;
        const travelEnd = new Date(
          commitment.startTime.getTime() - exitTimeResult.preparationTime * 60000
        );

        anchorBlocks.push({
          id: '', // Will be set when saved
          planId: '', // Will be set when saved
          startTime: travelStart,
          endTime: travelEnd,
          activityType: 'travel',
          activityName: `Travel to ${commitment.title}`,
          activityId: commitment.id, // Store commitment ID in activityId
          isFixed: true,
          sequenceOrder: 0, // Will be set later
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Add commitment block
      anchorBlocks.push({
        id: '', // Will be set when saved
        planId: '', // Will be set when saved
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        activityType: 'commitment',
        activityName: commitment.title,
        activityId: commitment.id,
        isFixed: true,
        sequenceOrder: 0, // Will be set later
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Sort anchor blocks by start time
    anchorBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Step 3: Place meals using the meal placement algorithm
    // Requirements: 4.3, 8.5, 11.2, 11.3, 17.5
    // Use max(now, wakeTime) as effective "now" for meal placement
    // This ensures that when generating a plan late in the day (wake time > current time),
    // meals are evaluated relative to the wake time, not the actual current time
    const actualNow = new Date();
    const effectiveNow = new Date(Math.max(actualNow.getTime(), wakeTime.getTime()));
    const mealPlacements = placeMeals(anchorBlocks, wakeTime, sleepTime, effectiveNow, homeIntervals);
    
    // Log meal placement decisions for debugging
    // Requirement: 9.4
    console.log('[Meal Placement] Starting meal placement algorithm');
    console.log(`[Meal Placement] Wake time: ${wakeTime.toLocaleTimeString()}, Sleep time: ${sleepTime.toLocaleTimeString()}`);
    console.log(`[Meal Placement] Current time: ${effectiveNow.toLocaleTimeString()}`);
    console.log(`[Meal Placement] Number of anchors: ${anchorBlocks.length}`);
    
    for (const placement of mealPlacements) {
      if (placement.skipped) {
        console.log(`[Meal Placement] ${placement.meal} SKIPPED: ${placement.skipReason}`);
      } else {
        const targetTimeStr = placement.metadata?.targetTime?.toLocaleTimeString() || 'N/A';
        const actualTimeStr = placement.time?.toLocaleTimeString() || 'N/A';
        const placementReason = placement.metadata?.placementReason || 'unknown';
        console.log(`[Meal Placement] ${placement.meal} PLACED:`);
        console.log(`  - Target time: ${targetTimeStr}`);
        console.log(`  - Actual time: ${actualTimeStr}`);
        console.log(`  - Duration: ${placement.duration} minutes`);
        console.log(`  - Placement reason: ${placementReason}`);
      }
    }

    // Step 4: Build the schedule
    // Schedule commitments, travel, and meals first, then fill gaps with tasks/routines
    // Requirements: 4.4, 4.5
    const flexibleActivities = activities.filter(a => !a.isFixed);
    let currentTime = new Date(wakeTime);
    let sequenceOrder = 1;

    // Create a combined list of all scheduled blocks (anchors + meals)
    const scheduledBlocks: Array<{
      startTime: Date;
      endTime: Date;
      block: Omit<TimeBlock, 'id' | 'planId' | 'createdAt' | 'updatedAt'>;
      commitmentId?: string;
    }> = [];

    // Add anchor blocks
    for (const anchor of anchorBlocks) {
      const commitmentId = anchor.activityType === 'travel' ? anchor.activityId : undefined;
      scheduledBlocks.push({
        startTime: anchor.startTime,
        endTime: anchor.endTime,
        commitmentId,
        block: {
          startTime: anchor.startTime,
          endTime: anchor.endTime,
          activityType: anchor.activityType,
          activityName: anchor.activityName,
          activityId: anchor.activityId,
          isFixed: anchor.isFixed,
          sequenceOrder: 0, // Will be set later
          status: anchor.status,
        },
      });
    }

    // Add meal blocks (only non-skipped meals)
    for (const placement of mealPlacements) {
      if (!placement.skipped && placement.time && placement.duration) {
        const mealEnd = new Date(placement.time.getTime() + placement.duration * 60000);
        scheduledBlocks.push({
          startTime: placement.time,
          endTime: mealEnd,
          block: {
            startTime: placement.time,
            endTime: mealEnd,
            activityType: 'meal',
            activityName: placement.meal.charAt(0).toUpperCase() + placement.meal.slice(1),
            isFixed: false,
            sequenceOrder: 0, // Will be set later
            status: 'pending',
            metadata: {
              targetTime: placement.metadata?.targetTime,
              placementReason: placement.metadata?.placementReason,
            },
          },
        });
      }
    }

    // Sort all scheduled blocks by start time
    scheduledBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Step 5: Fill gaps with flexible activities (tasks and routines)
    for (const scheduledBlock of scheduledBlocks) {
      // Fill gap before this scheduled block
      const gapEnd = scheduledBlock.startTime;

      while (flexibleActivities.length > 0 && currentTime < gapEnd) {
        const activity = flexibleActivities[0];
        const activityEnd = new Date(currentTime.getTime() + activity.duration * 60000);

        // Check if activity fits in gap (with buffer)
        if (activityEnd.getTime() + BUFFER_MINUTES * 60000 <= gapEnd.getTime()) {
          // Add activity block
          blocks.push({
            startTime: new Date(currentTime),
            endTime: activityEnd,
            activityType: activity.type,
            activityName: activity.name,
            activityId: activity.activityId,
            isFixed: false,
            sequenceOrder: sequenceOrder++,
            status: 'pending',
          });

          // Add buffer
          const bufferEnd = new Date(activityEnd.getTime() + BUFFER_MINUTES * 60000);
          blocks.push({
            startTime: activityEnd,
            endTime: bufferEnd,
            activityType: 'buffer',
            activityName: 'Transition',
            isFixed: false,
            sequenceOrder: sequenceOrder++,
            status: 'pending',
          });

          currentTime = bufferEnd;
          flexibleActivities.shift(); // Remove used activity
        } else {
          // Activity doesn't fit, try next gap
          break;
        }
      }

      // Track travel block sequence order for exit time mapping
      if (scheduledBlock.commitmentId && scheduledBlock.block.activityType === 'travel') {
        commitmentTravelMap.set(scheduledBlock.commitmentId, sequenceOrder);
      }

      // Add the scheduled block
      blocks.push({
        ...scheduledBlock.block,
        sequenceOrder: sequenceOrder++,
      });

      currentTime = scheduledBlock.endTime;

      // Add buffer after scheduled block
      const bufferEnd = new Date(currentTime.getTime() + BUFFER_MINUTES * 60000);
      blocks.push({
        startTime: new Date(currentTime),
        endTime: bufferEnd,
        activityType: 'buffer',
        activityName: 'Transition',
        isFixed: false,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
      });
      currentTime = bufferEnd;
    }

    // Step 6: Fill remaining time after last scheduled block (excluding evening routine)
    while (flexibleActivities.length > 0 && currentTime < sleepTime) {
      const activity = flexibleActivities.shift()!;
      const activityEnd = new Date(currentTime.getTime() + activity.duration * 60000);

      // Don't exceed sleep time
      if (activityEnd > sleepTime) {
        break;
      }

      // Add activity block
      blocks.push({
        startTime: new Date(currentTime),
        endTime: activityEnd,
        activityType: activity.type,
        activityName: activity.name,
        activityId: activity.activityId,
        isFixed: false,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
      });

      // Add buffer
      const bufferEnd = new Date(activityEnd.getTime() + BUFFER_MINUTES * 60000);
      if (bufferEnd <= sleepTime) {
        blocks.push({
          startTime: activityEnd,
          endTime: bufferEnd,
          activityType: 'buffer',
          activityName: 'Transition',
          isFixed: false,
          sequenceOrder: sequenceOrder++,
          status: 'pending',
        });
        currentTime = bufferEnd;
      } else {
        currentTime = activityEnd;
      }
    }

    // Step 7: Schedule evening routine as last non-buffer block
    // Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
    const eveningRoutineEarliestTime = new Date(wakeTime);
    eveningRoutineEarliestTime.setHours(EVENING_ROUTINE_EARLIEST_TIME, 0, 0, 0);
    
    // Determine the earliest time evening routine can start
    // Requirement: 7.2, 7.3
    const eveningRoutineMinStartTime = sleepTime.getHours() < EVENING_ROUTINE_EARLIEST_TIME
      ? new Date(Math.max(currentTime.getTime(), planStartTime.getTime())) // If sleep time is before 6pm, start from current time
      : new Date(Math.max(currentTime.getTime(), eveningRoutineEarliestTime.getTime(), planStartTime.getTime()));

    const eveningRoutineEnd = new Date(
      eveningRoutineMinStartTime.getTime() + eveningRoutineActivity.duration * 60000
    );

    // Check if evening routine fits before sleep time
    // Requirement: 7.5
    if (eveningRoutineEnd <= sleepTime) {
      // Add evening routine block
      // Requirement: 7.1
      blocks.push({
        startTime: new Date(eveningRoutineMinStartTime),
        endTime: eveningRoutineEnd,
        activityType: eveningRoutineActivity.type,
        activityName: eveningRoutineActivity.name,
        activityId: eveningRoutineActivity.activityId,
        isFixed: false,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
      });

      // Add buffer after evening routine
      // Requirement: 7.4
      const bufferEnd = new Date(eveningRoutineEnd.getTime() + BUFFER_MINUTES * 60000);
      if (bufferEnd <= sleepTime) {
        blocks.push({
          startTime: eveningRoutineEnd,
          endTime: bufferEnd,
          activityType: 'buffer',
          activityName: 'Transition',
          isFixed: false,
          sequenceOrder: sequenceOrder++,
          status: 'pending',
        });
      }
    }
    // If evening routine doesn't fit, it's dropped (Requirement 7.5)

    // Step 8: Mark blocks that ended before plan start as skipped
    // This handles generating plans later in the day
    for (const block of blocks) {
      if (block.endTime <= planStartTime) {
        block.status = 'skipped';
        block.skipReason = 'Occurred before plan start';
      }
    }

    // Step 9: Detect if tail plan is needed and generate it
    // Requirement: 2.1
    const blocksAfterPlanStart = blocks.filter(
      block => block.endTime > planStartTime && block.status === 'pending'
    );

    if (blocksAfterPlanStart.length === 0) {
      // No blocks after plan start - generate tail plan
      // Requirement: 2.2, 2.3, 2.4, 2.5
      const tailBlocks = this.generateTailPlan(planStartTime, sleepTime, energyState, sequenceOrder);
      blocks.push(...tailBlocks);
    }

    // Cast blocks to TimeBlock type (without id, planId, createdAt, updatedAt)
    return {
      timeBlocks: blocks as TimeBlock[],
      exitTimes,
      commitmentTravelMap,
    };
  }

  /**
   * Generate hardcoded tail plan for late-day generation
   * 
   * Requirements: 2.2, 2.3, 2.4, 2.5
   */
  private generateTailPlan(
    planStartTime: Date,
    sleepTime: Date,
    energyState: EnergyState,
    startingSequenceOrder: number
  ): Array<Omit<TimeBlock, 'id' | 'planId' | 'createdAt' | 'updatedAt'>> {
    const BUFFER_MINUTES = 5;
    const blocks: Array<Omit<TimeBlock, 'id' | 'planId' | 'createdAt' | 'updatedAt'>> = [];
    let currentTime = new Date(planStartTime);
    let sequenceOrder = startingSequenceOrder;

    // 1. Reset/Admin block (10 minutes)
    // Requirement: 2.2
    const resetEnd = new Date(currentTime.getTime() + 10 * 60000);
    if (resetEnd <= sleepTime) {
      blocks.push({
        startTime: new Date(currentTime),
        endTime: resetEnd,
        activityType: 'task',
        activityName: 'Reset/Admin',
        isFixed: false,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
      });

      // Add buffer
      const bufferEnd = new Date(resetEnd.getTime() + BUFFER_MINUTES * 60000);
      if (bufferEnd <= sleepTime) {
        blocks.push({
          startTime: resetEnd,
          endTime: bufferEnd,
          activityType: 'buffer',
          activityName: 'Transition',
          isFixed: false,
          sequenceOrder: sequenceOrder++,
          status: 'pending',
        });
        currentTime = bufferEnd;
      } else {
        currentTime = resetEnd;
      }
    }

    // 2. Primary Focus Block (60 minutes) if energy ≠ low
    // Requirement: 2.3
    if (energyState !== 'low') {
      const focusEnd = new Date(currentTime.getTime() + 60 * 60000);
      if (focusEnd <= sleepTime) {
        blocks.push({
          startTime: new Date(currentTime),
          endTime: focusEnd,
          activityType: 'task',
          activityName: 'Primary Focus Block',
          isFixed: false,
          sequenceOrder: sequenceOrder++,
          status: 'pending',
        });

        // Add buffer
        const bufferEnd = new Date(focusEnd.getTime() + BUFFER_MINUTES * 60000);
        if (bufferEnd <= sleepTime) {
          blocks.push({
            startTime: focusEnd,
            endTime: bufferEnd,
            activityType: 'buffer',
            activityName: 'Transition',
            isFixed: false,
            sequenceOrder: sequenceOrder++,
            status: 'pending',
          });
          currentTime = bufferEnd;
        } else {
          currentTime = focusEnd;
        }
      }
    }

    // 3. Dinner block (45 minutes)
    // Requirement: 2.4
    const dinnerEnd = new Date(currentTime.getTime() + 45 * 60000);
    if (dinnerEnd <= sleepTime) {
      blocks.push({
        startTime: new Date(currentTime),
        endTime: dinnerEnd,
        activityType: 'meal',
        activityName: 'Dinner',
        isFixed: false,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
      });

      // Add buffer
      const bufferEnd = new Date(dinnerEnd.getTime() + BUFFER_MINUTES * 60000);
      if (bufferEnd <= sleepTime) {
        blocks.push({
          startTime: dinnerEnd,
          endTime: bufferEnd,
          activityType: 'buffer',
          activityName: 'Transition',
          isFixed: false,
          sequenceOrder: sequenceOrder++,
          status: 'pending',
        });
        currentTime = bufferEnd;
      } else {
        currentTime = dinnerEnd;
      }
    }

    // 4. Evening Routine block (20 minutes)
    // Requirement: 2.5
    const eveningEnd = new Date(currentTime.getTime() + 20 * 60000);
    if (eveningEnd <= sleepTime) {
      blocks.push({
        startTime: new Date(currentTime),
        endTime: eveningEnd,
        activityType: 'routine',
        activityName: 'Evening Routine',
        isFixed: false,
        sequenceOrder: sequenceOrder++,
        status: 'pending',
      });

      // Add final buffer
      const bufferEnd = new Date(eveningEnd.getTime() + BUFFER_MINUTES * 60000);
      if (bufferEnd <= sleepTime) {
        blocks.push({
          startTime: eveningEnd,
          endTime: bufferEnd,
          activityType: 'buffer',
          activityName: 'Transition',
          isFixed: false,
          sequenceOrder: sequenceOrder++,
          status: 'pending',
        });
      }
    }

    return blocks;
  }

  /**
   * Save plan to database
   * 
   * Requirements: 1.1, 9.1, 12.5, 18.1, 18.2, 18.3, 18.4
   */
  private async savePlan(
    input: PlanInput,
    timeBlocks: TimeBlock[],
    exitTimes: ExitTimeResult[],
    commitmentTravelMap: Map<string, number>,
    chains: ExecutionChain[] = [],
    wakeRamp?: WakeRamp,
    locationPeriods: LocationPeriod[] = [],
    homeIntervals: HomeInterval[] = []
  ): Promise<DailyPlan> {
    // Calculate plan start time and generated_after_now flag
    const now = new Date();
    const roundedNow = this.roundUpToNext5Minutes(now);
    const planStart = new Date(Math.max(input.wakeTime.getTime(), roundedNow.getTime()));
    const generatedAfterNow = planStart.getTime() > input.wakeTime.getTime();

    // Create daily plan record with V2 metadata
    const planData: CreateDailyPlan = {
      user_id: input.userId,
      plan_date: input.date.toISOString().split('T')[0],
      wake_time: input.wakeTime.toISOString(),
      sleep_time: input.sleepTime.toISOString(),
      energy_state: input.energyState,
      status: 'active',
      generated_after_now: generatedAfterNow,
      plan_start: planStart.toISOString(),
    };

    const plan = await createDailyPlan(this.supabase, planData);

    // Create time blocks
    const timeBlocksData: CreateTimeBlock[] = timeBlocks.map(block => ({
      plan_id: plan.id,
      start_time: block.startTime.toISOString(),
      end_time: block.endTime.toISOString(),
      activity_type: block.activityType,
      activity_name: block.activityName,
      activity_id: block.activityId,
      is_fixed: block.isFixed,
      sequence_order: block.sequenceOrder,
      status: block.status,
      skip_reason: block.skipReason,
      metadata: block.metadata ? {
        target_time: block.metadata.targetTime?.toISOString(),
        placement_reason: block.metadata.placementReason,
        skip_reason: block.metadata.skipReason,
        // V2: Add chain metadata if present
        ...(block.metadata as any),
      } : undefined,
    }));

    const createdBlocks = await createTimeBlocks(this.supabase, timeBlocksData);

    // Create exit times using the commitment-to-travel-block mapping
    const exitTimesData: CreateExitTime[] = [];
    for (const exitTime of exitTimes) {
      // Find the travel block using the sequence order from the map
      const travelBlockSequenceOrder = commitmentTravelMap.get(exitTime.commitmentId);
      if (travelBlockSequenceOrder !== undefined) {
        const travelBlock = createdBlocks.find(
          block => block.sequenceOrder === travelBlockSequenceOrder
        );

        if (travelBlock) {
          exitTimesData.push({
            plan_id: plan.id,
            time_block_id: travelBlock.id,
            commitment_id: exitTime.commitmentId,
            exit_time: exitTime.exitTime.toISOString(),
            travel_duration: exitTime.travelDuration,
            preparation_time: exitTime.preparationTime,
            travel_method: exitTime.travelMethod,
          });
        }
      }
    }

    if (exitTimesData.length > 0) {
      await createExitTimes(this.supabase, exitTimesData);
    }

    // Fetch and return complete plan
    const completePlan = await getDailyPlanByDateWithBlocks(
      this.supabase,
      input.userId,
      input.date
    );

    if (!completePlan) {
      throw new Error('Failed to fetch created plan');
    }

    // V2: Attach chain data to the plan object
    // Note: This data is not persisted to database in V2, but returned in memory
    // Requirements: 12.5, 18.1, 18.2, 18.3, 18.4
    (completePlan as any).chains = chains;
    (completePlan as any).wakeRamp = wakeRamp;
    (completePlan as any).locationPeriods = locationPeriods;
    (completePlan as any).homeIntervals = homeIntervals;

    return completePlan;
  }

  /**
   * Degrade a plan by removing optional tasks and recomputing buffers
   * 
   * Requirements: 4.2, 4.3, 4.4, 4.5
   */
  async degradePlan(planId: string): Promise<DailyPlan> {
    // Fetch the current plan with all blocks
    const plan = await getDailyPlanWithBlocks(this.supabase, planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    if (!plan.timeBlocks) {
      throw new Error('Plan has no time blocks');
    }

    const BUFFER_MINUTES = 5;

    // Step 1: Identify essential activities (fixed commitments, routines, meals, travel)
    // Requirement: 4.2, 4.3
    const essentialBlocks = plan.timeBlocks.filter(
      block =>
        block.isFixed || // Fixed commitments and travel blocks
        block.activityType === 'routine' ||
        block.activityType === 'meal' ||
        block.activityType === 'travel'
    );

    // Step 2: Mark dropped tasks as skipped
    // Requirement: 4.5
    const droppedBlocks = plan.timeBlocks.filter(
      block =>
        !essentialBlocks.includes(block) &&
        block.activityType !== 'buffer' && // Don't mark buffers as skipped
        block.status === 'pending' // Only mark pending blocks
    );

    // Update dropped blocks to skipped status
    for (const block of droppedBlocks) {
      await updateTimeBlock(this.supabase, block.id, {
        status: 'skipped',
        skip_reason: 'Dropped during degradation',
      });
    }

    // Step 3: Delete all old buffer blocks (we'll recompute them)
    // Requirement: 4.4
    const bufferBlocks = plan.timeBlocks.filter(block => block.activityType === 'buffer');
    for (const buffer of bufferBlocks) {
      await deleteTimeBlock(this.supabase, buffer.id);
    }

    // Step 4: Rebuild time blocks with recomputed buffers
    // Requirement: 4.4
    const rebuiltBlocks: Array<{
      block: TimeBlock;
      isNew: boolean;
    }> = [];

    // Sort essential blocks by their original start time
    const sortedEssentials = [...essentialBlocks].sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    );

    let currentTime = plan.wakeTime;
    let sequenceOrder = 1;

    for (const essentialBlock of sortedEssentials) {
      // For fixed activities (commitments and travel), use their scheduled time
      // For flexible activities (routines, meals), schedule from current time
      const startTime = essentialBlock.isFixed ? essentialBlock.startTime : currentTime;
      const endTime = essentialBlock.isFixed
        ? essentialBlock.endTime
        : new Date(startTime.getTime() + (essentialBlock.endTime.getTime() - essentialBlock.startTime.getTime()));

      // Update the essential block with new sequence order and times
      await updateTimeBlock(this.supabase, essentialBlock.id, {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        sequence_order: sequenceOrder++,
      });

      rebuiltBlocks.push({
        block: {
          ...essentialBlock,
          startTime,
          endTime,
          sequenceOrder: sequenceOrder - 1,
        },
        isNew: false,
      });

      // Add new buffer after this block
      const bufferEnd = new Date(endTime.getTime() + BUFFER_MINUTES * 60000);
      
      // Don't add buffer if it would exceed sleep time
      if (bufferEnd <= plan.sleepTime) {
        const newBuffer = await createTimeBlock(this.supabase, {
          plan_id: planId,
          start_time: endTime.toISOString(),
          end_time: bufferEnd.toISOString(),
          activity_type: 'buffer',
          activity_name: 'Transition',
          is_fixed: false,
          sequence_order: sequenceOrder++,
          status: 'pending',
        });

        rebuiltBlocks.push({
          block: newBuffer,
          isNew: true,
        });

        currentTime = bufferEnd;
      } else {
        currentTime = endTime;
      }
    }

    // Step 5: Update plan status to "degraded"
    // Requirement: 4.4
    await updateDailyPlan(this.supabase, planId, {
      status: 'degraded',
    });

    // Fetch and return the updated plan
    const degradedPlan = await getDailyPlanWithBlocks(this.supabase, planId);
    if (!degradedPlan) {
      throw new Error('Failed to fetch degraded plan');
    }

    return degradedPlan;
  }
}


// Export a factory function to create the service
export function createPlanBuilderService(supabase: SupabaseClient<any, any, any>): PlanBuilderService {
  return new PlanBuilderService(supabase);
}
