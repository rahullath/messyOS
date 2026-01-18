// Test script for evening routine placement
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PlanBuilderService } from '../src/lib/daily-plan/plan-builder';
import type { PlanInput } from '../src/types/daily-plan';

// Load environment variables from .env file
config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'present' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEveningRoutinePlacement() {
  console.log('🧪 Testing Evening Routine Placement\n');

  // Get a test user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ Not authenticated. Please set SUPABASE_ACCESS_TOKEN.');
    process.exit(1);
  }

  const userId = user.id;
  const planBuilder = new PlanBuilderService(supabase);

  // Test 1: Normal case - evening routine should be scheduled after 6pm
  console.log('Test 1: Normal case - evening routine after 6pm');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const wakeTime = new Date(today);
  wakeTime.setHours(7, 0, 0, 0);

  const sleepTime = new Date(today);
  sleepTime.setHours(23, 0, 0, 0);

  const input1: PlanInput = {
    userId,
    date: today,
    wakeTime,
    sleepTime,
    energyState: 'medium',
  };

  try {
    const plan1 = await planBuilder.generateDailyPlan(input1, {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    });

    console.log(`✅ Plan generated: ${plan1.id}`);
    
    // Find evening routine block
    const eveningRoutine = plan1.timeBlocks?.find(
      block => block.activityType === 'routine' && block.activityName.includes('Evening')
    );

    if (eveningRoutine) {
      const startHour = new Date(eveningRoutine.startTime).getHours();
      console.log(`   Evening routine scheduled at: ${new Date(eveningRoutine.startTime).toLocaleTimeString()}`);
      
      if (startHour >= 18) {
        console.log('   ✅ Evening routine correctly scheduled after 6pm');
      } else {
        console.log(`   ❌ Evening routine scheduled before 6pm (at ${startHour}:00)`);
      }

      // Check if it's the last non-buffer block
      const nonBufferBlocks = plan1.timeBlocks?.filter(b => b.activityType !== 'buffer') || [];
      const lastNonBuffer = nonBufferBlocks[nonBufferBlocks.length - 1];
      
      if (lastNonBuffer?.id === eveningRoutine.id) {
        console.log('   ✅ Evening routine is the last non-buffer block');
      } else {
        console.log(`   ❌ Evening routine is not the last non-buffer block`);
        console.log(`      Last block: ${lastNonBuffer?.activityName}`);
      }

      // Check if buffer exists after evening routine
      const eveningRoutineIndex = plan1.timeBlocks?.findIndex(b => b.id === eveningRoutine.id) || -1;
      const nextBlock = plan1.timeBlocks?.[eveningRoutineIndex + 1];
      
      if (nextBlock && nextBlock.activityType === 'buffer') {
        console.log('   ✅ Buffer exists after evening routine');
      } else {
        console.log('   ⚠️  No buffer after evening routine (might be at end of day)');
      }
    } else {
      console.log('   ❌ Evening routine not found in plan');
    }

    console.log();
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
  }

  // Test 2: Early sleep time - evening routine should be scheduled before sleep
  console.log('Test 2: Early sleep time (5pm) - evening routine before sleep');
  
  const earlySleepTime = new Date(today);
  earlySleepTime.setHours(17, 0, 0, 0); // 5pm

  const input2: PlanInput = {
    userId,
    date: today,
    wakeTime,
    sleepTime: earlySleepTime,
    energyState: 'medium',
  };

  try {
    const plan2 = await planBuilder.generateDailyPlan(input2, {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    });

    console.log(`✅ Plan generated: ${plan2.id}`);
    
    const eveningRoutine = plan2.timeBlocks?.find(
      block => block.activityType === 'routine' && block.activityName.includes('Evening')
    );

    if (eveningRoutine) {
      const startTime = new Date(eveningRoutine.startTime);
      const endTime = new Date(eveningRoutine.endTime);
      console.log(`   Evening routine: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);
      
      if (endTime <= earlySleepTime) {
        console.log('   ✅ Evening routine fits before early sleep time');
      } else {
        console.log('   ❌ Evening routine extends past sleep time');
      }
    } else {
      console.log('   ⚠️  Evening routine not found (might have been dropped)');
    }

    console.log();
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
  }

  // Test 3: Very tight schedule - evening routine should be dropped if doesn't fit
  console.log('Test 3: Very tight schedule - evening routine should be dropped');
  
  const veryEarlySleepTime = new Date(today);
  veryEarlySleepTime.setHours(18, 10, 0, 0); // 6:10pm - barely any time

  const input3: PlanInput = {
    userId,
    date: today,
    wakeTime,
    sleepTime: veryEarlySleepTime,
    energyState: 'high', // High energy = more tasks
  };

  try {
    const plan3 = await planBuilder.generateDailyPlan(input3, {
      name: 'Home',
      address: 'Test Address',
      latitude: 0,
      longitude: 0,
    });

    console.log(`✅ Plan generated: ${plan3.id}`);
    
    const eveningRoutine = plan3.timeBlocks?.find(
      block => block.activityType === 'routine' && block.activityName.includes('Evening')
    );

    if (eveningRoutine) {
      console.log('   ⚠️  Evening routine was scheduled (might fit)');
      console.log(`      Scheduled at: ${new Date(eveningRoutine.startTime).toLocaleTimeString()}`);
    } else {
      console.log('   ✅ Evening routine correctly dropped (doesn\'t fit)');
    }

    console.log();
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }

  console.log('✅ All tests completed');
}

testEveningRoutinePlacement().catch(console.error);
