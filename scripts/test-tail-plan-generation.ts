// Test: Generate plan very late in the day (e.g., at 8 PM)
// Verifies that tail plan is generated when no blocks exist after plan start

import { createClient } from '@supabase/supabase-js';
import { PlanBuilderService } from '../src/lib/daily-plan/plan-builder';
import type { PlanInput } from '../src/types/daily-plan';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://mdhtpjpwwbuepsytgrva.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user ID (replace with your actual user ID)
const TEST_USER_ID = '70429eba-f32e-47ab-bfcb-a75e2f819de4';

async function testTailPlanGeneration() {
  console.log('🧪 Testing Tail Plan Generation (8 PM start)');
  console.log('User ID:', TEST_USER_ID);
  console.log('');

  // Clean up existing plans
  console.log('🧹 Cleaning up existing plans...');
  const { error: deleteError } = await supabase
    .from('daily_plans')
    .delete()
    .eq('user_id', TEST_USER_ID)
    .eq('plan_date', new Date().toISOString().split('T')[0]);

  if (deleteError) {
    console.error('❌ Error cleaning up:', deleteError);
  } else {
    console.log('✅ Cleanup complete');
  }
  console.log('');

  // Generate plan as if it's 8 PM (20:00)
  console.log('📝 Generating plan at 8 PM (20:00)...');
  
  const today = new Date();
  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0); // 7 AM
  
  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0); // 11 PM

  // Simulate current time being 8 PM
  const simulatedNow = new Date(today);
  simulatedNow.setHours(20, 0, 0, 0);

  const planInput: PlanInput = {
    userId: TEST_USER_ID,
    date: today,
    wakeTime,
    sleepTime,
    energyState: 'medium',
  };

  const currentLocation = {
    name: 'Five Ways Station',
    address: 'Five Ways, Birmingham',
    latitude: 52.4736,
    longitude: -1.9269,
    coordinates: { latitude: 52.4736, longitude: -1.9269 },
    type: 'station' as const,
  };

  const planBuilder = new PlanBuilderService(supabase);
  
  try {
    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);
    
    console.log('✅ Plan generated successfully!');
    console.log('');
    console.log('================================================================================');
    console.log('📋 GENERATED PLAN (Tail Plan)');
    console.log('================================================================================');
    console.log(`Plan ID: ${plan.id}`);
    console.log(`Date: ${new Date(plan.planDate).toLocaleDateString()}`);
    console.log(`Wake Time: ${new Date(plan.wakeTime).toLocaleTimeString()}`);
    console.log(`Sleep Time: ${new Date(plan.sleepTime).toLocaleTimeString()}`);
    console.log(`Plan Start: ${new Date(plan.planStart).toLocaleTimeString()}`);
    console.log(`Energy State: ${plan.energyState}`);
    console.log(`Status: ${plan.status}`);
    console.log(`Generated After Now: ${plan.generatedAfterNow}`);
    console.log('');

    if (!plan.timeBlocks) {
      console.error('❌ No time blocks found in plan');
      return;
    }

    // Analyze blocks
    const skippedBlocks = plan.timeBlocks.filter(b => b.status === 'skipped');
    const pendingBlocks = plan.timeBlocks.filter(b => b.status === 'pending');

    console.log(`Time Blocks (${plan.timeBlocks.length} total):`);
    console.log('');
    
    // Show skipped blocks
    if (skippedBlocks.length > 0) {
      console.log(`⊘ SKIPPED BLOCKS (${skippedBlocks.length} - occurred before plan start):`);
      skippedBlocks.slice(0, 5).forEach((block, index) => {
        const start = new Date(block.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const end = new Date(block.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const duration = Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000);
        const icon = block.activityType === 'routine' ? '🔄' : 
                     block.activityType === 'meal' ? '🍽️' : 
                     block.activityType === 'task' ? '✏️' : 
                     block.activityType === 'buffer' ? '⏸️' : '📅';
        console.log(`  ${index + 1}. ⊘ ${icon} ${start}-${end} (${duration}min) - ${block.activityName}`);
      });
      if (skippedBlocks.length > 5) {
        console.log(`  ... and ${skippedBlocks.length - 5} more`);
      }
      console.log('');
    }

    // Show pending blocks (tail plan)
    console.log(`⏳ PENDING BLOCKS (${pendingBlocks.length} - tail plan):`);
    pendingBlocks.forEach((block, index) => {
      const start = new Date(block.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(block.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const duration = Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000);
      const icon = block.activityType === 'routine' ? '🔄' : 
                   block.activityType === 'meal' ? '🍽️' : 
                   block.activityType === 'task' ? '✏️' : 
                   block.activityType === 'buffer' ? '⏸️' : '📅';
      const isCurrent = index === 0 ? ' ← CURRENT' : '';
      console.log(`  ${index + 1}. ⏳ ${icon} ${start}-${end} (${duration}min) - ${block.activityName}${isCurrent}`);
    });
    console.log('');

    // Verification
    console.log('================================================================================');
    console.log('🔍 VERIFICATION');
    console.log('================================================================================');
    
    // Check 1: Tail plan contains expected blocks
    const resetBlock = pendingBlocks.find(b => b.activityName === 'Reset/Admin');
    const focusBlock = pendingBlocks.find(b => b.activityName === 'Primary Focus Block');
    const dinnerBlock = pendingBlocks.find(b => b.activityName === 'Dinner');
    const eveningBlock = pendingBlocks.find(b => b.activityName === 'Evening Routine');

    if (resetBlock) {
      console.log('✅ Reset/Admin block found (10 min)');
    } else {
      console.log('❌ Reset/Admin block missing');
    }

    if (focusBlock) {
      console.log('✅ Primary Focus Block found (60 min)');
    } else {
      console.log('⚠️  Primary Focus Block missing (expected for medium/high energy)');
    }

    if (dinnerBlock) {
      console.log('✅ Dinner block found (45 min)');
    } else {
      console.log('❌ Dinner block missing');
    }

    if (eveningBlock) {
      console.log('✅ Evening Routine block found (20 min)');
    } else {
      console.log('❌ Evening Routine block missing');
    }

    // Check 2: All blocks have 5-minute buffers between them
    const nonBufferBlocks = pendingBlocks.filter(b => b.activityType !== 'buffer');
    let buffersCorrect = true;
    for (let i = 0; i < nonBufferBlocks.length - 1; i++) {
      const currentBlock = nonBufferBlocks[i];
      const nextBlock = nonBufferBlocks[i + 1];
      const gap = (new Date(nextBlock.startTime).getTime() - new Date(currentBlock.endTime).getTime()) / 60000;
      if (gap !== 5) {
        console.log(`❌ Gap between ${currentBlock.activityName} and ${nextBlock.activityName} is ${gap} min (expected 5)`);
        buffersCorrect = false;
      }
    }
    if (buffersCorrect) {
      console.log('✅ All blocks have 5-minute buffers');
    }

    console.log('');
    console.log('================================================================================');
    console.log('🎉 TEST COMPLETE');
    console.log('================================================================================');
    console.log(`✅ Tail plan generated with ${pendingBlocks.length} blocks`);
    console.log(`✅ All skipped blocks before plan start: ${skippedBlocks.length}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error generating plan:', error);
    throw error;
  }
}

// Run the test
testTailPlanGeneration()
  .then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
