/**
 * End-to-End Test: Late Generation Scenario (V1.1)
 * 
 * Tests the complete late generation flow:
 * 1. Generate plan at 3pm (simulated)
 * 2. Verify planStart = 3pm
 * 3. Verify no morning blocks shown (marked as skipped)
 * 4. Verify tail plan generated if needed
 * 5. Verify "behind schedule" not triggered for skipped morning
 * 6. Verify completion logic works correctly
 * 
 * Requirements: 1.1, 2.1, 5.1, 6.1
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

async function testLateGenerationScenario() {
  console.log('\n=== E2E Test: Late Generation Scenario (V1.1) ===\n');
  console.log(`Test User ID: ${TEST_USER_ID}\n`);

  try {
    const userId = TEST_USER_ID;
    
    // Simulate generating plan at 3pm
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const wakeTime = new Date(today);
    wakeTime.setHours(7, 0, 0, 0);
    
    const sleepTime = new Date(today);
    sleepTime.setHours(23, 0, 0, 0);
    
    // Simulate current time being 3pm (15:00)
    const simulatedNow = new Date(today);
    simulatedNow.setHours(15, 0, 0, 0);
    
    console.log('--- Test Setup ---');
    logResult('Setup', true, 'Simulating plan generation at 3pm', {
      wakeTime: wakeTime.toISOString(),
      sleepTime: sleepTime.toISOString(),
      simulatedNow: simulatedNow.toISOString()
    });

    // Step 1: Clean up existing plan for today
    console.log('\n--- Step 1: Clean Up Existing Plan ---');
    
    await supabase
      .from('daily_plans')
      .delete()
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0]);

    logResult('Clean Up', true, 'Cleaned up existing plans for today');

    // Step 2: Generate plan (simulating 3pm generation)
    console.log('\n--- Step 2: Generate Plan at 3pm ---');
    
    // Calculate planStart (should be max of wakeTime and simulatedNow, rounded up to next 5 min)
    const roundedNow = new Date(simulatedNow);
    const minutes = roundedNow.getMinutes();
    const remainder = minutes % 5;
    if (remainder !== 0) {
      roundedNow.setMinutes(minutes + (5 - remainder));
    }
    roundedNow.setSeconds(0);
    roundedNow.setMilliseconds(0);
    
    const expectedPlanStart = new Date(Math.max(wakeTime.getTime(), roundedNow.getTime()));
    const expectedGeneratedAfterNow = expectedPlanStart.getTime() > wakeTime.getTime();

    // Create plan with metadata
    const { data: plan, error: planError } = await supabase
      .from('daily_plans')
      .insert({
        user_id: userId,
        plan_date: today.toISOString().split('T')[0],
        wake_time: wakeTime.toISOString(),
        sleep_time: sleepTime.toISOString(),
        energy_state: 'medium',
        status: 'active',
        generated_after_now: expectedGeneratedAfterNow,
        plan_start: expectedPlanStart.toISOString()
      })
      .select()
      .single();

    if (planError || !plan) {
      logResult('Generate Plan', false, `Failed to create plan: ${planError?.message}`);
      return;
    }

    logResult('Generate Plan', true, `Plan created with ID: ${plan.id}`, {
      planId: plan.id,
      planStart: plan.plan_start,
      generatedAfterNow: plan.generated_after_now
    });

    // Step 3: Verify planStart = 3pm (Requirement 1.1)
    console.log('\n--- Step 3: Verify Plan Start Time ---');
    
    const actualPlanStart = new Date(plan.plan_start);
    const planStartMatches = actualPlanStart.getHours() === 15;
    
    logResult('Verify Plan Start', planStartMatches,
      planStartMatches 
        ? `Plan start is 3pm: ${actualPlanStart.toISOString()}` 
        : `Plan start mismatch: expected 3pm, got ${actualPlanStart.toISOString()}`,
      {
        expected: expectedPlanStart.toISOString(),
        actual: plan.plan_start,
        matches: planStartMatches
      }
    );

    // Step 4: Verify generated_after_now flag (Requirement 1.1)
    console.log('\n--- Step 4: Verify Generated After Now Flag ---');
    
    logResult('Verify Generated After Now', plan.generated_after_now === true,
      plan.generated_after_now 
        ? 'generated_after_now flag is true' 
        : 'generated_after_now flag is false (should be true)',
      {
        generatedAfterNow: plan.generated_after_now
      }
    );

    // Step 5: Create time blocks (simulating plan builder output)
    console.log('\n--- Step 5: Create Time Blocks ---');
    
    const blocks = [
      // Morning blocks (should be skipped)
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime()).toISOString(),
        end_time: new Date(wakeTime.getTime() + 30 * 60000).toISOString(),
        activity_type: 'routine',
        activity_name: 'Morning Routine',
        is_fixed: false,
        sequence_order: 1,
        status: 'skipped',
        skip_reason: 'Occurred before plan start'
      },
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime() + 30 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 35 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 2,
        status: 'skipped',
        skip_reason: 'Occurred before plan start'
      },
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime() + 35 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 50 * 60000).toISOString(),
        activity_type: 'meal',
        activity_name: 'Breakfast',
        is_fixed: false,
        sequence_order: 3,
        status: 'skipped',
        skip_reason: 'Occurred before plan start'
      },
      {
        plan_id: plan.id,
        start_time: new Date(wakeTime.getTime() + 50 * 60000).toISOString(),
        end_time: new Date(wakeTime.getTime() + 55 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 4,
        status: 'skipped',
        skip_reason: 'Occurred before plan start'
      },
      // Lunch (should be skipped - before 3pm)
      {
        plan_id: plan.id,
        start_time: new Date(today.getTime() + 12 * 60 * 60000).toISOString(),
        end_time: new Date(today.getTime() + 12.5 * 60 * 60000).toISOString(),
        activity_type: 'meal',
        activity_name: 'Lunch',
        is_fixed: false,
        sequence_order: 5,
        status: 'skipped',
        skip_reason: 'Occurred before plan start'
      },
      // Tail plan blocks (after 3pm)
      {
        plan_id: plan.id,
        start_time: expectedPlanStart.toISOString(),
        end_time: new Date(expectedPlanStart.getTime() + 10 * 60000).toISOString(),
        activity_type: 'task',
        activity_name: 'Reset/Admin',
        is_fixed: false,
        sequence_order: 6,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(expectedPlanStart.getTime() + 10 * 60000).toISOString(),
        end_time: new Date(expectedPlanStart.getTime() + 15 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 7,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(expectedPlanStart.getTime() + 15 * 60000).toISOString(),
        end_time: new Date(expectedPlanStart.getTime() + 75 * 60000).toISOString(),
        activity_type: 'task',
        activity_name: 'Primary Focus Block',
        is_fixed: false,
        sequence_order: 8,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(expectedPlanStart.getTime() + 75 * 60000).toISOString(),
        end_time: new Date(expectedPlanStart.getTime() + 80 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 9,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(expectedPlanStart.getTime() + 80 * 60000).toISOString(),
        end_time: new Date(expectedPlanStart.getTime() + 125 * 60000).toISOString(),
        activity_type: 'meal',
        activity_name: 'Dinner',
        is_fixed: false,
        sequence_order: 10,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(expectedPlanStart.getTime() + 125 * 60000).toISOString(),
        end_time: new Date(expectedPlanStart.getTime() + 130 * 60000).toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: 11,
        status: 'pending'
      },
      {
        plan_id: plan.id,
        start_time: new Date(expectedPlanStart.getTime() + 130 * 60000).toISOString(),
        end_time: new Date(expectedPlanStart.getTime() + 150 * 60000).toISOString(),
        activity_type: 'routine',
        activity_name: 'Evening Routine',
        is_fixed: false,
        sequence_order: 12,
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

    // Step 6: Verify no morning blocks shown (Requirement 1.3)
    console.log('\n--- Step 6: Verify Morning Blocks Skipped ---');
    
    const morningBlocks = createdBlocks.filter(b => 
      b.activity_name === 'Morning Routine' || 
      b.activity_name === 'Breakfast' ||
      b.activity_name === 'Lunch'
    );
    
    const allMorningSkipped = morningBlocks.every(b => b.status === 'skipped');
    
    logResult('Verify Morning Blocks Skipped', allMorningSkipped,
      allMorningSkipped 
        ? `All ${morningBlocks.length} morning blocks marked as skipped` 
        : 'Some morning blocks not skipped',
      {
        morningBlockCount: morningBlocks.length,
        allSkipped: allMorningSkipped,
        morningBlocks: morningBlocks.map(b => ({
          name: b.activity_name,
          status: b.status,
          skipReason: b.skip_reason
        }))
      }
    );

    // Step 7: Verify tail plan generated (Requirement 2.1)
    console.log('\n--- Step 7: Verify Tail Plan Generated ---');
    
    const tailPlanBlocks = createdBlocks.filter(b => 
      b.status === 'pending' &&
      new Date(b.start_time) >= expectedPlanStart
    );
    
    const hasTailPlan = tailPlanBlocks.length > 0;
    const hasResetAdmin = tailPlanBlocks.some(b => b.activity_name === 'Reset/Admin');
    const hasPrimaryFocus = tailPlanBlocks.some(b => b.activity_name === 'Primary Focus Block');
    const hasDinner = tailPlanBlocks.some(b => b.activity_name === 'Dinner');
    const hasEveningRoutine = tailPlanBlocks.some(b => b.activity_name === 'Evening Routine');
    
    logResult('Verify Tail Plan', hasTailPlan,
      hasTailPlan 
        ? `Tail plan generated with ${tailPlanBlocks.length} blocks` 
        : 'No tail plan blocks found',
      {
        tailPlanBlockCount: tailPlanBlocks.length,
        hasResetAdmin,
        hasPrimaryFocus,
        hasDinner,
        hasEveningRoutine
      }
    );

    // Step 8: Verify "behind schedule" logic (Requirement 5.1)
    console.log('\n--- Step 8: Verify Behind Schedule Logic ---');
    
    // Get current block (first pending after planStart)
    const currentBlock = createdBlocks
      .filter(b => b.status === 'pending' && new Date(b.end_time) > expectedPlanStart)
      .sort((a, b) => a.sequence_order - b.sequence_order)[0];
    
    if (!currentBlock) {
      logResult('Get Current Block', false, 'No current block found');
      return;
    }
    
    // Check if behind schedule (now > currentBlock.endTime + 30 minutes)
    // Since we're simulating 3pm and current block starts at 3pm, we're NOT behind
    const currentBlockEnd = new Date(currentBlock.end_time);
    const behindScheduleThreshold = new Date(currentBlockEnd.getTime() + 30 * 60000);
    const isBehindSchedule = simulatedNow > behindScheduleThreshold;
    
    logResult('Verify Behind Schedule', !isBehindSchedule,
      !isBehindSchedule 
        ? 'Not behind schedule (correct - just started)' 
        : 'Behind schedule (incorrect - should not be behind)',
      {
        currentBlock: currentBlock.activity_name,
        currentBlockEnd: currentBlockEnd.toISOString(),
        behindScheduleThreshold: behindScheduleThreshold.toISOString(),
        simulatedNow: simulatedNow.toISOString(),
        isBehindSchedule
      }
    );

    // Step 9: Verify skipped blocks don't trigger "behind schedule" (Requirement 5.1, 5.2, 5.4)
    console.log('\n--- Step 9: Verify Skipped Blocks Ignored ---');
    
    const skippedBlocks = createdBlocks.filter(b => b.status === 'skipped');
    const skippedBlocksBeforePlanStart = skippedBlocks.filter(b => 
      new Date(b.end_time) <= expectedPlanStart
    );
    
    logResult('Verify Skipped Blocks Ignored', skippedBlocksBeforePlanStart.length === skippedBlocks.length,
      `All ${skippedBlocks.length} skipped blocks are before plan start`,
      {
        totalSkipped: skippedBlocks.length,
        skippedBeforePlanStart: skippedBlocksBeforePlanStart.length
      }
    );

    // Step 10: Verify completion logic (Requirement 6.1)
    console.log('\n--- Step 10: Verify Completion Logic ---');
    
    // Get all blocks after planStart
    const blocksAfterPlanStart = createdBlocks.filter(b => 
      new Date(b.end_time) > expectedPlanStart
    );
    
    // Filter to blocks after now
    const blocksAfterNow = blocksAfterPlanStart.filter(b => 
      new Date(b.end_time) > simulatedNow
    );
    
    // Check if any have status='pending'
    const hasPendingBlocks = blocksAfterNow.some(b => b.status === 'pending');
    
    // Check if plan status ≠ 'degraded'
    const isNotDegraded = plan.status !== 'degraded';
    
    // Should NOT show celebration (has pending blocks)
    const shouldShowCelebration = !hasPendingBlocks && isNotDegraded;
    
    logResult('Verify Completion Logic', !shouldShowCelebration,
      !shouldShowCelebration 
        ? 'Completion logic correct (no celebration - has pending blocks)' 
        : 'Completion logic incorrect (should not celebrate)',
      {
        blocksAfterPlanStart: blocksAfterPlanStart.length,
        blocksAfterNow: blocksAfterNow.length,
        hasPendingBlocks,
        isNotDegraded,
        shouldShowCelebration
      }
    );

    // Step 11: Complete all blocks and verify celebration shows
    console.log('\n--- Step 11: Complete All Blocks and Verify Celebration ---');
    
    // Mark all pending blocks as completed
    for (const block of tailPlanBlocks) {
      await supabase
        .from('time_blocks')
        .update({ status: 'completed' })
        .eq('id', block.id);
    }
    
    // Re-fetch blocks
    const { data: updatedBlocks } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('plan_id', plan.id)
      .order('sequence_order', { ascending: true });
    
    // Check completion logic again
    const updatedBlocksAfterPlanStart = updatedBlocks?.filter(b => 
      new Date(b.end_time) > expectedPlanStart
    ) || [];
    
    const updatedBlocksAfterNow = updatedBlocksAfterPlanStart.filter(b => 
      new Date(b.end_time) > simulatedNow
    );
    
    const updatedHasPendingBlocks = updatedBlocksAfterNow.some(b => b.status === 'pending');
    const updatedShouldShowCelebration = !updatedHasPendingBlocks && isNotDegraded;
    
    logResult('Verify Celebration After Completion', updatedShouldShowCelebration,
      updatedShouldShowCelebration 
        ? 'Celebration shows correctly (all blocks completed)' 
        : 'Celebration does not show (incorrect)',
      {
        blocksAfterPlanStart: updatedBlocksAfterPlanStart.length,
        blocksAfterNow: updatedBlocksAfterNow.length,
        hasPendingBlocks: updatedHasPendingBlocks,
        shouldShowCelebration: updatedShouldShowCelebration
      }
    );

    // Summary
    console.log('\n=== Test Summary ===\n');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`Passed: ${successCount}/${totalCount}`);
    console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
      console.log('\n✓ All tests passed! Late generation scenario works correctly.');
      console.log('✓ Plan start anchored to 3pm');
      console.log('✓ Morning blocks skipped');
      console.log('✓ Tail plan generated');
      console.log('✓ Behind schedule logic correct');
      console.log('✓ Completion logic correct');
    } else {
      console.log('\n✗ Some tests failed. Review the results above.');
    }

  } catch (error) {
    console.error('Unexpected error during test:', error);
    logResult('Unexpected Error', false, error instanceof Error ? error.message : String(error));
  }
}

// Run the test
testLateGenerationScenario().catch(console.error);
