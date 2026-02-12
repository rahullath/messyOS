/**
 * End-to-End Test for Database Persistence
 * 
 * Tests that:
 * 1. Generate plan
 * 2. Verify plan is saved to database
 * 3. Simulate page refresh (re-fetch from database)
 * 4. Verify plan loads correctly with all data intact
 * 
 * Requirements: 9.1, 9.2
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

async function testDatabasePersistence() {
  console.log('\n=== End-to-End Test: Database Persistence ===\n');
  console.log(`Test User ID: ${TEST_USER_ID}\n`);

  try {
    const userId = TEST_USER_ID;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Clean up any existing plans for today
    console.log('--- Step 1: Clean Up Existing Plans ---');
    
    await supabase
      .from('daily_plans')
      .delete()
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0]);

    logResult('Clean Up', true, 'Cleaned up existing plans for today');

    // Step 2: Generate a new plan
    console.log('\n--- Step 2: Generate New Plan ---');
    
    const wakeTime = new Date(today);
    wakeTime.setHours(7, 0, 0, 0);
    
    const sleepTime = new Date(today);
    sleepTime.setHours(23, 0, 0, 0);

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

    const originalPlanId = plan.id;
    logResult('Generate Plan', true, `Plan created with ID: ${originalPlanId}`, {
      planId: originalPlanId,
      wakeTime: plan.wake_time,
      sleepTime: plan.sleep_time,
      energyState: plan.energy_state,
      status: plan.status
    });

    // Step 3: Create time blocks
    console.log('\n--- Step 3: Create Time Blocks ---');
    
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
        activity_name: 'Complete project documentation',
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

    const originalBlockCount = createdBlocks.length;
    logResult('Create Time Blocks', true, `Created ${originalBlockCount} time blocks`);

    // Step 4: Modify some blocks (complete one, skip another)
    console.log('\n--- Step 4: Modify Blocks ---');
    
    const firstBlock = createdBlocks[0];
    const secondBlock = createdBlocks[1];

    // Complete first block
    await supabase
      .from('time_blocks')
      .update({ status: 'completed' })
      .eq('id', firstBlock.id);

    // Skip second block
    await supabase
      .from('time_blocks')
      .update({ 
        status: 'skipped',
        skip_reason: 'Testing persistence'
      })
      .eq('id', secondBlock.id);

    logResult('Modify Blocks', true, 'Modified block statuses', {
      completedBlock: firstBlock.activity_name,
      skippedBlock: secondBlock.activity_name
    });

    // Step 5: Simulate page refresh - clear local state and re-fetch from database
    console.log('\n--- Step 5: Simulate Page Refresh (Re-fetch from Database) ---');
    
    // Simulate clearing local state by not using any variables from above
    // Only use the user ID and date to fetch the plan
    
    const { data: refetchedPlan, error: refetchError } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0])
      .single();

    if (refetchError || !refetchedPlan) {
      logResult('Refetch Plan', false, `Failed to refetch plan: ${refetchError?.message}`);
      return;
    }

    logResult('Refetch Plan', true, 'Plan refetched successfully', {
      planId: refetchedPlan.id,
      status: refetchedPlan.status
    });

    // Step 6: Verify plan data matches original
    console.log('\n--- Step 6: Verify Plan Data Integrity ---');
    
    const planMatches = refetchedPlan.id === originalPlanId &&
                       refetchedPlan.wake_time === plan.wake_time &&
                       refetchedPlan.sleep_time === plan.sleep_time &&
                       refetchedPlan.energy_state === plan.energy_state;

    logResult('Verify Plan Data', planMatches, 
      planMatches ? 'Plan data matches original' : 'Plan data does not match',
      {
        originalId: originalPlanId,
        refetchedId: refetchedPlan.id,
        match: planMatches
      }
    );

    // Step 7: Refetch time blocks
    console.log('\n--- Step 7: Refetch Time Blocks ---');
    
    const { data: refetchedBlocks, error: refetchBlocksError } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('plan_id', refetchedPlan.id)
      .order('sequence_order', { ascending: true });

    if (refetchBlocksError || !refetchedBlocks) {
      logResult('Refetch Time Blocks', false, `Failed to refetch blocks: ${refetchBlocksError?.message}`);
      return;
    }

    logResult('Refetch Time Blocks', true, `Refetched ${refetchedBlocks.length} time blocks`, {
      originalCount: originalBlockCount,
      refetchedCount: refetchedBlocks.length
    });

    // Step 8: Verify block count matches
    console.log('\n--- Step 8: Verify Block Count ---');
    
    const blockCountMatches = refetchedBlocks.length === originalBlockCount;
    logResult('Verify Block Count', blockCountMatches,
      blockCountMatches 
        ? 'Block count matches original' 
        : `Block count mismatch: expected ${originalBlockCount}, got ${refetchedBlocks.length}`
    );

    // Step 9: Verify block statuses persisted
    console.log('\n--- Step 9: Verify Block Statuses Persisted ---');
    
    const completedBlock = refetchedBlocks.find(b => b.id === firstBlock.id);
    const skippedBlock = refetchedBlocks.find(b => b.id === secondBlock.id);

    const statusesMatch = completedBlock?.status === 'completed' &&
                         skippedBlock?.status === 'skipped' &&
                         skippedBlock?.skip_reason === 'Testing persistence';

    logResult('Verify Block Statuses', statusesMatch,
      statusesMatch ? 'Block statuses persisted correctly' : 'Block statuses did not persist',
      {
        completedBlockStatus: completedBlock?.status,
        skippedBlockStatus: skippedBlock?.status,
        skipReason: skippedBlock?.skip_reason
      }
    );

    // Step 10: Verify all block data persisted
    console.log('\n--- Step 10: Verify All Block Data Persisted ---');
    
    let allDataPersisted = true;
    const mismatches: string[] = [];

    for (let i = 0; i < createdBlocks.length; i++) {
      const original = createdBlocks[i];
      const refetched = refetchedBlocks.find(b => b.id === original.id);

      if (!refetched) {
        allDataPersisted = false;
        mismatches.push(`Block ${original.activity_name} not found in refetched data`);
        continue;
      }

      // Check key fields
      if (refetched.activity_name !== original.activity_name) {
        allDataPersisted = false;
        mismatches.push(`Activity name mismatch for ${original.activity_name}`);
      }

      if (refetched.activity_type !== original.activity_type) {
        allDataPersisted = false;
        mismatches.push(`Activity type mismatch for ${original.activity_name}`);
      }

      if (refetched.sequence_order !== original.sequence_order) {
        allDataPersisted = false;
        mismatches.push(`Sequence order mismatch for ${original.activity_name}`);
      }

      if (refetched.is_fixed !== original.is_fixed) {
        allDataPersisted = false;
        mismatches.push(`is_fixed mismatch for ${original.activity_name}`);
      }
    }

    logResult('Verify All Block Data', allDataPersisted,
      allDataPersisted ? 'All block data persisted correctly' : 'Some block data did not persist',
      {
        allMatch: allDataPersisted,
        mismatches: mismatches.length > 0 ? mismatches : undefined
      }
    );

    // Step 11: Test fetching plan by date (simulating /api/daily-plan/today endpoint)
    console.log('\n--- Step 11: Test Fetch Plan by Date ---');
    
    const { data: planByDate, error: planByDateError } = await supabase
      .from('daily_plans')
      .select(`
        *,
        time_blocks (*)
      `)
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0])
      .single();

    if (planByDateError || !planByDate) {
      logResult('Fetch Plan by Date', false, `Failed to fetch plan by date: ${planByDateError?.message}`);
      return;
    }

    const hasTimeBlocks = planByDate.time_blocks && planByDate.time_blocks.length > 0;
    logResult('Fetch Plan by Date', hasTimeBlocks,
      hasTimeBlocks 
        ? `Plan fetched with ${planByDate.time_blocks.length} time blocks` 
        : 'Plan fetched but no time blocks',
      {
        planId: planByDate.id,
        timeBlockCount: planByDate.time_blocks?.length
      }
    );

    // Summary
    console.log('\n=== Test Summary ===\n');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`Passed: ${successCount}/${totalCount}`);
    console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
      console.log('\n✓ All tests passed! Database persistence works correctly.');
      console.log('✓ Plans and time blocks persist across page refreshes.');
      console.log('✓ Block statuses (completed/skipped) are maintained.');
      console.log('✓ All data integrity checks passed.');
    } else {
      console.log('\n✗ Some tests failed. Review the results above.');
    }

  } catch (error) {
    console.error('Unexpected error during test:', error);
    logResult('Unexpected Error', false, error instanceof Error ? error.message : String(error));
  }
}

// Run the test
testDatabasePersistence().catch(console.error);
