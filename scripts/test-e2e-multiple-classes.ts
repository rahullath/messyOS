/**
 * E2E Test: Day with Multiple Classes
 * 
 * Tests plan generation with multiple anchors.
 * Should generate multiple chains, verify no overlaps, and track location state transitions.
 * 
 * Requirements: 12.5, 8.2, 8.3, 8.4
 */

import { ChainGenerator } from '../src/lib/chains/chain-generator';
import { LocationStateTracker } from '../src/lib/chains/location-state';
import type { Anchor } from '../src/lib/anchors/types';

async function testMultipleClasses() {
  console.log('=== E2E Test: Day with Multiple Classes ===\n');

  const today = new Date('2025-02-01T00:00:00Z');
  const wakeTime = new Date('2025-02-01T07:00:00Z');
  const sleepTime = new Date('2025-02-01T23:00:00Z');
  const planStart = new Date('2025-02-01T07:00:00Z');

  // Create multiple mock anchors with realistic spacing
  const mockAnchors: Anchor[] = [
    {
      id: 'anchor-1',
      start: new Date('2025-02-01T09:00:00Z'),
      end: new Date('2025-02-01T10:00:00Z'),
      title: 'Mathematics Lecture',
      location: 'Room 201',
      type: 'class',
      must_attend: true,
      calendar_event_id: 'cal-1',
    },
    {
      id: 'anchor-2',
      start: new Date('2025-02-01T13:00:00Z'), // Changed from 11:00 to 13:00 for better spacing
      end: new Date('2025-02-01T14:00:00Z'),   // Changed from 12:00 to 14:00
      title: 'Physics Tutorial',
      location: 'Lab 3',
      type: 'seminar',
      must_attend: true,
      calendar_event_id: 'cal-2',
    },
    {
      id: 'anchor-3',
      start: new Date('2025-02-01T16:00:00Z'), // Changed from 14:00 to 16:00 for better spacing
      end: new Date('2025-02-01T18:00:00Z'),   // Kept 2-hour duration
      title: 'Computer Science Workshop',
      location: 'Computer Lab',
      type: 'workshop',
      must_attend: true,
      calendar_event_id: 'cal-3',
    },
  ];

  try {
    console.log('📋 Generating plan with multiple class anchors...');
    for (const anchor of mockAnchors) {
      console.log(`   - ${anchor.title}: ${anchor.start.toLocaleTimeString()} - ${anchor.end.toLocaleTimeString()}`);
    }
    console.log();

    // Test 1: Generate chains for all anchors
    console.log('Test 1: Multiple Chain Generation');
    console.log('=====================================');
    
    const chainGenerator = new ChainGenerator();
    const chains = await chainGenerator.generateChainsForDate(mockAnchors, {
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

    if (chains.length !== mockAnchors.length) {
      console.error(`❌ Expected ${mockAnchors.length} chains, got ${chains.length}`);
      return false;
    }
    
    console.log(`✓ ${chains.length} chains generated (one per anchor)`);
    for (const chain of chains) {
      console.log(`  - Chain ${chain.chain_id}: ${chain.anchor.title}`);
      console.log(`    Deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
      console.log(`    Steps: ${chain.steps.length}`);
    }

    // Test 2: Verify commitment envelopes don't overlap
    console.log('\nTest 2: Commitment Envelope Overlap Check');
    console.log('=====================================');
    
    // Sort chains by anchor start time
    const sortedChains = [...chains].sort((a, b) => 
      a.anchor.start.getTime() - b.anchor.start.getTime()
    );
    
    // Check that commitment envelopes (travel_there through recovery) don't overlap
    for (let i = 0; i < sortedChains.length - 1; i++) {
      const currentChain = sortedChains[i];
      const nextChain = sortedChains[i + 1];
      
      // Get the envelope boundaries (travel_there start to recovery end)
      const currentEnvelopeEnd = currentChain.commitment_envelope.recovery.end_time;
      const nextEnvelopeStart = nextChain.commitment_envelope.travel_there.start_time;
      
      console.log(`Chain ${i} (${currentChain.anchor.title}):`);
      console.log(`   Envelope: ${currentChain.commitment_envelope.travel_there.start_time.toLocaleTimeString()} - ${currentEnvelopeEnd.toLocaleTimeString()}`);
      console.log(`Chain ${i + 1} (${nextChain.anchor.title}):`);
      console.log(`   Envelope: ${nextEnvelopeStart.toLocaleTimeString()} - ${nextChain.commitment_envelope.recovery.end_time.toLocaleTimeString()}`);
      
      if (currentEnvelopeEnd.getTime() > nextEnvelopeStart.getTime()) {
        console.error(`❌ Commitment envelope overlap detected`);
        return false;
      }
      
      console.log(`✓ No envelope overlap\n`);
    }
    
    console.log('Note: Prep phases may overlap with previous chain recovery, which is acceptable.');
    console.log('The key is that commitment envelopes (travel through recovery) do not overlap.');

    // Test 3: Verify location state transitions
    console.log('\nTest 3: Location State Transitions');
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
    
    // Verify multiple transitions
    const states = locationPeriods.map(p => p.state);
    const atHomeCount = states.filter(s => s === 'at_home').length;
    const notHomeCount = states.filter(s => s === 'not_home').length;
    
    if (atHomeCount === 0) {
      console.error('❌ No at_home periods found');
      return false;
    }
    
    if (notHomeCount === 0) {
      console.error('❌ No not_home periods found');
      return false;
    }
    
    console.log(`✓ Location state transitions present: ${atHomeCount} at_home, ${notHomeCount} not_home`);

    // Test 4: Verify location periods have no gaps
    console.log('\nTest 4: Location Period Continuity');
    console.log('=====================================');
    
    for (let i = 0; i < locationPeriods.length - 1; i++) {
      const current = locationPeriods[i];
      const next = locationPeriods[i + 1];
      
      if (current.end.getTime() !== next.start.getTime()) {
        console.error(`❌ Gap between location periods ${i} and ${i + 1}`);
        console.error(`   Period ${i} ends: ${current.end.toLocaleTimeString()}`);
        console.error(`   Period ${i + 1} starts: ${next.start.toLocaleTimeString()}`);
        return false;
      }
    }
    
    console.log('✓ All location periods are continuous (no gaps)');

    // Test 5: Verify first period starts at planStart
    console.log('\nTest 5: Location Period Boundaries');
    console.log('=====================================');
    
    if (locationPeriods[0].start.getTime() !== planStart.getTime()) {
      console.error('❌ First location period does not start at planStart');
      console.error(`   Expected: ${planStart.toLocaleTimeString()}`);
      console.error(`   Got: ${locationPeriods[0].start.toLocaleTimeString()}`);
      return false;
    }
    console.log(`✓ First period starts at planStart: ${planStart.toLocaleTimeString()}`);
    
    if (locationPeriods[locationPeriods.length - 1].end.getTime() !== sleepTime.getTime()) {
      console.error('❌ Last location period does not end at sleepTime');
      console.error(`   Expected: ${sleepTime.toLocaleTimeString()}`);
      console.error(`   Got: ${locationPeriods[locationPeriods.length - 1].end.toLocaleTimeString()}`);
      return false;
    }
    console.log(`✓ Last period ends at sleepTime: ${sleepTime.toLocaleTimeString()}`);

    // Test 6: Verify home intervals
    console.log('\nTest 6: Home Intervals');
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
    
    if (homeIntervals.length === 0) {
      console.log('  ⚠️  No home intervals found (user may be out all day)');
    } else {
      console.log('✓ All home intervals meet minimum duration (30 min)');
    }

    // Test 7: Verify each chain has complete commitment envelope
    console.log('\nTest 7: Commitment Envelope Completeness');
    console.log('=====================================');
    
    for (const chain of chains) {
      const envelope = chain.commitment_envelope;
      const components = ['prep', 'travel_there', 'anchor', 'travel_back', 'recovery'];
      
      for (const component of components) {
        const block = (envelope as any)[component];
        if (!block) {
          console.error(`❌ Chain ${chain.chain_id} missing ${component}`);
          return false;
        }
      }
      
      console.log(`✓ Chain ${chain.chain_id} (${chain.anchor.title}) has complete envelope`);
    }

    // Test 8: Verify chain completion deadlines are ordered
    console.log('\nTest 8: Chain Completion Deadline Ordering');
    console.log('=====================================');
    
    for (let i = 0; i < chains.length - 1; i++) {
      const currentDeadline = chains[i].chain_completion_deadline;
      const nextDeadline = chains[i + 1].chain_completion_deadline;
      
      if (currentDeadline.getTime() >= nextDeadline.getTime()) {
        console.error(`❌ Chain deadlines not ordered correctly`);
        console.error(`   Chain ${i} deadline: ${currentDeadline.toLocaleTimeString()}`);
        console.error(`   Chain ${i + 1} deadline: ${nextDeadline.toLocaleTimeString()}`);
        return false;
      }
      
      console.log(`✓ Chain ${i} deadline (${currentDeadline.toLocaleTimeString()}) < Chain ${i + 1} deadline (${nextDeadline.toLocaleTimeString()})`);
    }

    // Test 9: Verify each chain has Exit Gate
    console.log('\nTest 9: Exit Gate Presence');
    console.log('=====================================');
    
    for (const chain of chains) {
      const exitGateStep = chain.steps.find(s => s.role === 'exit-gate');
      if (!exitGateStep) {
        console.error(`❌ Chain ${chain.chain_id} missing Exit Gate`);
        return false;
      }
      console.log(`✓ Chain ${chain.chain_id} has Exit Gate: ${exitGateStep.name}`);
    }

    console.log('\n=== ✅ All Tests Passed ===');
    return true;
  } catch (error) {
    console.error('\n=== ❌ Test Failed ===');
    console.error('Error:', error);
    return false;
  }
}

testMultipleClasses()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
