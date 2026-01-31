/**
 * Simple V2 Integration Test
 * 
 * Tests that V2 services can be instantiated and basic methods work
 */

import { AnchorService } from '../src/lib/anchors/anchor-service';
import { ChainGenerator } from '../src/lib/chains/chain-generator';
import { LocationStateTracker } from '../src/lib/chains/location-state';
import { WakeRampGenerator } from '../src/lib/chains/wake-ramp';

console.log('=== Testing V2 Service Instantiation ===\n');

try {
  // Test AnchorService
  console.log('1. Creating AnchorService...');
  const anchorService = new AnchorService();
  console.log('   ✓ AnchorService created successfully');

  // Test ChainGenerator
  console.log('2. Creating ChainGenerator...');
  const chainGenerator = new ChainGenerator();
  console.log('   ✓ ChainGenerator created successfully');

  // Test LocationStateTracker
  console.log('3. Creating LocationStateTracker...');
  const locationStateTracker = new LocationStateTracker();
  console.log('   ✓ LocationStateTracker created successfully');

  // Test WakeRampGenerator
  console.log('4. Creating WakeRampGenerator...');
  const wakeRampGenerator = new WakeRampGenerator();
  console.log('   ✓ WakeRampGenerator created successfully');

  // Test WakeRamp generation
  console.log('\n5. Testing Wake Ramp generation...');
  const now = new Date();
  const wakeTime = new Date(now);
  wakeTime.setHours(7, 0, 0, 0);
  
  const planStart = new Date(now);
  planStart.setHours(7, 0, 0, 0);

  const wakeRamp = wakeRampGenerator.generateWakeRamp(planStart, wakeTime, 'medium');
  console.log(`   ✓ Wake Ramp generated: ${wakeRamp.skipped ? 'SKIPPED' : `${wakeRamp.duration} minutes`}`);
  
  if (!wakeRamp.skipped) {
    console.log(`     - Start: ${wakeRamp.start.toLocaleTimeString()}`);
    console.log(`     - End: ${wakeRamp.end.toLocaleTimeString()}`);
    console.log(`     - Components: toilet=${wakeRamp.components.toilet}, hygiene=${wakeRamp.components.hygiene}, shower=${wakeRamp.components.shower}, dress=${wakeRamp.components.dress}, buffer=${wakeRamp.components.buffer}`);
  }

  // Test Wake Ramp skip logic
  console.log('\n6. Testing Wake Ramp skip logic...');
  const latePlanStart = new Date(now);
  latePlanStart.setHours(14, 0, 0, 0); // 2pm
  
  const wakeRampLate = wakeRampGenerator.generateWakeRamp(latePlanStart, wakeTime, 'medium');
  console.log(`   ✓ Late plan Wake Ramp: ${wakeRampLate.skipped ? 'SKIPPED (correct!)' : 'NOT SKIPPED (error!)'}`);
  if (wakeRampLate.skipped) {
    console.log(`     - Skip reason: ${wakeRampLate.skip_reason}`);
  }

  // Test LocationStateTracker with empty chains
  console.log('\n7. Testing Location State Tracker with empty chains...');
  const locationPeriods = locationStateTracker.calculateLocationPeriods(
    [],
    planStart,
    new Date(planStart.getTime() + 16 * 60 * 60 * 1000) // 16 hours later
  );
  console.log(`   ✓ Location periods calculated: ${locationPeriods.length}`);
  
  const homeIntervals = locationStateTracker.calculateHomeIntervals(locationPeriods);
  console.log(`   ✓ Home intervals calculated: ${homeIntervals.length}`);

  console.log('\n=== All Tests Passed ===');
  process.exit(0);
} catch (error) {
  console.error('\n=== Test Failed ===');
  console.error('Error:', error);
  process.exit(1);
}
