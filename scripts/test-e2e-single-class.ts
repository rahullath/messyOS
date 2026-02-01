/**
 * E2E Test: Day with One Class
 * 
 * Tests plan generation with a single class anchor.
 * Should generate chain with all steps, commitment envelope, and Exit Gate.
 * 
 * Requirements: 2.1, 4.1, 7.1, 3.1
 */

import { AnchorService } from '../src/lib/anchors/anchor-service';
import { ChainGenerator } from '../src/lib/chains/chain-generator';
import { LocationStateTracker } from '../src/lib/chains/location-state';
import { WakeRampGenerator } from '../src/lib/chains/wake-ramp';
import type { Anchor } from '../src/lib/anchors/types';

async function testSingleClass() {
  console.log('=== E2E Test: Day with One Class ===\n');

  const today = new Date('2025-02-01T00:00:00Z');
  const wakeTime = new Date('2025-02-01T07:00:00Z');
  const sleepTime = new Date('2025-02-01T23:00:00Z');
  const planStart = new Date('2025-02-01T07:00:00Z');

  // Create mock class anchor
  const mockAnchor: Anchor = {
    id: 'anchor-class-1',
    start: new Date('2025-02-01T10:00:00Z'),
    end: new Date('2025-02-01T11:00:00Z'),
    title: 'Computer Science Lecture',
    location: 'Room 101, Main Building',
    type: 'class',
    must_attend: true,
    calendar_event_id: 'cal-class-1',
  };

  try {
    console.log('📋 Generating plan with one class anchor...');
    console.log(`   Class: ${mockAnchor.title}`);
    console.log(`   Time: ${mockAnchor.start.toLocaleTimeString()} - ${mockAnchor.end.toLocaleTimeString()}`);
    console.log(`   Location: ${mockAnchor.location}\n`);

    // Test 1: Generate chain for the class
    console.log('Test 1: Chain Generation');
    console.log('=====================================');
    
    const chainGenerator = new ChainGenerator();
    const chains = await chainGenerator.generateChainsForDate([mockAnchor], {
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

    if (chains.length !== 1) {
      console.error(`❌ Expected 1 chain, got ${chains.length}`);
      return false;
    }
    
    const chain = chains[0];
    console.log(`✓ Chain generated: ${chain.chain_id}`);
    console.log(`  Anchor: ${chain.anchor.title}`);
    console.log(`  Completion Deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
    console.log(`  Steps: ${chain.steps.length}`);

    // Test 2: Verify all chain steps are present
    console.log('\nTest 2: Chain Steps Verification');
    console.log('=====================================');
    
    const expectedStepNames = [
      'Feed cat',
      'Bathroom',
      'Hygiene (brush teeth)',
      'Shower',
      'Get dressed',
      'Pack bag',
      'Exit Readiness Check',
      'Leave house',
    ];
    
    for (const expectedName of expectedStepNames) {
      const step = chain.steps.find(s => s.name === expectedName);
      if (!step) {
        console.error(`❌ Missing step: ${expectedName}`);
        return false;
      }
      console.log(`✓ Step present: ${step.name} (${step.duration} min, required: ${step.is_required})`);
    }

    // Test 3: Verify Exit Gate is included
    console.log('\nTest 3: Exit Gate Verification');
    console.log('=====================================');
    
    const exitGateStep = chain.steps.find(s => s.role === 'exit-gate');
    if (!exitGateStep) {
      console.error('❌ Exit Gate step not found');
      return false;
    }
    
    console.log(`✓ Exit Gate step found: ${exitGateStep.name}`);
    console.log(`  Duration: ${exitGateStep.duration} min`);
    console.log(`  Required: ${exitGateStep.is_required}`);

    // Test 4: Verify commitment envelope structure
    console.log('\nTest 4: Commitment Envelope Structure');
    console.log('=====================================');
    
    const envelope = chain.commitment_envelope;
    if (!envelope) {
      console.error('❌ Commitment envelope not found');
      return false;
    }
    
    const envelopeComponents = ['prep', 'travel_there', 'anchor', 'travel_back', 'recovery'];
    for (const component of envelopeComponents) {
      const block = (envelope as any)[component];
      if (!block) {
        console.error(`❌ Missing envelope component: ${component}`);
        return false;
      }
      console.log(`✓ ${component}: ${block.duration} min (${block.start_time.toLocaleTimeString()} - ${block.end_time.toLocaleTimeString()})`);
    }

    // Test 5: Verify chain completion deadline calculation
    console.log('\nTest 5: Chain Completion Deadline');
    console.log('=====================================');
    
    // Deadline should be: anchor.start - travel_duration - 45 minutes
    const travelDuration = envelope.travel_there.duration;
    const expectedDeadline = new Date(mockAnchor.start.getTime() - (travelDuration + 45) * 60 * 1000);
    
    const deadlineDiff = Math.abs(chain.chain_completion_deadline.getTime() - expectedDeadline.getTime());
    if (deadlineDiff > 60000) { // Allow 1 minute tolerance
      console.error(`❌ Chain completion deadline incorrect`);
      console.error(`   Expected: ${expectedDeadline.toLocaleTimeString()}`);
      console.error(`   Got: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
      return false;
    }
    
    console.log(`✓ Chain completion deadline correct: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
    console.log(`  Formula: anchor.start (${mockAnchor.start.toLocaleTimeString()}) - travel (${travelDuration} min) - 45 min`);

    // Test 6: Verify chain step ordering (no gaps)
    console.log('\nTest 6: Chain Step Ordering');
    console.log('=====================================');
    
    for (let i = 0; i < chain.steps.length - 1; i++) {
      const currentStep = chain.steps[i];
      const nextStep = chain.steps[i + 1];
      
      if (currentStep.end_time.getTime() !== nextStep.start_time.getTime()) {
        console.error(`❌ Gap between step ${i} (${currentStep.name}) and ${i + 1} (${nextStep.name})`);
        console.error(`   Current ends: ${currentStep.end_time.toLocaleTimeString()}`);
        console.error(`   Next starts: ${nextStep.start_time.toLocaleTimeString()}`);
        return false;
      }
    }
    
    console.log('✓ All chain steps are ordered correctly (no gaps)');

    // Test 7: Verify location state transitions
    console.log('\nTest 7: Location State Transitions');
    console.log('=====================================');
    
    const locationStateTracker = new LocationStateTracker();
    const locationPeriods = locationStateTracker.calculateLocationPeriods(
      chains,
      planStart,
      sleepTime
    );
    
    console.log(`✓ ${locationPeriods.length} location periods calculated`);
    for (const period of locationPeriods) {
      console.log(`  - ${period.start.toLocaleTimeString()} - ${period.end.toLocaleTimeString()}: ${period.state}`);
    }
    
    // Verify transitions: at_home → not_home → at_home
    const states = locationPeriods.map(p => p.state);
    const hasCorrectTransitions = 
      states[0] === 'at_home' && 
      states.includes('not_home') && 
      states[states.length - 1] === 'at_home';
    
    if (!hasCorrectTransitions) {
      console.error('❌ Location state transitions incorrect');
      console.error(`   Expected: at_home → not_home → at_home`);
      console.error(`   Got: ${states.join(' → ')}`);
      return false;
    }
    
    console.log('✓ Location state transitions correct: at_home → not_home → at_home');

    // Test 8: Verify home intervals
    console.log('\nTest 8: Home Intervals');
    console.log('=====================================');
    
    const homeIntervals = locationStateTracker.calculateHomeIntervals(locationPeriods);
    console.log(`✓ ${homeIntervals.length} home intervals calculated`);
    
    for (const interval of homeIntervals) {
      console.log(`  - ${interval.start.toLocaleTimeString()} - ${interval.end.toLocaleTimeString()} (${interval.duration} min)`);
      
      if (interval.duration < 30) {
        console.error(`  ❌ Home interval too short: ${interval.duration} minutes`);
        return false;
      }
    }
    
    console.log('✓ All home intervals meet minimum duration (30 min)');

    // Test 9: Verify Wake Ramp
    console.log('\nTest 9: Wake Ramp');
    console.log('=====================================');
    
    const wakeRampGenerator = new WakeRampGenerator();
    const wakeRamp = wakeRampGenerator.generateWakeRamp(planStart, wakeTime, 'medium');
    
    if (wakeRamp.skipped) {
      console.error('❌ Wake Ramp should not be skipped (plan starts at wake time)');
      return false;
    }
    
    console.log(`✓ Wake Ramp included: ${wakeRamp.duration} minutes`);
    console.log(`  Start: ${wakeRamp.start.toLocaleTimeString()}`);
    console.log(`  End: ${wakeRamp.end.toLocaleTimeString()}`);

    console.log('\n=== ✅ All Tests Passed ===');
    return true;
  } catch (error) {
    console.error('\n=== ❌ Test Failed ===');
    console.error('Error:', error);
    return false;
  }
}

testSingleClass()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
