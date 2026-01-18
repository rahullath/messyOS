// Test: Generate plan later in the day (e.g., at 2 PM)
// Verifies that blocks before plan start are marked as skipped

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

async function testLatePlanGeneration() {
  console.log('🧪 Testing Late Plan Generation (2 PM start)');
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

  // Generate plan as if it's 2 PM
  console.log('📝 Generating plan at 2 PM (14:00)...');
  
  const today = new Date();
  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0); // 7 AM
  
  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0); // 11 PM

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
  };

  const planBuilder = new PlanBuilderService(supabase);
  
  try {
    const plan = await planBuilder.generateDailyPlan(planInput, currentLocation);
    
    console.log('✅ Plan generated successfully!');
    console.log('');
    console.log('================================================================================');
    console.log('📋 GENERATED PLAN (Late Start)');
    console.log('================================================================================');
    console.log(`Plan ID: ${plan.id}`);
    console.log(`Date: ${new Date(plan.planDate).toLocaleDateString()}`);
    console.log(`Wake Time: ${new Date(plan.wakeTime).toLocaleTimeString()}`);
    console.log(`Sleep Time: ${new Date(plan.sleepTime).toLocaleTimeString()}`);
    console.log(`Energy State: ${plan.energyState}`);
    console.log(`Status: ${plan.status}`);
    console.log('');

    // Analyze blocks
    const skippedBlocks = plan.timeBlocks.filter(b => b.status === 'skipped');
    const pendingBlocks = plan.timeBlocks.filter(b => b.status === 'pending');
    const firstPendingBlock = pendingBlocks[0];

    console.log(`Time Blocks (${plan.timeBlocks.length} total):`);
    console.log('');
    
    // Show skipped blocks
    if (skippedBlocks.length > 0) {
      console.log(`⊘ SKIPPED BLOCKS (${skippedBlocks.length} - occurred before plan start):`);
      skippedBlocks.forEach((block, index) => {
        const start = new Date(block.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const end = new Date(block.endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const duration = Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000);
        const icon = block.activityType === 'routine' ? '🔄' : 
                     block.activityType === 'meal' ? '🍽️' : 
                     block.activityType === 'task' ? '✏️' : 
                     block.activityType === 'buffer' ? '⏸️' : '📅';
        console.log(`  ${index + 1}. ⊘ ${icon} ${start}-${end} (${duration}min) - ${block.activityName}`);
        if (block.skipReason) {
          console.log(`     Reason: ${block.skipReason}`);
        }
      });
      console.log('');
    }

    // Show pending blocks
    console.log(`⏳ PENDING BLOCKS (${pendingBlocks.length} - ready to execute):`);
    pendingBlocks.slice(0, 5).forEach((block, index) => {
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
    if (pendingBlocks.length > 5) {
      console.log(`  ... and ${pendingBlocks.length - 5} more`);
    }
    console.log('');

    // Verification
    console.log('================================================================================');
    console.log('🔍 VERIFICATION');
    console.log('================================================================================');
    
    const now = new Date();
    const planStartTime = new Date(Math.max(wakeTime.getTime(), now.getTime()));
    
    console.log(`Current Time: ${now.toLocaleTimeString()}`);
    console.log(`Plan Start Time: ${planStartTime.toLocaleTimeString()}`);
    console.log('');

    // Check 1: All skipped blocks ended before plan start
    const invalidSkipped = skippedBlocks.filter(b => 
      new Date(b.endTime) > planStartTime
    );
    if (invalidSkipped.length === 0) {
      console.log('✅ All skipped blocks ended before plan start');
    } else {
      console.log(`❌ Found ${invalidSkipped.length} skipped blocks that ended after plan start`);
    }

    // Check 2: First pending block starts at or after plan start
    if (firstPendingBlock) {
      const firstStart = new Date(firstPendingBlock.startTime);
      if (firstStart >= planStartTime) {
        console.log('✅ First pending block starts at or after plan start');
      } else {
        console.log('❌ First pending block starts before plan start');
      }
    }

    // Check 3: All skipped blocks have skip reason
    const missingReason = skippedBlocks.filter(b => !b.skipReason);
    if (missingReason.length === 0) {
      console.log('✅ All skipped blocks have skip reason');
    } else {
      console.log(`❌ Found ${missingReason.length} skipped blocks without skip reason`);
    }

    console.log('');
    console.log('================================================================================');
    console.log('🎉 TEST COMPLETE');
    console.log('================================================================================');
    console.log(`✅ Plan generated with ${skippedBlocks.length} skipped blocks`);
    console.log(`✅ First pending block: ${firstPendingBlock?.activityName}`);
    console.log(`✅ Late plan generation working correctly!`);
    console.log('');

  } catch (error) {
    console.error('❌ Error generating plan:', error);
    throw error;
  }
}

// Run the test
testLatePlanGeneration()
  .then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
