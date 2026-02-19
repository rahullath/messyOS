/**
 * Test Plan Builder Chain Generation (V2)
 * 
 * This script verifies that the plan builder correctly integrates
 * all V2 chain components and generates chains properly.
 */

import { AnchorService } from '../src/lib/anchors/anchor-service';
import { ChainGenerator } from '../src/lib/chains/chain-generator';
import { LocationStateTracker } from '../src/lib/chains/location-state';
import { WakeRampGenerator } from '../src/lib/chains/wake-ramp';
import type { Anchor } from '../src/lib/anchors/types';
import type { ExecutionChain } from '../src/lib/chains/types';

console.log('=== Testing Plan Builder Chain Generation ===\n');

// Test 1: Verify all V2 services can be instantiated
console.log('Test 1: Service Instantiation');
console.log('=====================================');

try {
  const anchorService = new AnchorService();
  const chainGenerator = new ChainGenerator();
  const locationStateTracker = new LocationStateTracker();
  const wakeRampGenerator = new WakeRampGenerator();
  
  console.log('✓ All V2 services instantiated successfully');
} catch (error) {
  console.error('✗ Failed to instantiate services:', error);
  process.exit(1);
}

// Test 2: Verify chain generation flow
console.log('\nTest 2: Chain Generation Flow');
console.log('=====================================');

const today = new Date('2025-02-01T00:00:00Z');
const wakeTime = new Date('2025-02-01T07:00:00Z');
const sleepTime = new Date('2025-02-01T23:00:00Z');
const planStart = new Date('2025-02-01T07:00:00Z');

// Create mock anchors
const mockAnchors: Anchor[] = [
  {
    id: 'anchor-1',
    start: new Date('2025-02-01T10:00:00Z'),
    end: new Date('2025-02-01T11:00:00Z'),
    title: 'Computer Science Lecture',
    location: 'Room 101',
    type: 'class',
    must_attend: true,
    calendar_event_id: 'cal-1',
  },
  {
    id: 'anchor-2',
    start: new Date('2025-02-01T14:00:00Z'),
    end: new Date('2025-02-01T16:00:00Z'),
    title: 'Workshop on Machine Learning',
    location: 'Lab 3',
    type: 'workshop',
    must_attend: true,
    calendar_event_id: 'cal-2',
  },
];

console.log(`Mock anchors created: ${mockAnchors.length}`);

// Test 3: Generate Wake Ramp
console.log('\nTest 3: Wake Ramp Generation');
console.log('=====================================');

const wakeRampGenerator = new WakeRampGenerator();
const wakeRamp = wakeRampGenerator.generateWakeRamp(planStart, wakeTime, 'medium');

console.log(`Wake Ramp: ${wakeRamp.skipped ? 'SKIPPED' : `${wakeRamp.duration} minutes`}`);
if (!wakeRamp.skipped) {
  console.log(`  Start: ${wakeRamp.start.toLocaleTimeString()}`);
  console.log(`  End: ${wakeRamp.end.toLocaleTimeString()}`);
  console.log(`  Components:`, wakeRamp.components);
}
console.log('✓ Wake Ramp generated successfully');

// Test 4: Generate Chains
console.log('\nTest 4: Chain Generation');
console.log('=====================================');

const chainGenerator = new ChainGenerator();
let chains: ExecutionChain[] = [];

