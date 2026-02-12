// Daily Plan Generator V1 - Sequencer Service
// Derives sequence from time_blocks order (no separate currentIndex needed)

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DailyPlan, TimeBlock } from '../../types/daily-plan';
import { getTimeBlocksByPlan, updateTimeBlock } from './database';

// Type for Supabase client (generic to work with any database schema)
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Get the current block (first pending block in sequence)
 * Requirements: 3.1
 * 
 * @param supabase - Supabase client
 * @param planId - Daily plan ID
 * @returns First pending block or null if none found
 */
export async function getCurrentBlock(
  supabase: AnySupabaseClient,
  planId: string
): Promise<TimeBlock | null> {
  const timeBlocks = await getTimeBlocksByPlan(supabase, planId);
  
  // Find first block with status='pending'
  const currentBlock = timeBlocks.find(block => block.status === 'pending');
  
  return currentBlock || null;
}

/**
 * Get the current block from a plan object with timeBlocks already loaded
 * Requirements: 3.1
 * 
 * @param plan - Daily plan with timeBlocks
 * @returns First pending block or null if none found
 */
export function getCurrentBlockFromPlan(plan: DailyPlan): TimeBlock | null {
  if (!plan.timeBlocks || plan.timeBlocks.length === 0) {
    return null;
  }
  
  // Find first block with status='pending'
  const currentBlock = plan.timeBlocks.find(block => block.status === 'pending');
  
  return currentBlock || null;
}

/**
 * Get the next n pending blocks after the current block
 * Requirements: 3.2
 * 
 * @param supabase - Supabase client
 * @param planId - Daily plan ID
 * @param count - Number of blocks to return
 * @returns Array of next pending blocks (up to count)
 */
export async function getNextBlocks(
  supabase: AnySupabaseClient,
  planId: string,
  count: number
): Promise<TimeBlock[]> {
  const timeBlocks = await getTimeBlocksByPlan(supabase, planId);
  
  // Find current block
  const currentIndex = timeBlocks.findIndex(block => block.status === 'pending');
  
  if (currentIndex === -1) {
    // No pending blocks
    return [];
  }
  
  // Get next n pending blocks after current
  const nextBlocks: TimeBlock[] = [];
  for (let i = currentIndex + 1; i < timeBlocks.length && nextBlocks.length < count; i++) {
    if (timeBlocks[i].status === 'pending') {
      nextBlocks.push(timeBlocks[i]);
    }
  }
  
  return nextBlocks;
}

/**
 * Get the next n pending blocks from a plan object with timeBlocks already loaded
 * Requirements: 3.2
 * 
 * @param plan - Daily plan with timeBlocks
 * @param count - Number of blocks to return
 * @returns Array of next pending blocks (up to count)
 */
export function getNextBlocksFromPlan(plan: DailyPlan, count: number): TimeBlock[] {
  if (!plan.timeBlocks || plan.timeBlocks.length === 0) {
    return [];
  }
  
  // Find current block
  const currentIndex = plan.timeBlocks.findIndex(block => block.status === 'pending');
  
  if (currentIndex === -1) {
    // No pending blocks
    return [];
  }
  
  // Get next n pending blocks after current
  const nextBlocks: TimeBlock[] = [];
  for (let i = currentIndex + 1; i < plan.timeBlocks.length && nextBlocks.length < count; i++) {
    if (plan.timeBlocks[i].status === 'pending') {
      nextBlocks.push(plan.timeBlocks[i]);
    }
  }
  
  return nextBlocks;
}

/**
 * Mark a block as complete
 * Requirements: 3.3
 * 
 * The sequence automatically advances on the next getCurrentBlock() call
 * since we derive the current block from time_blocks order
 * 
 * @param supabase - Supabase client
 * @param blockId - Time block ID to mark complete
 * @returns Updated time block
 */
export async function markBlockComplete(
  supabase: AnySupabaseClient,
  blockId: string
): Promise<TimeBlock> {
  return await updateTimeBlock(supabase, blockId, {
    status: 'completed',
  });
}

/**
 * Mark a block as skipped with optional reason
 * Requirements: 3.3
 * 
 * @param supabase - Supabase client
 * @param blockId - Time block ID to mark skipped
 * @param skipReason - Optional reason for skipping
 * @returns Updated time block
 */
export async function markBlockSkipped(
  supabase: AnySupabaseClient,
  blockId: string,
  skipReason?: string
): Promise<TimeBlock> {
  return await updateTimeBlock(supabase, blockId, {
    status: 'skipped',
    skip_reason: skipReason,
  });
}
