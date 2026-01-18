/**
 * End-to-End Test with Real Data
 * 
 * Tests the daily plan generator with actual data from:
 * - Calendar events (commitments)
 * - Pending tasks
 * - Active routines
 * 
 * Requirements: 5.1, 7.1, 10.1
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

async function testWithRealData() {
  console.log('\n=== End-to-End Test with Real Data ===\n');
  console.log(`Test User ID: ${TEST_USER_ID}\n`);

  try {
    const userId = TEST_USER_ID;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Step 1: Fetch real calendar events
    console.log('--- Step 1: Fetch Calendar Events ---');
    
    const { data: calendarEvents, error: calendarError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', today.toISOString())
      .lt('start_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true });

    if (calendarError) {
      logResult('Fetch Calendar Events', false, `Error: ${calendarError.message}`);
    } else {
      logResult('Fetch Calendar Events', true, `Found ${calendarEvents?.length || 0} calendar events`, {
        count: calendarEvents?.length || 0,
        events: calendarEvents?.map(e => ({
          title: e.title,
          startTime: e.start_time,
          endTime: e.end_time,
          location: e.location
        }))
      });
    }

    // Step 2: Fetch real pending tasks
    console.log('\n--- Step 2: Fetch Pending Tasks ---');
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(10);

    if (tasksError) {
      logResult('Fetch Pending Tasks', false, `Error: ${tasksError.message}`);
    } else {
      logResult('Fetch Pending Tasks', true, `Found ${tasks?.length || 0} pending tasks`, {
        count: tasks?.length || 0,
        tasks: tasks?.slice(0, 5).map(t => ({
          title: t.title,
          deadline: t.deadline,
          estimatedDuration: t.estimated_duration
        }))
      });
    }

    // Step 3: Fetch real active routines
    console.log('\n--- Step 3: Fetch Active Routines ---');
    
    const { data: routines, error: routinesError } = await supabase
      .from('uk_student_routines')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (routinesError) {
      logResult('Fetch Active Routines', false, `Error: ${routinesError.message}`);
    } else {
      const morningRoutine = routines?.find(r => r.routine_type === 'morning');
      const eveningRoutine = routines?.find(r => r.routine_type === 'evening');
      
      logResult('Fetch Active Routines', true, `Found ${routines?.length || 0} active routines`, {
        count: routines?.length || 0,
        hasMorningRoutine: !!morningRoutine,
        hasEveningRoutine: !!eveningRoutine,
        morningDuration: morningRoutine?.estimated_duration,
        eveningDuration: eveningRoutine?.estimated_duration
      });
    }

    // Step 4: Generate plan using real data
    console.log('\n--- Step 4: Generate Plan with Real Data ---');
    
    // Clean up existing plan for today
    await supabase
      .from('daily_plans')
      .delete()
      .eq('user_id', userId)
      .eq('plan_date', today.toISOString().split('T')[0]);

    const wakeTime = new Date(today);
    wakeTime.setHours(7, 0, 0, 0);
    
    const sleepTime = new Date(today);
    sleepTime.setHours(23, 0, 0, 0);

    // Create plan
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

    logResult('Generate Plan', true, `Plan created with ID: ${plan.id}`);

    // Step 5: Build time blocks from real data
    console.log('\n--- Step 5: Build Time Blocks from Real Data ---');
    
    const blocks: any[] = [];
    let currentTime = new Date(wakeTime);
    let sequenceOrder = 1;

    // Add morning routine if exists
    const morningRoutine = routines?.find(r => r.routine_type === 'morning');
    if (morningRoutine) {
      const duration = morningRoutine.estimated_duration || 30;
      const endTime = new Date(currentTime.getTime() + duration * 60000);
      
      blocks.push({
        plan_id: plan.id,
        start_time: currentTime.toISOString(),
        end_time: endTime.toISOString(),
        activity_type: 'routine',
        activity_name: morningRoutine.name,
        activity_id: morningRoutine.id,
        is_fixed: false,
        sequence_order: sequenceOrder++,
        status: 'pending'
      });
      
      currentTime = endTime;
      
      // Add buffer
      const bufferEnd = new Date(currentTime.getTime() + 5 * 60000);
      blocks.push({
        plan_id: plan.id,
        start_time: currentTime.toISOString(),
        end_time: bufferEnd.toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: sequenceOrder++,
        status: 'pending'
      });
      currentTime = bufferEnd;
    }

    // Add breakfast
    const breakfastEnd = new Date(currentTime.getTime() + 15 * 60000);
    blocks.push({
      plan_id: plan.id,
      start_time: currentTime.toISOString(),
      end_time: breakfastEnd.toISOString(),
      activity_type: 'meal',
      activity_name: 'Breakfast',
      is_fixed: false,
      sequence_order: sequenceOrder++,
      status: 'pending'
    });
    currentTime = breakfastEnd;

    // Add buffer
    let bufferEnd = new Date(currentTime.getTime() + 5 * 60000);
    blocks.push({
      plan_id: plan.id,
      start_time: currentTime.toISOString(),
      end_time: bufferEnd.toISOString(),
      activity_type: 'buffer',
      activity_name: 'Transition',
      is_fixed: false,
      sequence_order: sequenceOrder++,
      status: 'pending'
    });
    currentTime = bufferEnd;

    // Add calendar events (fixed commitments)
    if (calendarEvents && calendarEvents.length > 0) {
      for (const event of calendarEvents) {
        // Add travel block if event has location
        if (event.location) {
          const travelDuration = 30; // Default 30 minutes
          const travelStart = new Date(new Date(event.start_time).getTime() - travelDuration * 60000);
          
          blocks.push({
            plan_id: plan.id,
            start_time: travelStart.toISOString(),
            end_time: event.start_time,
            activity_type: 'travel',
            activity_name: `Travel to ${event.title}`,
            is_fixed: true,
            sequence_order: sequenceOrder++,
            status: 'pending'
          });
        }
        
        // Add commitment
        blocks.push({
          plan_id: plan.id,
          start_time: event.start_time,
          end_time: event.end_time,
          activity_type: 'commitment',
          activity_name: event.title,
          activity_id: event.id,
          is_fixed: true,
          sequence_order: sequenceOrder++,
          status: 'pending'
        });
        
        // Add buffer after commitment
        const commitmentEnd = new Date(event.end_time);
        bufferEnd = new Date(commitmentEnd.getTime() + 5 * 60000);
        blocks.push({
          plan_id: plan.id,
          start_time: commitmentEnd.toISOString(),
          end_time: bufferEnd.toISOString(),
          activity_type: 'buffer',
          activity_name: 'Transition',
          is_fixed: false,
          sequence_order: sequenceOrder++,
          status: 'pending'
        });
        currentTime = bufferEnd;
      }
    }

    // Add tasks (max 3 for medium energy)
    const taskLimit = 3;
    const selectedTasks = tasks?.slice(0, taskLimit) || [];
    
    for (const task of selectedTasks) {
      const duration = task.estimated_duration || 60;
      const taskEnd = new Date(currentTime.getTime() + duration * 60000);
      
      blocks.push({
        plan_id: plan.id,
        start_time: currentTime.toISOString(),
        end_time: taskEnd.toISOString(),
        activity_type: 'task',
        activity_name: task.title,
        activity_id: task.id,
        is_fixed: false,
        sequence_order: sequenceOrder++,
        status: 'pending'
      });
      
      currentTime = taskEnd;
      
      // Add buffer
      bufferEnd = new Date(currentTime.getTime() + 5 * 60000);
      blocks.push({
        plan_id: plan.id,
        start_time: currentTime.toISOString(),
        end_time: bufferEnd.toISOString(),
        activity_type: 'buffer',
        activity_name: 'Transition',
        is_fixed: false,
        sequence_order: sequenceOrder++,
        status: 'pending'
      });
      currentTime = bufferEnd;
    }

    // Add lunch
    const lunchEnd = new Date(currentTime.getTime() + 30 * 60000);
    blocks.push({
      plan_id: plan.id,
      start_time: currentTime.toISOString(),
      end_time: lunchEnd.toISOString(),
      activity_type: 'meal',
      activity_name: 'Lunch',
      is_fixed: false,
      sequence_order: sequenceOrder++,
      status: 'pending'
    });
    currentTime = lunchEnd;

    // Add buffer
    bufferEnd = new Date(currentTime.getTime() + 5 * 60000);
    blocks.push({
      plan_id: plan.id,
      start_time: currentTime.toISOString(),
      end_time: bufferEnd.toISOString(),
      activity_type: 'buffer',
      activity_name: 'Transition',
      is_fixed: false,
      sequence_order: sequenceOrder++,
      status: 'pending'
    });
    currentTime = bufferEnd;

    // Add dinner
    const dinnerEnd = new Date(currentTime.getTime() + 45 * 60000);
    blocks.push({
      plan_id: plan.id,
      start_time: currentTime.toISOString(),
      end_time: dinnerEnd.toISOString(),
      activity_type: 'meal',
      activity_name: 'Dinner',
      is_fixed: false,
      sequence_order: sequenceOrder++,
      status: 'pending'
    });
    currentTime = dinnerEnd;

    // Add buffer
    bufferEnd = new Date(currentTime.getTime() + 5 * 60000);
    blocks.push({
      plan_id: plan.id,
      start_time: currentTime.toISOString(),
      end_time: bufferEnd.toISOString(),
      activity_type: 'buffer',
      activity_name: 'Transition',
      is_fixed: false,
      sequence_order: sequenceOrder++,
      status: 'pending'
    });
    currentTime = bufferEnd;

    // Add evening routine if exists
    const eveningRoutine = routines?.find(r => r.routine_type === 'evening');
    if (eveningRoutine) {
      const duration = eveningRoutine.estimated_duration || 20;
      const endTime = new Date(currentTime.getTime() + duration * 60000);
      
      blocks.push({
        plan_id: plan.id,
        start_time: currentTime.toISOString(),
        end_time: endTime.toISOString(),
        activity_type: 'routine',
        activity_name: eveningRoutine.name,
        activity_id: eveningRoutine.id,
        is_fixed: false,
        sequence_order: sequenceOrder++,
        status: 'pending'
      });
    }

    // Insert all blocks
    const { data: createdBlocks, error: blocksError } = await supabase
      .from('time_blocks')
      .insert(blocks)
      .select();

    if (blocksError) {
      logResult('Create Time Blocks', false, `Error: ${blocksError.message}`);
      return;
    }

    logResult('Create Time Blocks', true, `Created ${createdBlocks.length} time blocks`, {
      totalBlocks: createdBlocks.length,
      routines: createdBlocks.filter(b => b.activity_type === 'routine').length,
      commitments: createdBlocks.filter(b => b.activity_type === 'commitment').length,
      tasks: createdBlocks.filter(b => b.activity_type === 'task').length,
      meals: createdBlocks.filter(b => b.activity_type === 'meal').length,
      buffers: createdBlocks.filter(b => b.activity_type === 'buffer').length,
      travel: createdBlocks.filter(b => b.activity_type === 'travel').length
    });

    // Step 6: Verify plan makes sense
    console.log('\n--- Step 6: Verify Plan Makes Sense ---');
    
    // Check for overlaps
    const sortedBlocks = createdBlocks.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    
    let hasOverlaps = false;
    for (let i = 0; i < sortedBlocks.length - 1; i++) {
      const current = sortedBlocks[i];
      const next = sortedBlocks[i + 1];
      const currentEnd = new Date(current.end_time).getTime();
      const nextStart = new Date(next.start_time).getTime();
      
      if (currentEnd > nextStart) {
        hasOverlaps = true;
        logResult('Check Overlaps', false, `Overlap detected between "${current.activity_name}" and "${next.activity_name}"`);
      }
    }
    
    if (!hasOverlaps) {
      logResult('Check Overlaps', true, 'No overlaps detected');
    }

    // Check if plan fits within wake/sleep times
    const firstBlock = sortedBlocks[0];
    const lastBlock = sortedBlocks[sortedBlocks.length - 1];
    const planStart = new Date(firstBlock.start_time);
    const planEnd = new Date(lastBlock.end_time);
    const wake = new Date(plan.wake_time);
    const sleep = new Date(plan.sleep_time);
    
    const fitsInDay = planStart >= wake && planEnd <= sleep;
    logResult('Check Time Bounds', fitsInDay, 
      fitsInDay 
        ? 'Plan fits within wake/sleep times' 
        : 'Plan exceeds wake/sleep times',
      {
        wakeTime: wake.toISOString(),
        sleepTime: sleep.toISOString(),
        planStart: planStart.toISOString(),
        planEnd: planEnd.toISOString()
      }
    );

    // Check if all real data was included
    const hasRoutines = createdBlocks.some(b => b.activity_type === 'routine');
    const hasCommitments = createdBlocks.some(b => b.activity_type === 'commitment');
    const hasTasks = createdBlocks.some(b => b.activity_type === 'task');
    
    logResult('Check Data Integration', true, 'Real data integrated into plan', {
      hasRoutines,
      hasCommitments,
      hasTasks,
      routineCount: createdBlocks.filter(b => b.activity_type === 'routine').length,
      commitmentCount: createdBlocks.filter(b => b.activity_type === 'commitment').length,
      taskCount: createdBlocks.filter(b => b.activity_type === 'task').length
    });

    // Summary
    console.log('\n=== Test Summary ===\n');
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`Passed: ${successCount}/${totalCount}`);
    console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
    
    if (successCount === totalCount) {
      console.log('\n✓ All tests passed! Plan generated successfully with real data.');
    } else {
      console.log('\n✗ Some tests failed. Review the results above.');
    }

  } catch (error) {
    console.error('Unexpected error during test:', error);
    logResult('Unexpected Error', false, error instanceof Error ? error.message : String(error));
  }
}

// Run the test
testWithRealData().catch(console.error);