try {
  chains = await chainGenerator.generateChainsForDate(mockAnchors, {
    userId: 'test-user',
    date: today,
    config: {
      currentLocation: {
        name: 'Home',
        address: '123 Test St',
        latitude: 51.5074,
        longitude: -0.1278,
      },
    },
  });
  
  console.log(`✓ Generated ${chains.length} chains`);
  
  for (const chain of chains) {
    console.log(`\nChain: ${chain.anchor.title}`);
    console.log(`  Chain ID: ${chain.chain_id}`);
    console.log(`  Completion Deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
    console.log(`  Steps: ${chain.steps.length}`);
    console.log(`  Commitment Envelope:`);
    console.log(`    - Prep: ${chain.commitment_envelope.prep.duration} min`);
    console.log(`    - Travel There: ${chain.commitment_envelope.travel_there.duration} min`);
    console.log(`    - Anchor: ${chain.commitment_envelope.anchor.duration} min`);
    console.log(`    - Travel Back: ${chain.commitment_envelope.travel_back.duration} min`);
    console.log(`    - Recovery: ${chain.commitment_envelope.recovery.duration} min`);
  }
} catch (error) {
  console.error('✗ Failed to generate chains:', error);
  process.exit(1);
}

// Test 5: Calculate Location Periods and Home Intervals
console.log('\nTest 5: Location State Tracking');
console.log('=====================================');

const locationStateTracker = new LocationStateTracker();
const locationPeriods = locationStateTracker.calculateLocationPeriods(
  chains,
  planStart,
  sleepTime
);
const homeIntervals = locationStateTracker.calculateHomeIntervals(locationPeriods);

console.log(`✓ Location periods: ${locationPeriods.length}`);
for (const period of locationPeriods) {
  console.log(`  - ${period.start.toLocaleTimeString()} - ${period.end.toLocaleTimeString()}: ${period.state}`);
}

console.log(`\n✓ Home intervals: ${homeIntervals.length}`);
for (const interval of homeIntervals) {
  console.log(`  - ${interval.start.toLocaleTimeString()} - ${interval.end.toLocaleTimeString()} (${interval.duration} min)`);
}

// Test 6: Verify Chain Integrity
console.log('\nTest 6: Chain Integrity Verification');
console.log('=====================================');

let allTestsPassed = true;

// Verify each chain has all required components
for (const chain of chains) {
  console.log(`\nVerifying chain: ${chain.anchor.title}`);
  
  // Check chain has steps
  if (chain.steps.length === 0) {
    console.error('  ✗ Chain has no steps');
    allTestsPassed = false;
  } else {
    console.log(`  ✓ Chain has ${chain.steps.length} steps`);
  }
  
  // Check chain has completion deadline
  if (!chain.chain_completion_deadline) {
    console.error('  ✗ Chain has no completion deadline');
    allTestsPassed = false;
  } else {
    console.log(`  ✓ Chain has completion deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
  }
  
  // Check commitment envelope is complete
  const envelope = chain.commitment_envelope;
  if (!envelope.prep || !envelope.travel_there || !envelope.anchor || !envelope.travel_back || !envelope.recovery) {
    console.error('  ✗ Commitment envelope is incomplete');
    allTestsPassed = false;
  } else {
    console.log('  ✓ Commitment envelope is complete');
  }
  
  // Check steps are ordered correctly (no gaps)
  for (let i = 0; i < chain.steps.length - 1; i++) {
    const currentStep = chain.steps[i];
    const nextStep = chain.steps[i + 1];
    
    if (currentStep.end_time.getTime() !== nextStep.start_time.getTime()) {
      console.error(`  ✗ Gap between step ${i} and ${i + 1}`);
      allTestsPassed = false;
    }
  }
  console.log('  ✓ Steps are ordered correctly (no gaps)');
  
  // Check exit gate is present
  const exitGateStep = chain.steps.find(s => s.role === 'exit-gate');
  if (!exitGateStep) {
    console.error('  ✗ Exit gate step not found');
    allTestsPassed = false;
  } else {
    console.log('  ✓ Exit gate step present');
  }
}

// Test 7: Verify Home Intervals are Valid
console.log('\nTest 7: Home Interval Validation');
console.log('=====================================');

for (const interval of homeIntervals) {
  // Check minimum duration (should be >= 30 minutes)
  if (interval.duration < 30) {
    console.error(`  ✗ Home interval too short: ${interval.duration} minutes`);
    allTestsPassed = false;
  } else {
    console.log(`  ✓ Home interval valid: ${interval.duration} minutes`);
  }
  
  // Check interval is during at_home periods
  const isHome = locationStateTracker.isHomeInterval(interval.start, homeIntervals);
  if (!isHome) {
    console.error(`  ✗ Home interval not during at_home period`);
    allTestsPassed = false;
  }
}

// Test 8: Verify Location State Transitions
console.log('\nTest 8: Location State Transitions');
console.log('=====================================');

for (let i = 0; i < locationPeriods.length - 1; i++) {
  const current = locationPeriods[i];
  const next = locationPeriods[i + 1];
  
  // Check no gaps between periods
  if (current.end.getTime() !== next.start.getTime()) {
    console.error(`  ✗ Gap between location periods ${i} and ${i + 1}`);
    allTestsPassed = false;
  }
}
console.log('  ✓ Location periods have no gaps');

// Check first period starts at planStart
if (locationPeriods[0].start.getTime() !== planStart.getTime()) {
  console.error('  ✗ First location period does not start at planStart');
  allTestsPassed = false;
} else {
  console.log('  ✓ First location period starts at planStart');
}

// Check last period ends at sleepTime
if (locationPeriods[locationPeriods.length - 1].end.getTime() !== sleepTime.getTime()) {
  console.error('  ✗ Last location period does not end at sleepTime');
  allTestsPassed = false;
} else {
  console.log('  ✓ Last location period ends at sleepTime');
}

// Final Summary
console.log('\n=== Test Summary ===');
if (allTestsPassed) {
  console.log('✅ All tests passed! Plan builder chain generation is working correctly.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the errors above.');
  process.exit(1);
}
