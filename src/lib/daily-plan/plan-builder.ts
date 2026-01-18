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

export class PlanBuilderService {
  private supabase: SupabaseClient<any, any, any>;
  private exitTimeCalculator: ExitTimeCalculator;

  constructor(supabase: SupabaseClient<any, any, any>) {
    this.supabase = supabase;
    this.exitTimeCalculator = new ExitTimeCalculator();
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
   * Requirements: 1.1, 9.1
   */
  async generateDailyPlan(input: PlanInput, currentLocation: Location): Promise<DailyPlan> {
    // Step 1: Compute plan start time (max of wake time or current time rounded up)
    const now = new Date();
    const roundedNow = this.roundUpToNext5Minutes(now);
    const planStartTime = new Date(Math.max(input.wakeTime.getTime(), roundedNow.getTime()));

    // Step 2: Gather inputs
    const inputs = await this.gatherInputs(input.userId, input.date);

    // Step 3: Build activity list
    const activities = this.buildActivityList(inputs, input.energyState);

    // Step 4: Create time blocks with exit times
    const { timeBlocks, exitTimes, commitmentTravelMap } = await this.createTimeBlocksWithExitTimes(
      activities,
      inputs,
      input.wakeTime,
      input.sleepTime,
      currentLocation,
      planStartTime,
      input.energyState
    );

    // Step 5: Save to database
    const plan = await this.savePlan(input, timeBlocks, exitTimes, commitmentTravelMap);

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
   * Requirements: 1.2, 7.2, 7.3, 10.2, 10.3, 10.4
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

    // 3. Meal blocks (breakfast 15min, lunch 30min, dinner 45min)
    // Requirement: 7.3
    activities.push(
      {
        type: 'meal',
        name: 'Breakfast',
        duration: 15,
        isFixed: false,
      },
      {
        type: 'meal',
        name: 'Lunch',
        duration: 30,
        isFixed: false,
      },
      {
        type: 'meal',
        name: 'Dinner',
        duration: 45, // cook + eat + cleanup
        isFixed: false,
      }
    );

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
   * Requirements: 1.1, 1.4, 1.5, 2.1, 7.1, 7.2, 7.3, 7.4, 7.5
   */
  private async createTimeBlocksWithExitTimes(
    activities: Activity[],
    inputs: PlanInputs,
    wakeTime: Date,
    sleepTime: Date,
    currentLocation: Location,
    planStartTime: Date,
    energyState: EnergyState
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

    // Step 2: Create fixed blocks (commitments with travel and prep)
    const fixedBlocks: Array<{
      startTime: Date;
      endTime: Date;
      block: Omit<TimeBlock, 'id' | 'planId' | 'createdAt' | 'updatedAt'>;
      commitmentId?: string;
    }> = [];

    for (const commitment of inputs.commitments) {
      const exitTimeResult = exitTimeResults.find(et => et.commitmentId === commitment.id);
      
      if (exitTimeResult) {
        // Add travel block
        const travelStart = exitTimeResult.exitTime;
        const travelEnd = new Date(
          commitment.startTime.getTime() - exitTimeResult.preparationTime * 60000
        );

        fixedBlocks.push({
          startTime: travelStart,
          endTime: travelEnd,
          commitmentId: commitment.id, // Track which commitment this travel is for
          block: {
            startTime: travelStart,
            endTime: travelEnd,
            activityType: 'travel',
            activityName: `Travel to ${commitment.title}`,
            activityId: commitment.id, // Store commitment ID in activityId
            isFixed: true,
            sequenceOrder: 0, // Will be set later
            status: 'pending',
          },
        });
      }

      // Add commitment block
      fixedBlocks.push({
        startTime: commitment.startTime,
        endTime: commitment.endTime,
        block: {
          startTime: commitment.startTime,
          endTime: commitment.endTime,
          activityType: 'commitment',
          activityName: commitment.title,
          activityId: commitment.id,
          isFixed: true,
          sequenceOrder: 0, // Will be set later
          status: 'pending',
        },
      });
    }

    // Sort fixed blocks by start time
    fixedBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Step 3: Fill gaps with flexible activities
    // Requirements: 1.4, 1.5
    const flexibleActivities = activities.filter(a => !a.isFixed);
    let currentTime = new Date(wakeTime);
    let sequenceOrder = 1;

    for (const fixedBlock of fixedBlocks) {
      // Fill gap before this fixed block
      const gapEnd = fixedBlock.startTime;

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
      if (fixedBlock.commitmentId && fixedBlock.block.activityType === 'travel') {
        commitmentTravelMap.set(fixedBlock.commitmentId, sequenceOrder);
      }

      // Add the fixed block
      blocks.push({
        ...fixedBlock.block,
        sequenceOrder: sequenceOrder++,
      });

      currentTime = fixedBlock.endTime;

      // Add buffer after fixed block
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

    // Step 4: Fill remaining time after last commitment (excluding evening routine)
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

    // Step 5: Schedule evening routine as last non-buffer block
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

    // Step 6: Mark blocks that ended before plan start as skipped
    // This handles generating plans later in the day
    for (const block of blocks) {
      if (block.endTime <= planStartTime) {
        block.status = 'skipped';
        block.skipReason = 'Occurred before plan start';
      }
    }

    // Step 7: Detect if tail plan is needed and generate it
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
   * Requirements: 1.1, 9.1
   */
  private async savePlan(
    input: PlanInput,
    timeBlocks: TimeBlock[],
    exitTimes: ExitTimeResult[],
    commitmentTravelMap: Map<string, number>
  ): Promise<DailyPlan> {
    // Calculate plan start time and generated_after_now flag
    const now = new Date();
    const roundedNow = this.roundUpToNext5Minutes(now);
    const planStart = new Date(Math.max(input.wakeTime.getTime(), roundedNow.getTime()));
    const generatedAfterNow = planStart.getTime() > input.wakeTime.getTime();

    // Create daily plan record
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
