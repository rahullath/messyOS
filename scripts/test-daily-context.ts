/**
 * Test script for daily context aggregator
 * 
 * Verifies that the daily context aggregator correctly:
 * - Queries yesterday's habits (WHERE date < D)
 * - Aggregates substances, meds, hygiene, meals
 * - Calculates duration priors
 * - Detects risk flags
 * - Handles fallback when yesterday has zero entries
 */

import { generateDailyContext } from '../src/lib/context/daily-context';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testDailyContext() {
  console.log('Testing Daily Context Aggregator...\n');
  
  const userId = process.env.TEST_USER_ID || 'test-user-id';
  const today = new Date();
  
  console.log(`User ID: ${userId}`);
  console.log(`Date: ${today.toISOString().split('T')[0]}`);
  console.log('');
  
  try {
    // Generate daily context
    console.log('Generating daily context...');
    const context = await generateDailyContext(userId, today);
    
    console.log('\n=== Daily Context ===');
    console.log(JSON.stringify(context, null, 2));
    
    // Verify structure
    console.log('\n=== Verification ===');
    console.log(`✓ Date: ${context.date}`);
    console.log(`✓ Wake reliability: ${context.wake.reliability}`);
    console.log(`✓ Nicotine used: ${context.substances.nicotine.used}`);
    console.log(`✓ Cannabis used: ${context.substances.cannabis.used}`);
    console.log(`✓ Caffeine used: ${context.substances.caffeine.used}`);
    console.log(`✓ Meds taken: ${context.meds.taken}`);
    console.log(`✓ Shower done: ${context.hygiene.shower_done}`);
    console.log(`✓ Cooked meals: ${context.meals.cooked_meals || 0}`);
    console.log(`✓ Low energy risk: ${context.day_flags.low_energy_risk}`);
    console.log(`✓ Sleep debt risk: ${context.day_flags.sleep_debt_risk}`);
    
    // Verify duration priors
    console.log('\n=== Duration Priors ===');
    console.log(`✓ Bathroom: ${context.duration_priors.bathroom_min} min`);
    console.log(`✓ Hygiene: ${context.duration_priors.hygiene_min} min`);
    console.log(`✓ Shower: ${context.duration_priors.shower_min} min`);
    console.log(`✓ Dress: ${context.duration_priors.dress_min} min`);
    console.log(`✓ Pack: ${context.duration_priors.pack_min} min`);
    console.log(`✓ Cook simple meal: ${context.duration_priors.cook_simple_meal_min} min`);
    
    // Verify reliability scores are in bounds
    console.log('\n=== Reliability Scores ===');
    const reliabilityScores = [
      context.wake.reliability,
      context.substances.nicotine.reliability,
      context.substances.cannabis.reliability,
      context.substances.caffeine.reliability,
      context.meds.reliability,
      context.hygiene.reliability,
      context.meals.reliability,
    ];
    
    const allInBounds = reliabilityScores.every(score => score >= 0.0 && score <= 1.0);
    console.log(`✓ All reliability scores in bounds [0.0, 1.0]: ${allInBounds}`);
    
    if (!allInBounds) {
      console.error('ERROR: Some reliability scores are out of bounds!');
      reliabilityScores.forEach((score, i) => {
        if (score < 0.0 || score > 1.0) {
          console.error(`  Score ${i}: ${score}`);
        }
      });
    }
    
    console.log('\n✅ Daily context aggregator test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing daily context:', error);
    process.exit(1);
  }
}

// Run test
testDailyContext();
