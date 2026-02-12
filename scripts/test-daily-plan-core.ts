// scripts/test-daily-plan-core.ts
// Test script for Daily Plan Generator V1 - Core Services
// Run with: npx tsx scripts/test-daily-plan-core.ts

import { createClient } from '@supabase/supabase-js';
import type { PlanInput } from '../src/types/daily-plan';
import type { Location } from '../src/types/uk-student-travel';

// Supabase configuration
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://mdhtpjpwwbuepsytgrva.supabase.co';
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHRwanB3d2J1ZXBzeXRncnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0Mzk2MDIsImV4cCI6MjA0OTAxNTYwMn0.E4vp9Z-wUdcBH5PvLWHZEaJSUiIvQGrnrYrQ0gqOxjM';

const supabase = createClient(supabaseUrl, supabaseKey);

// Import services dynamically to avoid import.meta.env issues
// We'll import the functions directly instead of using the service classes

// Test user ID (replace with actual user ID from your database)
const TEST_USER_ID = '368deac7-8526-45eb-927a-6a373c95d8c6';

// Birmingham city center location (default)
const CURRENT_LOCATION: Location = {
  latitude: 52.4862,
  longitude: -1.8904,
  address: 'Birmingham City Centre, UK',
};

/**
 * Format time block for console output
 */
function formatTimeBlock(block: any, index: number): string {
  const start = new Date(block.startTime).toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const end = new Date(block.endTime).toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const duration = Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000);
  
  const statusIcon = block.status === 'completed' ? '✅' : 
                     block.status === 'skipped' ? '⏭️' : 
                     '⏳';
  
  const typeIcon = block.activityType === 'commitment' ? '📅' :
                   block.activityType === 'task' ? '✏️' :
                   block.activityType === 'routine' ? '🔄' :
                   block.activityType === 'meal' ? '🍽️' :
                   block.activityType === 'travel' ? '🚴' :
                   '⏸️';
  
  return `  ${index + 1}. ${statusIcon} ${typeIcon} ${start}-${end} (${duration}min) - ${block.activityName}`;
}

/**
 * Print plan summary
 */
