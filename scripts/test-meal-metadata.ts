// Test script to verify meal placement metadata
// This script tests that metadata is properly stored and retrieved

import { createClient } from '@supabase/supabase-js';
import type { TimeBlock } from '../src/types/daily-plan';

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMealMetadata() {
  console.log('=== Testing Meal Placement Metadata ===\n');

  // Get the most recent plan
  const { data: plans, error: plansError } = await supabase
    .from('daily_plans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (plansError) {
    console.error('Error fetching plans:', plansError);
    return;
  }

  if (!plans || plans.length === 0) {
    console.log('No plans found. Generate a plan first.');
    return;
  }

  const plan = plans[0];
  console.log(`Testing plan: ${plan.id}`);
  console.log(`Plan date: ${plan.plan_date}`);
  console.log(`Wake time: ${plan.wake_time}`);
  console.log(`Sleep time: ${plan.sleep_time}\n`);

  // Get time blocks for this plan
  const { data: blocks, error: blocksError } = await supabase
    .from('time_blocks')
    .select('*')
    .eq('plan_id', plan.id)
    .order('sequence_order', { ascending: true });

  if (blocksError) {
    console.error('Error fetching blocks:', blocksError);
    return;
  }

  if (!blocks || blocks.length === 0) {
    console.log('No time blocks found.');
    return;
  }

  // Filter meal blocks
  const mealBlocks = blocks.filter(b => b.activity_type === 'meal');
  
  console.log(`Found ${mealBlocks.length} meal blocks:\n`);

  for (const block of mealBlocks) {
    console.log(`${block.activity_name}:`);
    console.log(`  Start: ${new Date(block.start_time).toLocaleTimeString()}`);
    console.log(`  End: ${new Date(block.end_time).toLocaleTimeString()}`);
    console.log(`  Status: ${block.status}`);
    
    if (block.metadata) {
      console.log(`  Metadata:`);
      if (block.metadata.target_time) {
        console.log(`    - Target time: ${new Date(block.metadata.target_time).toLocaleTimeString()}`);
      }
      if (block.metadata.placement_reason) {
        console.log(`    - Placement reason: ${block.metadata.placement_reason}`);
      }
      if (block.metadata.skip_reason) {
        console.log(`    - Skip reason: ${block.metadata.skip_reason}`);
      }
    } else {
      console.log(`  Metadata: None (this is unexpected for V1.2)`);
    }
    
    console.log('');
  }

  // Check for skipped meals
  const skippedMeals = blocks.filter(
    b => b.activity_type === 'meal' && b.status === 'skipped'
  );

  if (skippedMeals.length > 0) {
    console.log(`\nSkipped meals: ${skippedMeals.length}`);
    for (const meal of skippedMeals) {
      console.log(`  - ${meal.activity_name}: ${meal.skip_reason}`);
      if (meal.metadata?.skip_reason) {
        console.log(`    Metadata skip reason: ${meal.metadata.skip_reason}`);
      }
    }
  }

  // Verify metadata structure
  console.log('\n=== Metadata Verification ===');
  let metadataCount = 0;
  let targetTimeCount = 0;
  let placementReasonCount = 0;

  for (const block of mealBlocks) {
    if (block.metadata) {
      metadataCount++;
      if (block.metadata.target_time) targetTimeCount++;
      if (block.metadata.placement_reason) placementReasonCount++;
    }
  }

  console.log(`Meal blocks with metadata: ${metadataCount}/${mealBlocks.length}`);
  console.log(`Blocks with target_time: ${targetTimeCount}/${mealBlocks.length}`);
  console.log(`Blocks with placement_reason: ${placementReasonCount}/${mealBlocks.length}`);

  if (metadataCount === mealBlocks.length && 
      targetTimeCount === mealBlocks.length && 
      placementReasonCount === mealBlocks.length) {
    console.log('\n✅ All meal blocks have complete metadata!');
  } else {
    console.log('\n⚠️  Some meal blocks are missing metadata');
  }
}

testMealMetadata().catch(console.error);
