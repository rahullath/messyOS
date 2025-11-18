// src/lib/uk-student/routine-service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Routine, RoutineStep, RoutineCompletion, Habit } from '../types';
import type { Routine as RoutineType, RoutineStep as RoutineStepType } from '../types/uk-student';

/**
 * RoutineService manages daily routines and personal care tracking
 * Integrates with the existing habits system for consistency
 */
export class RoutineService {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Create a new routine with structured steps
   */
  async createRoutine(
    routineType: 'morning' | 'evening' | 'skincare' | 'laundry' | 'gym' | 'study',
    name: string,
    steps: RoutineStepType[],
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom' = 'daily'
  ): Promise<RoutineType> {
    const estimatedDuration = steps.reduce((sum, step) => sum + step.estimated_duration, 0);

    const { data, error } = await this.supabase
      .from('uk_student_routines')
      .insert({
        user_id: this.userId,
        routine_type: routineType,
        name,
        steps: steps,
        estimated_duration: estimatedDuration,
        frequency,
        completion_streak: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all active routines for the user
   */
  async getActiveRoutines(): Promise<RoutineType[]> {
    const { data, error } = await this.supabase
      .from('uk_student_routines')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .order('routine_type', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get routines by type
   */
  async getRoutinesByType(
    routineType: 'morning' | 'evening' | 'skincare' | 'laundry' | 'gym' | 'study'
  ): Promise<RoutineType[]> {
    const { data, error } = await this.supabase
      .from('uk_student_routines')
      .select('*')
      .eq('user_id', this.userId)
      .eq('routine_type', routineType)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update a routine
   */
  async updateRoutine(
    routineId: string,
    updates: Partial<RoutineType>
  ): Promise<RoutineType> {
    const { data, error } = await this.supabase
      .from('uk_student_routines')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', routineId)
      .eq('user_id', this.userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Mark a routine as completed
   */
  async completeRoutine(
    routineId: string,
    stepsCompleted: string[],
    totalDuration: number,
    notes?: string
  ): Promise<RoutineCompletion> {
    // Record the completion
    const { data: completion, error: completionError } = await this.supabase
      .from('uk_student_routine_completions')
      .insert({
        user_id: this.userId,
        routine_id: routineId,
        completed_at: new Date().toISOString(),
        steps_completed: stepsCompleted,
        total_duration: totalDuration,
        notes,
      })
      .select()
      .single();

    if (completionError) throw completionError;

    // Update the routine's completion streak
    await this.updateCompletionStreak(routineId);

    return completion;
  }

  /**
   * Update the completion streak for a routine
   */
  private async updateCompletionStreak(routineId: string): Promise<void> {
    // Get the routine
    const { data: routine, error: routineError } = await this.supabase
      .from('uk_student_routines')
      .select('*')
      .eq('id', routineId)
      .eq('user_id', this.userId)
      .single();

    if (routineError) throw routineError;

    // Get recent completions
    const { data: completions, error: completionsError } = await this.supabase
      .from('uk_student_routine_completions')
      .select('completed_at')
      .eq('routine_id', routineId)
      .eq('user_id', this.userId)
      .order('completed_at', { ascending: false })
      .limit(30);

    if (completionsError) throw completionsError;

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const hasCompletion = completions?.some((c: any) => {
        const completionDate = new Date(c.completed_at).toISOString().split('T')[0];
        return completionDate === dateStr;
      });

      if (hasCompletion) {
        streak++;
      } else if (streak > 0) {
        break;
      }
    }

    // Update routine with new streak
    await this.supabase
      .from('uk_student_routines')
      .update({
        completion_streak: streak,
        last_completed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', routineId)
      .eq('user_id', this.userId);
  }

  /**
   * Get morning routine optimized for 9am class
   */
  async getMorningRoutineOptimized(classStartTime: string = '09:00'): Promise<RoutineType | null> {
    const routines = await this.getRoutinesByType('morning');
    if (routines.length === 0) return null;

    // Get the first morning routine (or create a default one)
    let routine = routines[0];

    // Calculate wake time based on class start time and routine duration
    const [classHour, classMinute] = classStartTime.split(':').map(Number);
    const classTime = classHour * 60 + classMinute;
    const wakeTime = classTime - routine.estimated_duration - 30; // 30 min buffer

    return {
      ...routine,
      metadata: {
        ...routine.metadata,
        optimized_wake_time: this.minutesToTimeString(wakeTime),
        class_start_time: classStartTime,
      },
    };
  }

  /**
   * Create a skincare routine
   */
  async createSkincareRoutine(): Promise<RoutineType> {
    const skincareSteps: RoutineStepType[] = [
      {
        id: '1',
        name: 'Cleanse with Cetaphil',
        description: 'Gentle cleanser for morning and evening',
        estimated_duration: 3,
        order: 1,
        required: true,
      },
      {
        id: '2',
        name: 'Apply Toner',
        description: 'Balance skin pH and prepare for other products',
        estimated_duration: 2,
        order: 2,
        required: true,
      },
      {
        id: '3',
        name: 'Apply Snail Mucin Essence',
        description: 'Hydrating essence for moisture',
        estimated_duration: 2,
        order: 3,
        required: true,
      },
      {
        id: '4',
        name: 'Apply Moisturizer',
        description: 'Lock in hydration',
        estimated_duration: 2,
        order: 4,
        required: true,
      },
      {
        id: '5',
        name: 'Apply Sunscreen (Morning only)',
        description: 'SPF protection for daytime',
        estimated_duration: 2,
        order: 5,
        required: false,
      },
    ];

    return this.createRoutine('skincare', 'Daily Skincare Routine', skincareSteps, 'daily');
  }

  /**
   * Create a structured morning routine
   */
  async createMorningRoutine(): Promise<RoutineType> {
    const morningSteps: RoutineStepType[] = [
      {
        id: '1',
        name: 'Wake up and hydrate',
        description: 'Drink water to start the day',
        estimated_duration: 5,
        order: 1,
        required: true,
      },
      {
        id: '2',
        name: 'Skincare routine',
        description: 'Complete skincare steps',
        estimated_duration: 11,
        order: 2,
        required: true,
      },
      {
        id: '3',
        name: 'Shower',
        description: 'Quick shower to freshen up',
        estimated_duration: 15,
        order: 3,
        required: true,
      },
      {
        id: '4',
        name: 'Get dressed',
        description: 'Choose outfit for the day',
        estimated_duration: 10,
        order: 4,
        required: true,
      },
      {
        id: '5',
        name: 'Breakfast',
        description: 'Eat a nutritious breakfast',
        estimated_duration: 15,
        order: 5,
        required: true,
      },
      {
        id: '6',
        name: 'Review daily schedule',
        description: 'Check calendar and plan the day',
        estimated_duration: 5,
        order: 6,
        required: false,
      },
    ];

    return this.createRoutine('morning', 'Morning Routine', morningSteps, 'daily');
  }

  /**
   * Create an evening routine
   */
  async createEveningRoutine(): Promise<RoutineType> {
    const eveningSteps: RoutineStepType[] = [
      {
        id: '1',
        name: 'Dinner',
        description: 'Eat a balanced dinner',
        estimated_duration: 30,
        order: 1,
        required: true,
      },
      {
        id: '2',
        name: 'Clean up',
        description: 'Wash dishes and tidy up',
        estimated_duration: 15,
        order: 2,
        required: true,
      },
      {
        id: '3',
        name: 'Personal care',
        description: 'Shower and skincare',
        estimated_duration: 20,
        order: 3,
        required: true,
      },
      {
        id: '4',
        name: 'Prepare for bed',
        description: 'Lay out clothes, set alarm',
        estimated_duration: 10,
        order: 4,
        required: true,
      },
      {
        id: '5',
        name: 'Wind down',
        description: 'Relaxation before sleep',
        estimated_duration: 20,
        order: 5,
        required: false,
      },
    ];

    return this.createRoutine('evening', 'Evening Routine', eveningSteps, 'daily');
  }

  /**
   * Track substance use (vaping/smoking)
   */
  async trackSubstanceUse(
    substanceType: 'vaping' | 'smoking',
    count: number,
    notes?: string
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('uk_student_substance_tracking')
      .insert({
        user_id: this.userId,
        substance_type: substanceType,
        count,
        notes,
        tracked_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get substance use tracking data
   */
  async getSubstanceUseData(
    substanceType: 'vaping' | 'smoking',
    days: number = 30
  ): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('uk_student_substance_tracking')
      .select('*')
      .eq('user_id', this.userId)
      .eq('substance_type', substanceType)
      .gte('tracked_at', startDate.toISOString())
      .order('tracked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get substance use reduction goal
   */
  async getSubstanceReductionGoal(substanceType: 'vaping' | 'smoking'): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('uk_student_substance_goals')
      .select('*')
      .eq('user_id', this.userId)
      .eq('substance_type', substanceType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  }

  /**
   * Set substance use reduction goal
   */
  async setSubstanceReductionGoal(
    substanceType: 'vaping' | 'smoking',
    targetReduction: number, // percentage
    timeframe: number // days
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('uk_student_substance_goals')
      .insert({
        user_id: this.userId,
        substance_type: substanceType,
        target_reduction: targetReduction,
        timeframe_days: timeframe,
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get recovery strategies for missed activities
   */
  async getRecoveryStrategies(missedActivityType: string): Promise<string[]> {
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
      study: [
        'Do 15 minutes of focused study',
        'Review notes instead of new material',
        'Plan a catch-up session for tomorrow',
        'Break the task into smaller chunks',
      ],
      evening_routine: [
        'Do the most important steps only',
        'Go to bed a bit earlier tomorrow',
        'Plan a full routine tomorrow',
        'Reflect on what went wrong today',
      ],
    };

    return strategies[missedActivityType] || [
      'Be gentle with yourself',
      'Plan to get back on track tomorrow',
      'Identify what went wrong',
      'Adjust your approach if needed',
    ];
  }

  /**
   * Record a missed activity and get recovery strategies
   */
  async recordMissedActivity(
    routineId: string,
    reason?: string
  ): Promise<{ strategies: string[]; encouragement: string }> {
    // Record the miss
    await this.supabase
      .from('uk_student_routine_misses')
      .insert({
        user_id: this.userId,
        routine_id: routineId,
        reason,
        recorded_at: new Date().toISOString(),
      });

    // Get the routine type
    const { data: routine } = await this.supabase
      .from('uk_student_routines')
      .select('routine_type')
      .eq('id', routineId)
      .single();

    const strategies = await this.getRecoveryStrategies(routine?.routine_type || 'general');

    const encouragements = [
      'You\'re doing great by tracking this. That\'s self-awareness.',
      'One missed day doesn\'t erase your progress.',
      'Tomorrow is a fresh start.',
      'Be kind to yourself. Progress isn\'t linear.',
      'You\'ve completed this routine before, you can do it again.',
    ];

    return {
      strategies,
      encouragement: encouragements[Math.floor(Math.random() * encouragements.length)],
    };
  }

  /**
   * Get routine completion statistics
   */
  async getRoutineStats(routineId: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: completions } = await this.supabase
      .from('uk_student_routine_completions')
      .select('completed_at')
      .eq('routine_id', routineId)
      .eq('user_id', this.userId)
      .gte('completed_at', startDate.toISOString());

    const { data: misses } = await this.supabase
      .from('uk_student_routine_misses')
      .select('recorded_at')
      .eq('routine_id', routineId)
      .eq('user_id', this.userId)
      .gte('recorded_at', startDate.toISOString());

    const totalDays = days;
    const completedDays = completions?.length || 0;
    const missedDays = misses?.length || 0;
    const completionRate = (completedDays / totalDays) * 100;

    return {
      total_days: totalDays,
      completed_days: completedDays,
      missed_days: missedDays,
      completion_rate: Math.round(completionRate),
      consistency_score: Math.round(completionRate * 0.8 + (1 - missedDays / totalDays) * 0.2 * 100),
    };
  }

  /**
   * Helper: Convert minutes to time string (HH:MM)
   */
  private minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Get daily plan with all routines and activities
   */
  async getDailyPlan(date: Date): Promise<any> {
    const dateStr = date.toISOString().split('T')[0];

    // Get all active routines
    const routines = await this.getActiveRoutines();

    // Get academic events for the day
    const { data: academicEvents } = await this.supabase
      .from('uk_student_academic_events')
      .select('*')
      .eq('user_id', this.userId)
      .gte('start_time', `${dateStr}T00:00:00`)
      .lt('start_time', `${dateStr}T23:59:59`);

    // Get completions for the day
    const { data: completions } = await this.supabase
      .from('uk_student_routine_completions')
      .select('*')
      .eq('user_id', this.userId)
      .gte('completed_at', `${dateStr}T00:00:00`)
      .lt('completed_at', `${dateStr}T23:59:59`);

    return {
      date: dateStr,
      routines: routines.map((r) => ({
        ...r,
        completed: completions?.some((c: any) => c.routine_id === r.id) || false,
      })),
      academic_events: academicEvents || [],
      total_planned_time: routines.reduce((sum, r) => sum + r.estimated_duration, 0),
    };
  }
}
