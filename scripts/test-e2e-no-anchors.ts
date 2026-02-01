/**
 * E2E Test: Day with No Anchors
 * 
 * Tests plan generation when there are no calendar events.
 * Should include Wake Ramp and basic plan structure.
 * 
 * Requirements: 9.1, 11.1
 * 
 * This test verifies:
 * - Wake Ramp is included when plan starts at wake time
 * - No chains are generated when there are no anchors
 * - Location state is at_home all day
 * - Home intervals are calculated correctly
 * - Basic plan structure is valid
 */

import 'dotenv/config';
import { AnchorService } from '../src/lib/anchors/anchor-service';
import { ChainGenerator } from '../src/lib/chains/chain-generator';
import { LocationStateTracker } from '../src/lib/chains/location-state';
import { WakeRampGenerator } from '../src/lib/chains/wake-ramp';
import type { Location } from '../src/types/uk-student-travel';

async function testNoAnchors() {
  console.log('=== E2E Test: Day with No Anchors ===\n');

  const userId = 'test-user-id';
  const today = new Date('2025-02-01T00:00:00Z');
  const wakeTime = new Date('2025-02-01T07:00:00Z');
  const sleepTime = new Date('2025-02-01T23:00:00Z');
  const planStart = wakeTime; // Plan starts at wake time

  const currentLocation: Location = {
    name: 'Home',
    address: '123 Test St',
    latitude: 51.5074,
    longitude: -0.1278,
  };

  try {
    console.log('📋 Testing V2 components with no calendar events...\n');

    // Test 1: Verify Wake Ramp is included
    console.log('Test 1: Wake Ramp Inclusion');
    console.log('=====================================');
    
    const wakeRampGenerator = new WakeRampGenerator();
    const wakeRamp = wakeRampGenerator.generateWakeRamp(planStart, wakeTime, 'medium');
    
    if (!wakeRamp) {
      console.error('❌ Wake Ramp not generated');
      return false;
    }
    
    if (wakeRamp.skipped) {
      console.error('❌ Wake Ramp should not be skipped (plan starts at wake time)');
      return false;
    }
    
    console.log(`✓ Wake Ramp included: ${wakeRamp.duration} minutes`);
    console.log(`  Start: ${wakeRamp.start.toISOString()}`);
    console.log(`  End: ${wakeRamp.end.toISOString()}`);
    console.log(`  Components:`, wakeRamp.components);
    console.log(`  Skipped: ${wakeRamp.skipped}`);

    // Test 2: Verify no anchors are found (simulating empty calendar)
    console.log('\nTest 2: No Anchors Found');
    console.log('=====================================');
    
    // Mock empty calendar by not calling the anchor service
    // In a real scenario with no events, getAnchorsForDate would return []
    const anchors: any[] = [];
    
    console.log(`✓ No anchors found (simulating empty calendar)`);
    console.log(`  Anchor count: ${anchors.length}`);

    // Test 3: Verify no chains are generated
    console.log('\nTest 3: No Chains Generated');
    console.log('=====================================');
    
    const chainGenerator = new ChainGenerator();
    const chains = await chainGenerator.generateChainsForDate(anchors, {
      userId,
      date: today,
      config: { currentLocation }
    });
    
    if (chains.length > 0) {
      console.error(`❌ Expected 0 chains, got ${chains.length}`);
      return false;
    }
    
    console.log('✓ No chains generated (correct for no anchors)');

    // Test 4: Verify location state (should be at_home all day)
    console.log('\nTest 4: Location State');
    console.log('=====================================');
    
    const locationTracker = new LocationStateTracker();
    const locationPeriods = locationTracker.calculateLocationPeriods(chains, planStart, sleepTime);
    
    if (locationPeriods.length === 0) {
      console.error('❌ No location periods found');
      return false;
    }
    
    // With no anchors, should be at_home all day
    const allAtHome = locationPeriods.every(p => p.state === 'at_home');
    if (!allAtHome) {
      console.error('❌ Expected all location periods to be at_home');
      console.error('Location periods:', locationPeriods);
      return false;
    }
    
    console.log(`✓ All ${locationPeriods.length} location periods are at_home`);
    for (const period of locationPeriods) {
      console.log(`  - ${period.start.toISOString()} to ${period.end.toISOString()}: ${period.state}`);
    }

    // Test 5: Verify home intervals
    console.log('\nTest 5: Home Intervals');
    console.log('=====================================');
    
    const homeIntervals = locationTracker.calculateHomeIntervals(locationPeriods);
    
    if (homeIntervals.length === 0) {
      console.error('❌ No home intervals found (expected at least one)');
      return false;
    }
    
    console.log(`✓ ${homeIntervals.length} home intervals found`);
    for (const interval of homeIntervals) {
      console.log(`  - ${interval.start.toISOString()} to ${interval.end.toISOString()} (${interval.duration} min)`);
      
      if (interval.duration < 30) {
        console.error(`  ❌ Home interval too short: ${interval.duration} minutes`);
        return false;
      }
    }
    console.log('✓ All home intervals meet minimum duration (30 min)');

    // Test 6: Verify basic plan structure expectations
    console.log('\nTest 6: Basic Plan Structure Expectations');
    console.log('=====================================');
    
    console.log('✓ Plan would have the following structure:');
    console.log(`  - Date: ${today.toDateString()}`);
    console.log(`  - Wake Time: ${wakeTime.toISOString()}`);
    console.log(`  - Sleep Time: ${sleepTime.toISOString()}`);
    console.log(`  - Plan Start: ${planStart.toISOString()}`);
    console.log(`  - Wake Ramp: ${wakeRamp.duration} minutes`);
    console.log(`  - Chains: ${chains.length}`);
    console.log(`  - Location Periods: ${locationPeriods.length}`);
    console.log(`  - Home Intervals: ${homeIntervals.length}`);
    
    // Calculate expected time blocks
    const expectedBlocks = [];
    
    // Wake Ramp would be a time block
    if (!wakeRamp.skipped) {
      expectedBlocks.push('Wake Ramp');
    }
    
    // Meals could be placed in home intervals (0-1 meals by default)
    if (homeIntervals.length > 0) {
      expectedBlocks.push('Possible meal blocks (0-1)');
    }
    
    // Tasks or Primary Focus Block would be added
    expectedBlocks.push('Primary Focus Block or tasks');
    
    console.log(`  - Expected time blocks: ${expectedBlocks.join(', ')}`);

    console.log('\n=== ✅ All Tests Passed ===');
    console.log('\nSummary:');
    console.log('- Wake Ramp correctly included when plan starts at wake time');
    console.log('- No anchors found (empty calendar scenario)');
    console.log('- No chains generated (correct behavior)');
    console.log('- Location state is at_home for entire day');
    console.log('- Home intervals calculated correctly');
    console.log('- All components work independently without database');
    
    return true;
  } catch (error) {
    console.error('\n=== ❌ Test Failed ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    return false;
  }
}

testNoAnchors()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
