// Daily Plan Generator V1 - Database Utilities

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DailyPlan,
  DailyPlanRow,
  TimeBlock,
  TimeBlockRow,
  ExitTime,
  ExitTimeRow,
  CreateDailyPlan,
  CreateTimeBlock,
  CreateExitTime,
  UpdateDailyPlan,
  UpdateTimeBlock,
} from '../../types/daily-plan';

// Type for Supabase client (generic to work with any database schema)
type AnySupabaseClient = SupabaseClient<any, any, any>;

// Helper functions to convert between database rows and application types
function rowToDailyPlan(row: DailyPlanRow): DailyPlan {
  return {
    id: row.id,
    userId: row.user_id,
    planDate: new Date(row.plan_date),
    wakeTime: new Date(row.wake_time),
    sleepTime: new Date(row.sleep_time),
    energyState: row.energy_state,
    status: row.status,
    generatedAt: new Date(row.generated_at),
    generatedAfterNow: row.generated_after_now,
    planStart: new Date(row.plan_start),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToTimeBlock(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id,
    planId: row.plan_id,
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    activityType: row.activity_type,
    activityName: row.activity_name,
    activityId: row.activity_id,
    isFixed: row.is_fixed,
    sequenceOrder: row.sequence_order,
    status: row.status,
    skipReason: row.skip_reason,
    metadata: row.metadata ? {
      targetTime: row.metadata.target_time ? new Date(row.metadata.target_time) : undefined,
      placementReason: row.metadata.placement_reason,
      skipReason: row.metadata.skip_reason,
    } : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToExitTime(row: ExitTimeRow): ExitTime {
  return {
    id: row.id,
    planId: row.plan_id,
    timeBlockId: row.time_block_id,
    commitmentId: row.commitment_id,
    exitTime: new Date(row.exit_time),
    travelDuration: row.travel_duration,
    preparationTime: row.preparation_time,
    travelMethod: row.travel_method,
    createdAt: new Date(row.created_at),
  };
}

// Daily Plan CRUD operations
export async function createDailyPlan(
  supabase: AnySupabaseClient,
  plan: CreateDailyPlan
): Promise<DailyPlan> {
  const { data, error } = await supabase
    .from('daily_plans')
    .insert(plan as any)
    .select()
    .single();

  if (error) throw error;
  return rowToDailyPlan(data);
}

export async function getDailyPlan(
  supabase: AnySupabaseClient,
  planId: string
): Promise<DailyPlan | null> {
  const { data, error } = await supabase
    .from('daily_plans')
    .select()
    .eq('id', planId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return rowToDailyPlan(data);
}

export async function getDailyPlanByDate(
  supabase: AnySupabaseClient,
  userId: string,
  date: Date
): Promise<DailyPlan | null> {
  const dateStr = date.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_plans')
    .select()
    .eq('user_id', userId)
    .eq('plan_date', dateStr)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return rowToDailyPlan(data);
}

export async function updateDailyPlan(
  supabase: AnySupabaseClient,
  planId: string,
  updates: UpdateDailyPlan
): Promise<DailyPlan> {
  const { data, error } = await supabase
    .from('daily_plans')
    .update(updates as any)
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return rowToDailyPlan(data);
}

export async function deleteDailyPlan(
  supabase: AnySupabaseClient,
  planId: string
): Promise<void> {
  const { error } = await supabase
    .from('daily_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
}

// Time Block CRUD operations
export async function createTimeBlock(
  supabase: AnySupabaseClient,
  block: CreateTimeBlock
): Promise<TimeBlock> {
  const { data, error } = await supabase
    .from('time_blocks')
    .insert(block as any)
    .select()
    .single();

  if (error) throw error;
  return rowToTimeBlock(data);
}

export async function createTimeBlocks(
  supabase: AnySupabaseClient,
  blocks: CreateTimeBlock[]
): Promise<TimeBlock[]> {
  const { data, error } = await supabase
    .from('time_blocks')
    .insert(blocks as any)
    .select();

  if (error) throw error;
  return data.map(rowToTimeBlock);
}

export async function getTimeBlock(
  supabase: AnySupabaseClient,
  blockId: string
): Promise<TimeBlock | null> {
  const { data, error } = await supabase
    .from('time_blocks')
    .select()
    .eq('id', blockId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return rowToTimeBlock(data);
}

export async function getTimeBlocksByPlan(
  supabase: AnySupabaseClient,
  planId: string
): Promise<TimeBlock[]> {
  const { data, error } = await supabase
    .from('time_blocks')
    .select()
    .eq('plan_id', planId)
    .order('sequence_order', { ascending: true });

  if (error) throw error;
  return data.map(rowToTimeBlock);
}

export async function updateTimeBlock(
  supabase: AnySupabaseClient,
  blockId: string,
  updates: UpdateTimeBlock
): Promise<TimeBlock> {
  const { data, error } = await supabase
    .from('time_blocks')
    .update(updates as any)
    .eq('id', blockId)
    .select()
    .single();

  if (error) throw error;
  return rowToTimeBlock(data);
}

export async function deleteTimeBlock(
  supabase: AnySupabaseClient,
  blockId: string
): Promise<void> {
  const { error } = await supabase
    .from('time_blocks')
    .delete()
    .eq('id', blockId);

  if (error) throw error;
}

export async function deleteTimeBlocksByPlan(
  supabase: AnySupabaseClient,
  planId: string
): Promise<void> {
  const { error } = await supabase
    .from('time_blocks')
    .delete()
    .eq('plan_id', planId);

  if (error) throw error;
}

// Exit Time CRUD operations
export async function createExitTime(
  supabase: AnySupabaseClient,
  exitTime: CreateExitTime
): Promise<ExitTime> {
  const { data, error } = await supabase
    .from('exit_times')
    .insert(exitTime as any)
    .select()
    .single();

  if (error) throw error;
  return rowToExitTime(data);
}

export async function createExitTimes(
  supabase: AnySupabaseClient,
  exitTimes: CreateExitTime[]
): Promise<ExitTime[]> {
  const { data, error } = await supabase
    .from('exit_times')
    .insert(exitTimes as any)
    .select();

  if (error) throw error;
  return data.map(rowToExitTime);
}

export async function getExitTime(
  supabase: AnySupabaseClient,
  exitTimeId: string
): Promise<ExitTime | null> {
  const { data, error } = await supabase
    .from('exit_times')
    .select()
    .eq('id', exitTimeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return rowToExitTime(data);
}

export async function getExitTimesByPlan(
  supabase: AnySupabaseClient,
  planId: string
): Promise<ExitTime[]> {
  const { data, error } = await supabase
    .from('exit_times')
    .select()
    .eq('plan_id', planId);

  if (error) throw error;
  return data.map(rowToExitTime);
}

export async function deleteExitTime(
  supabase: AnySupabaseClient,
  exitTimeId: string
): Promise<void> {
  const { error } = await supabase
    .from('exit_times')
    .delete()
    .eq('id', exitTimeId);

  if (error) throw error;
}

export async function deleteExitTimesByPlan(
  supabase: AnySupabaseClient,
  planId: string
): Promise<void> {
  const { error } = await supabase
    .from('exit_times')
    .delete()
    .eq('plan_id', planId);

  if (error) throw error;
}

// Note: exit_times are immutable - no update functions provided
// To modify an exit time, delete and recreate it

// Composite operations for fetching complete plans
export async function getDailyPlanWithBlocks(
  supabase: AnySupabaseClient,
  planId: string
): Promise<DailyPlan | null> {
  const plan = await getDailyPlan(supabase, planId);
  if (!plan) return null;

  const [timeBlocks, exitTimes] = await Promise.all([
    getTimeBlocksByPlan(supabase, planId),
    getExitTimesByPlan(supabase, planId),
  ]);

  return {
    ...plan,
    timeBlocks,
    exitTimes,
  };
}

export async function getDailyPlanByDateWithBlocks(
  supabase: AnySupabaseClient,
  userId: string,
  date: Date
): Promise<DailyPlan | null> {
  const plan = await getDailyPlanByDate(supabase, userId, date);
  if (!plan) return null;

  const [timeBlocks, exitTimes] = await Promise.all([
    getTimeBlocksByPlan(supabase, plan.id),
    getExitTimesByPlan(supabase, plan.id),
  ]);

  return {
    ...plan,
    timeBlocks,
    exitTimes,
  };
}
