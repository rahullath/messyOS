// Daily Plan Generator V1 Types

export type EnergyState = 'low' | 'medium' | 'high';
export type PlanStatus = 'active' | 'degraded' | 'completed';
export type ActivityType = 'commitment' | 'task' | 'routine' | 'meal' | 'buffer' | 'travel';
export type BlockStatus = 'pending' | 'completed' | 'skipped';
export type TravelMethod = 'bike' | 'train' | 'walk' | 'bus';

// V2 Chain-Based Execution imports
import type { ExecutionChain } from '../lib/chains/types';
import type { HomeInterval, LocationPeriod } from '../lib/chains/location-state';
import type { WakeRamp } from '../lib/chains/wake-ramp';

export interface DailyPlan {
  id: string;
  userId: string;
  planDate: Date;
  wakeTime: Date;
  sleepTime: Date;
  energyState: EnergyState;
  status: PlanStatus;
  generatedAt: Date;
  generatedAfterNow: boolean;
  planStart: Date;
  createdAt: Date;
  updatedAt: Date;
  timeBlocks?: TimeBlock[];
  exitTimes?: ExitTime[];
  
  // V2 Chain-Based Execution fields
  // Requirements: 12.5, 18.1, 18.2, 18.3, 18.4
  chains?: ExecutionChain[];
  wakeRamp?: WakeRamp;
  locationPeriods?: LocationPeriod[];
  homeIntervals?: HomeInterval[];
}

export interface TimeBlock {
  id: string;
  planId: string;
  startTime: Date;
  endTime: Date;
  activityType: ActivityType;
  activityName: string;
  activityId?: string; // Reference to the actual task/commitment/routine
  isFixed: boolean;
  sequenceOrder: number;
  status: BlockStatus;
  skipReason?: string;
  metadata?: {
    targetTime?: Date;
    placementReason?: 'anchor-aware' | 'default';
    skipReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ExitTime {
  id: string;
  planId: string;
  timeBlockId: string;
  commitmentId: string;
  exitTime: Date;
  travelDuration: number; // minutes
  preparationTime: number; // minutes
  travelMethod: TravelMethod;
  createdAt: Date;
}

// Input types for plan generation
export interface PlanInput {
  userId: string;
  date: Date;
  wakeTime: Date;
  sleepTime: Date;
  energyState: EnergyState;
}

// Database row types (snake_case from database)
export interface DailyPlanRow {
  id: string;
  user_id: string;
  plan_date: string;
  wake_time: string;
  sleep_time: string;
  energy_state: EnergyState;
  status: PlanStatus;
  generated_at: string;
  generated_after_now: boolean;
  plan_start: string;
  created_at: string;
  updated_at: string;
}

export interface TimeBlockRow {
  id: string;
  plan_id: string;
  start_time: string;
  end_time: string;
  activity_type: ActivityType;
  activity_name: string;
  activity_id?: string;
  is_fixed: boolean;
  sequence_order: number;
  status: BlockStatus;
  skip_reason?: string;
  metadata?: {
    target_time?: string;
    placement_reason?: 'anchor-aware' | 'default';
    skip_reason?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ExitTimeRow {
  id: string;
  plan_id: string;
  time_block_id: string;
  commitment_id: string;
  exit_time: string;
  travel_duration: number;
  preparation_time: number;
  travel_method: TravelMethod;
  created_at: string;
}

// Helper type for creating new records (without generated fields)
export type CreateDailyPlan = Omit<DailyPlanRow, 'id' | 'created_at' | 'updated_at' | 'generated_at'>;
export type CreateTimeBlock = Omit<TimeBlockRow, 'id' | 'created_at' | 'updated_at'>;
export type CreateExitTime = Omit<ExitTimeRow, 'id' | 'created_at'>;

// Helper type for updating records
export type UpdateDailyPlan = Partial<Omit<DailyPlanRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type UpdateTimeBlock = Partial<Omit<TimeBlockRow, 'id' | 'plan_id' | 'created_at' | 'updated_at'>>;
