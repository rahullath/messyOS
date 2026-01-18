/**
 * End-to-End Test: Delete Plan Scenario (V1.1)
 * 
 * Tests the delete plan functionality:
 * 1. Generate plan
 * 2. Delete plan
 * 3. Verify plan generation form shown (can regenerate)
 * 4. Verify can regenerate immediately
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.5
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Test user ID
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

async function testDeletePlanScenario() {
  console.log('\n=== E2E Test: Delete Plan Scenario (V1.1) ===\n');
  console.log(`Test User ID: ${TEST_USER_ID}\n`);

  try {
    const userId = TEST_USER_ID;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const wakeTime = new Date(today);
    wakeTime.setHours(7, 0, 0, 0);
    
    const sleepTime = new Date(today);
    sleepTime.setHours(23, 0, 0, 0);
    
    console.log('--- Test Setup ---');
    logResult('Setup', true, 'Testing delete plan functionality', {
      wakeTime: wakeTime.toISOString(),
      sleepTime: sleepTime.toISOString()
    });

    // Step 1: Clean up any existing plan for today
    console.log('\n--- Step 1: Clean Up Existing Plan ---');
    
    await supabase
      .from('daily_plans')
      .delete()
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0]);

    logResult('Clean Up', true, 'Cleaned up existing plans for today');

    // Step 2: Generate a new plan
    console.log('\n--- Step 2: Generate Plan ---');
    
    const now = new Date();
    const roundedNow = new Date(now);
    const minutes = roundedNow.getMinutes();
    const remainder = minutes % 5;
    if (remainder !== 0) {
      roundedNow.setMinutes(minutes + (5 - remainder));
    }
    roundedNow.setSeconds(0);
    roundedNow.setMilliseconds(0);
    
    const planStart = new Date(Math.max(wakeTime.getTime(), roundedNow.getTime()));
    const generatedAfterNow = planStart.getTime() > wakeTime.getTime();

    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .insert({
        user_id: userId,
        plan_date: today.toISOString().split('T')[0],
        wake_time: wakeTime.toISOString(),
        sleep_time: sleepTime.toISOString(),
        energy_state: 'medium',
        status: 'active',
        generated_after_now: generatedAfterNow,
        plan_start: planStart.toISOString()
      })
      .select()
      .single();

    if (planError || !plan) {
      logResult('Generate Plan', false, `Failed to create plan: ${planError?.message}`);
      return;
    }

    const planId = plan.id;
    logResult('Generate Plan', true, `Plan created with ID: ${planId}`, {
      planId
    });

    // Step 3: Create time blocks
    console.log('\n--- Step 3: Create Time Blocks ---');
    
    const blocks = [
      {
        plan_id: planId,
        start_time: new Date(wakeTime.getTime()).toISOString(),
        end_time: new Date(wakeTime.getTime() + 30 * 60000).toISOString(),
        activity_type: 'routine',
        activity_name: 'Morning Routine',
        is_fixed: false,
        sequence_order: 1,
        status: 'pending'
      },
      {
        plan_id: planId,
        start_time: new Date(wakeTime.getTime() + 30 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 35 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 2,
        status: 'pending'
      },
      {
        plan_id: planId,
        start_time: new Date(wakeTime.getTime() + 35 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 50 * 60000).toISOString(),
        activity_type: 'meal',
        activity_name: 'Breakfast',
        is_fixed: false,
        sequence_order: 3,
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

    logResult('Create Time Blocks', true, `Created ${createdBlocks.length} time blocks`, {
      blockCount: createdBlocks.length
    });

    // Step 4: Create exit times (optional, but good to test cascade delete)
    console.log('\n--- Step 4: Create Exit Times ---');
    
    // Generate a valid UUID for the test commitment
    const testCommitmentId = '00000000-0000-0000-0000-000000000001';
    
    const { data: exitTime, error: exitTimeError } = await supabase
      .from('exit_times')
      .insert({
        plan_id: planId,
        time_block_id: createdBlocks[0].id,
        commitment_id: testCommitmentId,
        exit_time: new Date(wakeTime.getTime() - 30 * 60000).toISOString(),
        travel_duration: 20,
        preparation_time: 10,
        travel_method: 'bike'
      })
      .select()
      .single();

    if (exitTimeError) {
      logResult('Create Exit Time', false, `Failed to create exit time: ${exitTimeError.message}`);
    } else {
      logResult('Create Exit Time', true, 'Exit time created', {
        exitTimeId: exitTime?.id
      });
    }

    // Step 5: Verify plan exists with all related data
    console.log('\n--- Step 5: Verify Plan Exists ---');
    
    const { data: existingPlan, error: fetchError } = await supabase
      .from('daily_plans')
      .select(`
        *,
        time_blocks (*),
        exit_times (*)
      `)
      .eq('id', planId)
      .single();

    if (fetchError || !existingPlan) {
      logResult('Verify Plan Exists', false, `Plan not found: ${fetchError?.message}`);
      return;
    }

    logResult('Verify Plan Exists', true, 'Plan exists with related data', {
      planId: existingPlan.id,
      timeBlockCount: existingPlan.time_blocks?.length || 0,
      exitTimeCount: existingPlan.exit_times?.length || 0
    });

    // Step 6: Delete the plan (Requirement 10.2)
    console.log('\n--- Step 6: Delete Plan ---');
    
    const { error: deleteError } = await supabase
      .from('daily_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (deleteError) {
      logResult('Delete Plan', false, `Failed to delete plan: ${deleteError.message}`);
      return;
    }

    logResult('Delete Plan', true, 'Plan deleted successfully', {
      deletedPlanId: planId
    });

    // Step 7: Verify plan no longer exists
    console.log('\n--- Step 7: Verify Plan Deleted ---');
    
    const { data: deletedPlan, error: verifyDeleteError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    const planDeleted = !deletedPlan;
    
    logResult('Verify Plan Deleted', planDeleted,
      planDeleted 
        ? 'Plan successfully deleted' 
        : 'Plan still exists (should be deleted)',
      {
        planExists: !!deletedPlan
      }
    );

    // Step 8: Verify time blocks deleted (cascade)
    console.log('\n--- Step 8: Verify Time Blocks Deleted ---');
    
    const { data: remainingBlocks, error: blocksCheckError } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('plan_id', planId);

    const blocksDeleted = !remainingBlocks || remainingBlocks.length === 0;
    
    logResult('Verify Time Blocks Deleted', blocksDeleted,
      blocksDeleted 
        ? 'All time blocks deleted (cascade)' 
        : `${remainingBlocks?.length} time blocks still exist (should be 0)`,
      {
        remainingBlocks: remainingBlocks?.length || 0
      }
    );

    // Step 9: Verify exit times deleted (cascade)
    console.log('\n--- Step 9: Verify Exit Times Deleted ---');
    
    const { data: remainingExitTimes, error: exitTimesCheckError } = await supabase
      .from('exit_times')
      .select('*')
      .eq('plan_id', planId);

    const exitTimesDeleted = !remainingExitTimes || remainingExitTimes.length === 0;
    
    logResult('Verify Exit Times Deleted', exitTimesDeleted,
      exitTimesDeleted 
        ? 'All exit times deleted (cascade)' 
        : `${remainingExitTimes?.length} exit times still exist (should be 0)`,
      {
        remainingExitTimes: remainingExitTimes?.length || 0
      }
    );

    // Step 10: Verify no plan exists for today (simulating "plan generation form shown")
    console.log('\n--- Step 10: Verify No Plan for Today (Form Should Show) ---');
    
    const { data: todayPlan, error: todayPlanError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0])
      .maybeSingle();

    const noPlanForToday = !todayPlan;
    
    logResult('Verify No Plan for Today', noPlanForToday,
      noPlanForToday 
        ? 'No plan exists for today (form should show)' 
        : 'Plan still exists for today (form should not show)',
      {
        planExists: !!todayPlan
      }
    );

    // Step 11: Verify can regenerate immediately (Requirement 10.5)
    console.log('\n--- Step 11: Verify Can Regenerate Immediately ---');
    
    const { data: newPlan, error: regenerateError } = await supabase
      .from('daily_plans')
      .insert({
        user_id: userId,
        plan_date: today.toISOString().split('T')[0],
        wake_time: wakeTime.toISOString(),
        sleep_time: sleepTime.toISOString(),
        energy_state: 'high',
        status: 'active',
        generated_after_now: generatedAfterNow,
        plan_start: planStart.toISOString()
      })
      .select()
      .single();

    if (regenerateError || !newPlan) {
      logResult('Verify Can Regenerate', false, `Failed to regenerate plan: ${regenerateError?.message}`);
      return;
    }

    logResult('Verify Can Regenerate', true, 'Plan regenerated successfully', {
      newPlanId: newPlan.id,
      energyState: newPlan.energy_state
    });

    // Step 12: Verify new plan is different from deleted plan
    console.log('\n--- Step 12: Verify New Plan is Different ---');
    
    const isDifferentPlan = newPlan.id !== planId;
    
    logResult('Verify Different Plan', isDifferentPlan,
      isDifferentPlan 
        ? 'New plan has different ID' 
        : 'New plan has same ID (should be different)',
      {
        originalPlanId: planId,
        newPlanId: newPlan.id,
        isDifferent: isDifferentPlan
      }
    );

    // Step 13: Clean up the regenerated plan
    console.log('\n--- Step 13: Clean Up Regenerated Plan ---');
    
    await supabase
      .from('daily_plans')
      .delete()
      .eq('id', newPlan.id);

    logResult('Clean Up Regenerated Plan', true, 'Regenerated plan cleaned up');

    // Summary
    console.log('\n=== Test Summary ===\n');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`Passed: ${successCount}/${totalCount}`);
    console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
      console.log('\n✓ All tests passed! Delete plan scenario works correctly.');
      console.log('✓ Plan deleted successfully');
      console.log('✓ Time blocks deleted (cascade)');
      console.log('✓ Exit times deleted (cascade)');
      console.log('✓ No plan exists after deletion (form should show)');
      console.log('✓ Can regenerate immediately');
      console.log('✓ New plan is different from deleted plan');
    } else {
      console.log('\n✗ Some tests failed. Review the results above.');
    }

  } catch (error) {
    console.error('Unexpected error during test:', error);
    logResult('Unexpected Error', false, error instanceof Error ? error.message : String(error));
  }
}

// Run the test
testDeletePlanScenario().catch(console.error);