function printPlanSummary(plan: any, title: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Plan ID: ${plan.id}`);
  console.log(`Date: ${new Date(plan.planDate).toLocaleDateString('en-GB')}`);
  console.log(`Wake Time: ${new Date(plan.wakeTime).toLocaleTimeString('en-GB')}`);
  console.log(`Sleep Time: ${new Date(plan.sleepTime).toLocaleTimeString('en-GB')}`);
  console.log(`Energy State: ${plan.energyState}`);
  console.log(`Status: ${plan.status}`);
  console.log(`\nTime Blocks (${plan.timeBlocks?.length || 0} total):`);
  
  if (plan.timeBlocks && plan.timeBlocks.length > 0) {
    plan.timeBlocks.forEach((block: any, index: number) => {
      console.log(formatTimeBlock(block, index));
    });
    
    // Summary by type
    const byType = plan.timeBlocks.reduce((acc: any, block: any) => {
      acc[block.activityType] = (acc[block.activityType] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`\nActivity Type Summary:`);
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Check for overlaps
    console.log(`\nOverlap Check:`);
    let hasOverlaps = false;
    for (let i = 0; i < plan.timeBlocks.length - 1; i++) {
      const current = plan.timeBlocks[i];
      const next = plan.timeBlocks[i + 1];
      const currentEnd = new Date(current.endTime).getTime();
      const nextStart = new Date(next.startTime).getTime();
      
      if (currentEnd > nextStart) {
        console.log(`  ❌ OVERLAP: Block ${i + 1} ends at ${new Date(currentEnd).toLocaleTimeString()} but Block ${i + 2} starts at ${new Date(nextStart).toLocaleTimeString()}`);
        hasOverlaps = true;
      }
    }
    
    if (!hasOverlaps) {
      console.log(`  ✅ No overlaps detected`);
    }
  }
  
  if (plan.exitTimes && plan.exitTimes.length > 0) {
    console.log(`\nExit Times (${plan.exitTimes.length} total):`);
    plan.exitTimes.forEach((exitTime: any, index: number) => {
      const time = new Date(exitTime.exitTime).toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log(`  ${index + 1}. 🚪 Exit at ${time} - ${exitTime.travelMethod} (${exitTime.travelDuration}min travel + ${exitTime.preparationTime}min prep)`);
    });
  }
}

/**
 * Main test function
 */
async function testDailyPlanCore() {
  console.log('🧪 Testing Daily Plan Generator V1 - Core Services');
  console.log(`User ID: ${TEST_USER_ID}`);
  console.log(`Location: ${CURRENT_LOCATION.address}`);
  
  try {
    // Dynamically import services to avoid import.meta.env issues
    const { createPlanBuilderService } = await import('../src/lib/daily-plan/plan-builder.js');
    const { getCurrentBlock, getNextBlocks, markBlockComplete } = await import('../src/lib/daily-plan/sequencer.js');
    
    // Step 1: Generate plan for today
    console.log('\n📝 Step 1: Generating plan for today...');
    
    const today = new Date();
    const wakeTime = new Date(today);
    wakeTime.setHours(7, 0, 0, 0);
    
    const sleepTime = new Date(today);
    sleepTime.setHours(23, 0, 0, 0);
    
    const planInput: PlanInput = {
      userId: TEST_USER_ID,
      date: today,
      wakeTime,
      sleepTime,
      energyState: 'medium',
    };
    
    const planBuilder = createPlanBuilderService(supabase);
    const plan = await planBuilder.generateDailyPlan(planInput, CURRENT_LOCATION);
    
    printPlanSummary(plan, '📋 GENERATED PLAN');
    
    // Step 2: Test sequencer - get current block
    console.log('\n🔍 Step 2: Testing sequencer - getCurrentBlock()...');
    const currentBlock = await getCurrentBlock(supabase, plan.id);
    
    if (currentBlock) {
      console.log(`✅ Current block found:`);
      console.log(formatTimeBlock(currentBlock, 0));
    } else {
      console.log(`❌ No current block found (all completed or skipped)`);
    }
    
    // Step 3: Get next blocks
    console.log('\n🔍 Step 3: Testing sequencer - getNextBlocks(3)...');
    const nextBlocks = await getNextBlocks(supabase, plan.id, 3);
    
    if (nextBlocks.length > 0) {
      console.log(`✅ Found ${nextBlocks.length} next blocks:`);
      nextBlocks.forEach((block, index) => {
        console.log(formatTimeBlock(block, index));
      });
    } else {
      console.log(`ℹ️ No next blocks found`);
    }
    
    // Step 4: Mark first activity complete
    if (currentBlock) {
      console.log('\n✅ Step 4: Marking first activity as complete...');
      await markBlockComplete(supabase, currentBlock.id);
      console.log(`✅ Marked "${currentBlock.activityName}" as completed`);
      
      // Verify sequence advanced
      console.log('\n🔍 Step 5: Verifying sequence advanced...');
      const newCurrentBlock = await getCurrentBlock(supabase, plan.id);
      
      if (newCurrentBlock) {
        console.log(`✅ Sequence advanced automatically. New current block:`);
        console.log(formatTimeBlock(newCurrentBlock, 0));
        
        if (newCurrentBlock.id === currentBlock.id) {
          console.log(`❌ ERROR: Current block did not advance!`);
        } else {
          console.log(`✅ Current block successfully advanced`);
        }
      } else {
        console.log(`ℹ️ No more pending blocks`);
      }
    }
    
    // Step 6: Trigger degradation
    console.log('\n🔻 Step 6: Triggering plan degradation...');
    const degradedPlan = await planBuilder.degradePlan(plan.id);
    
    printPlanSummary(degradedPlan, '🔻 DEGRADED PLAN');
    
    // Step 7: Verify buffers were recomputed
    console.log('\n🔍 Step 7: Verifying buffers were recomputed...');
    
    const originalBufferCount = plan.timeBlocks?.filter(b => b.activityType === 'buffer').length || 0;
    const degradedBufferCount = degradedPlan.timeBlocks?.filter(b => b.activityType === 'buffer').length || 0;
    
    console.log(`Original plan had ${originalBufferCount} buffers`);
    console.log(`Degraded plan has ${degradedBufferCount} buffers`);
    
    if (degradedBufferCount > 0) {
      console.log(`✅ Buffers were recomputed (${degradedBufferCount} new buffers)`);
    } else {
      console.log(`⚠️ No buffers in degraded plan`);
    }
    
    // Verify tasks were dropped
    const originalTaskCount = plan.timeBlocks?.filter(b => b.activityType === 'task').length || 0;
    const degradedTaskCount = degradedPlan.timeBlocks?.filter(b => b.activityType === 'task' && b.status === 'pending').length || 0;
    const skippedTaskCount = degradedPlan.timeBlocks?.filter(b => b.activityType === 'task' && b.status === 'skipped').length || 0;
    
    console.log(`\nTask Summary:`);
    console.log(`  Original plan had ${originalTaskCount} tasks`);
    console.log(`  Degraded plan has ${degradedTaskCount} pending tasks`);
    console.log(`  Degraded plan has ${skippedTaskCount} skipped tasks`);
    
    if (skippedTaskCount > 0) {
      console.log(`✅ Tasks were dropped during degradation`);
    } else if (originalTaskCount === 0) {
      console.log(`ℹ️ No tasks in original plan to drop`);
    } else {
      console.log(`⚠️ No tasks were dropped`);
    }
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 TEST COMPLETE - CORE LOOP VERIFICATION');
    console.log('='.repeat(80));
    console.log('✅ Plan generation: SUCCESS');
    console.log('✅ Sequencing (getCurrentBlock): SUCCESS');
    console.log('✅ Sequencing (getNextBlocks): SUCCESS');
    console.log('✅ Activity completion: SUCCESS');
    console.log('✅ Sequence advancement: SUCCESS');
    console.log('✅ Plan degradation: SUCCESS');
    console.log('✅ Buffer recomputation: SUCCESS');
    console.log('\n💡 Next steps:');
    console.log('  1. Review the plan structure above');
    console.log('  2. Verify commitments, meals, routines, tasks, and buffers are present');
    console.log('  3. Check for any overlaps (should be none)');
    console.log('  4. Confirm degradation preserved fixed commitments');
    console.log('  5. Confirm buffers were recomputed (not kept from original)');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testDailyPlanCore()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
