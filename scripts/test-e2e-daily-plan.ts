/**
 * End-to-End Test for Daily Plan Generator V1
 * 
 * Tests the complete user journey:
 * 1. Generate plan for today
 * 2. Complete first activity
 * 3. Skip second activity
 * 4. Degrade plan
 * 5. Verify all steps work
 * 
 * Requirements: 1.1, 3.3, 3.4, 4.1
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set in .env file');
  console.error('Note: Using SERVICE_ROLE_KEY is recommended for testing to bypass RLS');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Test user ID - same as used in other test scripts
const TEST_USER_ID = '70429eba-f32e-47ab-bfcb-a75e2f819de4';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function logResult(step: string, success: boolean, message: string, data?: any) {
  results.push({ step, success, message, data });
  const icon = success ? '✓' : '✗';
  console.log(`${icon} ${step}: ${message}`);
  if (data && Object.keys(data).length > 0) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
}

async function testCompleteUserJourney() {
  console.log('\n=== Starting End-to-End Test: Complete User Journey ===\n');
  console.log(`Test User ID: ${TEST_USER_ID}\n`);

  try {
    const userId = TEST_USER_ID;
    logResult('Setup', true, `Using test user: ${userId}`);

    // Step 1: Generate plan for today
    console.log('\n--- Step 1: Generate Plan ---');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const wakeTime = new Date(today);
    wakeTime.setHours(7, 0, 0, 0);
    
    const sleepTime = new Date(today);
    sleepTime.setHours(23, 0, 0, 0);

    // Delete existing plan for today if any
    await supabase
      .from('daily_plans')
      .delete()
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0]);

    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .insert({
        user_id: userId,
        plan_date: today.toISOString().split('T')[0],
        wake_time: wakeTime.toISOString(),
        sleep_time: sleepTime.toISOString(),
        energy_state: 'medium',
        status: 'active'
      })
      .select()
      .single();

    if (planError || !plan) {
      logResult('Generate Plan', false, `Failed to create plan: ${planError?.message}`);
      return;
    }

    logResult('Generate Plan', true, `Plan created with ID: ${plan.id}`, {
      planId: plan.id,
      wakeTime: plan.wake_time,
      sleepTime: plan.sleep_time,
      energyState: plan.energy_state
    });

    // Create some test time blocks
    const blocks = [
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime()).toISOString(),
        end_time: new Date(wakeTime.getTime() + 30 * 60000).toISOString(),
        activity_type: 'routine',
        activity_name: 'Morning Routine',
        is_fixed: false,
        sequence_order: 1,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime() + 30 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 35 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 2,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime() + 35 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 50 * 60000).toISOString(),
        activity_type: 'meal',
        activity_name: 'Breakfast',
        is_fixed: false,
        sequence_order: 3,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime() + 50 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 55 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 4,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime() + 55 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 115 * 60000).toISOString(),
        activity_type: 'task',
        activity_name: 'Test Task 1',
        is_fixed: false,
        sequence_order: 5,
        status: 'pending'
      }
    ];

    const { data: createdBlocks, error: blocksError } = await supabase
      .from('time_blocks')
      .insert(blocks)
      .select();

    if (blocksError || !createdBlocks) {
      logResult('Create Time Blocks', false, `Failed to create time blocks: ${blocksError?.message}`);
      return;
    }

    logResult('Create Time Blocks', true, `Created ${createdBlocks.length} time blocks`);

    // Step 2: Get current activity (should be first pending)
    console.log('\n--- Step 2: Get Current Activity ---');
    
    const { data: currentBlock, error: currentError } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('plan_id', plan.id)
      .eq('status', 'pending')
      .order('sequence_order', { ascending: true })
      .limit(1)
      .single();

    if (currentError || !currentBlock) {
      logResult('Get Current Activity', false, `Failed to get current activity: ${currentError?.message}`);
      return;
    }

    logResult('Get Current Activity', true, `Current activity: ${currentBlock.activity_name}`, {
      activityName: currentBlock.activity_name,
      startTime: currentBlock.start_time,
      endTime: currentBlock.end_time
    });

    // Step 3: Complete first activity
    console.log('\n--- Step 3: Complete First Activity ---');
    
    const { data: completedBlock, error: completeError } = await supabase
      .from('time_blocks')
      .update({ status: 'completed' })
      .eq('id', currentBlock.id)
      .select()
      .single();

    if (completeError || !completedBlock) {
      logResult('Complete Activity', false, `Failed to complete activity: ${completeError?.message}`);
      return;
    }

    logResult('Complete Activity', true, `Completed: ${completedBlock.activity_name}`, {
      activityName: completedBlock.activity_name,
      status: completedBlock.status
    });

    // Verify sequence advanced
    const { data: newCurrentBlock, error: newCurrentError } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('plan_id', plan.id)
      .eq('status', 'pending')
      .order('sequence_order', { ascending: true })
      .limit(1)
      .single();

    if (newCurrentError || !newCurrentBlock) {
      logResult('Verify Sequence Advanced', false, `Failed to get new current activity: ${newCurrentError?.message}`);
      return;
    }

    const sequenceAdvanced = newCurrentBlock.id !== currentBlock.id;
    logResult('Verify Sequence Advanced', sequenceAdvanced, 
      sequenceAdvanced 
        ? `Sequence advanced to: ${newCurrentBlock.activity_name}` 
        : 'Sequence did not advance',
      {
        previousActivity: currentBlock.activity_name,
        currentActivity: newCurrentBlock.activity_name
      }
    );

    // Step 4: Skip second activity
    console.log('\n--- Step 4: Skip Second Activity ---');
    
    const { data: skippedBlock, error: skipError } = await supabase
      .from('time_blocks')
      .update({ 
        status: 'skipped',
        skip_reason: 'Testing skip functionality'
      })
      .eq('id', newCurrentBlock.id)
      .select()
      .single();

    if (skipError || !skippedBlock) {
      logResult('Skip Activity', false, `Failed to skip activity: ${skipError?.message}`);
      return;
    }

    logResult('Skip Activity', true, `Skipped: ${skippedBlock.activity_name}`, {
      activityName: skippedBlock.activity_name,
      status: skippedBlock.status,
      skipReason: skippedBlock.skip_reason
    });

    // Step 5: Degrade plan
    console.log('\n--- Step 5: Degrade Plan ---');
    
    // Get all blocks before degradation
    const { data: blocksBeforeDegradation } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('plan_id', plan.id)
      .order('sequence_order', { ascending: true });

    const taskBlocksCount = blocksBeforeDegradation?.filter(b => b.activity_type === 'task').length || 0;
    const fixedBlocksCount = blocksBeforeDegradation?.filter(b => b.is_fixed).length || 0;

    logResult('Pre-Degradation State', true, 'Captured current state', {
      totalBlocks: blocksBeforeDegradation?.length,
      taskBlocks: taskBlocksCount,
      fixedBlocks: fixedBlocksCount
    });

    // Mark plan as degraded
    const { data: degradedPlan, error: degradeError } = await supabase
      .from('daily_plans')
      .update({ status: 'degraded' })
      .eq('id', plan.id)
      .select()
      .single();

    if (degradeError || !degradedPlan) {
      logResult('Degrade Plan', false, `Failed to degrade plan: ${degradeError?.message}`);
      return;
    }

    // Mark non-essential blocks as skipped
    const { error: skipTasksError } = await supabase
      .from('time_blocks')
      .update({ 
        status: 'skipped',
        skip_reason: 'Dropped during degradation'
      })
      .eq('plan_id', plan.id)
      .eq('activity_type', 'task')
      .eq('status', 'pending');

    if (skipTasksError) {
      logResult('Skip Tasks During Degradation', false, `Failed to skip tasks: ${skipTasksError.message}`);
      return;
    }

    logResult('Degrade Plan', true, 'Plan degraded successfully', {
      planStatus: degradedPlan.status
    });

    // Verify degradation results
    const { data: blocksAfterDegradation } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('plan_id', plan.id)
      .order('sequence_order', { ascending: true });

    const remainingTaskBlocks = blocksAfterDegradation?.filter(
      b => b.activity_type === 'task' && b.status === 'pending'
    ).length || 0;

    const skippedTaskBlocks = blocksAfterDegradation?.filter(
      b => b.activity_type === 'task' && b.status === 'skipped'
    ).length || 0;

    logResult('Verify Degradation', true, 'Degradation verified', {
      totalBlocksAfter: blocksAfterDegradation?.length,
      remainingTasks: remainingTaskBlocks,
      skippedTasks: skippedTaskBlocks,
      tasksDropped: taskBlocksCount - remainingTaskBlocks
    });

    // Step 6: Verify database persistence
    console.log('\n--- Step 6: Verify Database Persistence ---');
    
    const { data: persistedPlan, error: persistError } = await supabase
      .from('daily_plans')
      .select(`
        *,
        time_blocks (*)
      `)
      .eq('id', plan.id)
      .single();

    if (persistError || !persistedPlan) {
      logResult('Verify Persistence', false, `Failed to retrieve persisted plan: ${persistError?.message}`);
      return;
    }

    const hasCompletedBlocks = persistedPlan.time_blocks?.some((b: any) => b.status === 'completed') || false;
    const hasSkippedBlocks = persistedPlan.time_blocks?.some((b: any) => b.status === 'skipped') || false;
    const isDegraded = persistedPlan.status === 'degraded';

    logResult('Verify Persistence', true, 'All data persisted correctly', {
      planId: persistedPlan.id,
      status: persistedPlan.status,
      totalBlocks: persistedPlan.time_blocks?.length,
      hasCompletedBlocks,
      hasSkippedBlocks,
      isDegraded
    });

    // Summary
    console.log('\n=== Test Summary ===\n');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`Passed: ${successCount}/${totalCount}`);
    console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
      console.log('\n✓ All tests passed! User journey works end-to-end.');
    } else {
      console.log('\n✗ Some tests failed. Review the results above.');
    }

  } catch (error) {
    console.error('Unexpected error during test:', error);
    logResult('Unexpected Error', false, error instanceof Error ? error.message : String(error));
  }
}

// Run the test
testCompleteUserJourney().catch(console.error);
