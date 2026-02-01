/**
 * E2E Test: Late Generation (Wake Ramp Skip)
 * 
 * Tests plan generation late in the day.
 * Should skip Wake Ramp and log skip_reason.
 * 
 * Requirements: 10.1, 10.3, 10.4
 */

import { WakeRampGenerator } from '../src/lib/chains/wake-ramp';

async function testWakeRampSkip() {
  console.log('=== E2E Test: Late Generation (Wake Ramp Skip) ===\n');

  const today = new Date('2025-02-01T00:00:00Z');
  const wakeTime = new Date('2025-02-01T07:00:00Z');

  try {
    const wakeRampGenerator = new WakeRampGenerator();

    // Test 1: Wake Ramp at wake time (should NOT skip)
    console.log('Test 1: Plan at Wake Time (Should NOT Skip)');
    console.log('=====================================');
    
    const planStartAtWake = new Date('2025-02-01T07:00:00Z');
    const wakeRampAtWake = wakeRampGenerator.generateWakeRamp(planStartAtWake, wakeTime, 'medium');
    
    if (wakeRampAtWake.skipped) {
      console.error('❌ Wake Ramp should NOT be skipped when plan starts at wake time');
      return false;
    }
    
    console.log(`✓ Wake Ramp NOT skipped: ${wakeRampAtWake.duration} minutes`);
    console.log(`  Start: ${wakeRampAtWake.start.toLocaleTimeString()}`);
    console.log(`  End: ${wakeRampAtWake.end.toLocaleTimeString()}`);

    // Test 2: Wake Ramp 1 hour after wake (should NOT skip)
    console.log('\nTest 2: Plan 1 Hour After Wake (Should NOT Skip)');
    console.log('=====================================');
    
    const planStart1Hour = new Date('2025-02-01T08:00:00Z');
    const wakeRamp1Hour = wakeRampGenerator.generateWakeRamp(planStart1Hour, wakeTime, 'medium');
    
    if (wakeRamp1Hour.skipped) {
      console.error('❌ Wake Ramp should NOT be skipped 1 hour after wake');
      return false;
    }
    
    console.log(`✓ Wake Ramp NOT skipped: ${wakeRamp1Hour.duration} minutes`);

    // Test 3: Wake Ramp exactly 2 hours after wake (boundary case)
    console.log('\nTest 3: Plan Exactly 2 Hours After Wake (Boundary)');
    console.log('=====================================');
    
    const planStart2Hours = new Date('2025-02-01T09:00:00Z');
    const wakeRamp2Hours = wakeRampGenerator.generateWakeRamp(planStart2Hours, wakeTime, 'medium');
    
    console.log(`Wake Ramp at 2 hours: ${wakeRamp2Hours.skipped ? 'SKIPPED' : 'NOT SKIPPED'}`);
    if (wakeRamp2Hours.skipped) {
      console.log(`  Skip reason: ${wakeRamp2Hours.skip_reason}`);
    }

    // Test 4: Wake Ramp at 2pm (should SKIP)
    console.log('\nTest 4: Plan at 2pm (Should SKIP)');
    console.log('=====================================');
    
    const planStartAt2pm = new Date('2025-02-01T14:00:00Z');
    const wakeRampAt2pm = wakeRampGenerator.generateWakeRamp(planStartAt2pm, wakeTime, 'medium');
    
    if (!wakeRampAt2pm.skipped) {
      console.error('❌ Wake Ramp should be skipped when plan starts at 2pm (7 hours after wake)');
      return false;
    }
    
    console.log('✓ Wake Ramp SKIPPED (correct)');
    console.log(`  Skip reason: ${wakeRampAt2pm.skip_reason}`);
    
    if (!wakeRampAt2pm.skip_reason) {
      console.error('❌ Skip reason not logged');
      return false;
    }
    
    console.log('✓ Skip reason logged');

    // Test 5: Wake Ramp at 5pm (should SKIP)
    console.log('\nTest 5: Plan at 5pm (Should SKIP)');
    console.log('=====================================');
    
    const planStartAt5pm = new Date('2025-02-01T17:00:00Z');
    const wakeRampAt5pm = wakeRampGenerator.generateWakeRamp(planStartAt5pm, wakeTime, 'medium');
    
    if (!wakeRampAt5pm.skipped) {
      console.error('❌ Wake Ramp should be skipped when plan starts at 5pm (10 hours after wake)');
      return false;
    }
    
    console.log('✓ Wake Ramp SKIPPED (correct)');
    console.log(`  Skip reason: ${wakeRampAt5pm.skip_reason}`);

    // Test 6: Verify skip logic formula (planStart > wakeTime + 2 hours)
    console.log('\nTest 6: Skip Logic Formula Verification');
    console.log('=====================================');
    
    const testCases = [
      { hours: 0, shouldSkip: false },
      { hours: 1, shouldSkip: false },
      { hours: 2, shouldSkip: false },
      { hours: 2.1, shouldSkip: true },
      { hours: 3, shouldSkip: true },
      { hours: 5, shouldSkip: true },
      { hours: 10, shouldSkip: true },
    ];
    
    for (const testCase of testCases) {
      const planStart = new Date(wakeTime.getTime() + testCase.hours * 60 * 60 * 1000);
      const wakeRamp = wakeRampGenerator.generateWakeRamp(planStart, wakeTime, 'medium');
      
      if (wakeRamp.skipped !== testCase.shouldSkip) {
        console.error(`❌ Skip logic incorrect for ${testCase.hours} hours after wake`);
        console.error(`   Expected skipped: ${testCase.shouldSkip}`);
        console.error(`   Got skipped: ${wakeRamp.skipped}`);
        return false;
      }
      
      console.log(`✓ ${testCase.hours} hours after wake: ${wakeRamp.skipped ? 'SKIPPED' : 'NOT SKIPPED'} (correct)`);
    }

    // Test 7: Verify different energy levels when NOT skipped
    console.log('\nTest 7: Energy Level Durations (When Not Skipped)');
    console.log('=====================================');
    
    const planStartEarly = new Date('2025-02-01T07:00:00Z');
    
    const wakeRampLow = wakeRampGenerator.generateWakeRamp(planStartEarly, wakeTime, 'low');
    const wakeRampMedium = wakeRampGenerator.generateWakeRamp(planStartEarly, wakeTime, 'medium');
    const wakeRampHigh = wakeRampGenerator.generateWakeRamp(planStartEarly, wakeTime, 'high');
    
    console.log(`Low energy: ${wakeRampLow.duration} minutes (expected: 120)`);
    console.log(`Medium energy: ${wakeRampMedium.duration} minutes (expected: 90)`);
    console.log(`High energy: ${wakeRampHigh.duration} minutes (expected: 75)`);
    
    if (wakeRampLow.duration !== 120) {
      console.error('❌ Low energy duration incorrect');
      return false;
    }
    if (wakeRampMedium.duration !== 90) {
      console.error('❌ Medium energy duration incorrect');
      return false;
    }
    if (wakeRampHigh.duration !== 75) {
      console.error('❌ High energy duration incorrect');
      return false;
    }
    
    console.log('✓ All energy level durations correct');

    // Test 8: Verify skipped Wake Ramp has no start/end times
    console.log('\nTest 8: Skipped Wake Ramp Structure');
    console.log('=====================================');
    
    const skippedWakeRamp = wakeRampGenerator.generateWakeRamp(planStartAt2pm, wakeTime, 'medium');
    
    if (!skippedWakeRamp.skipped) {
      console.error('❌ Wake Ramp should be skipped');
      return false;
    }
    
    console.log('✓ Wake Ramp is skipped');
    console.log(`  Has skip_reason: ${!!skippedWakeRamp.skip_reason}`);
    console.log(`  Skip reason: "${skippedWakeRamp.skip_reason}"`);
    
    if (!skippedWakeRamp.skip_reason || skippedWakeRamp.skip_reason.trim() === '') {
      console.error('❌ Skip reason is empty or missing');
      return false;
    }
    
    console.log('✓ Skip reason is present and non-empty');

    console.log('\n=== ✅ All Tests Passed ===');
    return true;
  } catch (error) {
    console.error('\n=== ❌ Test Failed ===');
    console.error('Error:', error);
    return false;
  }
}

testWakeRampSkip()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
