// Test script for Chain Generator

import { ChainGenerator } from '../src/lib/chains/chain-generator';
import type { Anchor } from '../src/lib/anchors/types';
import type { Location } from '../src/types/uk-student-travel';

/**
 * Test Chain Generator functionality
 */
async function testChainGenerator() {
  console.log('=== Chain Generator Test ===\n');

  const generator = new ChainGenerator();

  // Create test anchor (class at 10:00 AM)
  const testDate = new Date('2025-02-01T10:00:00Z');
  const testAnchor: Anchor = {
    id: 'test-anchor-1',
    start: testDate,
    end: new Date(testDate.getTime() + 60 * 60 * 1000), // 1 hour duration
    title: 'Software Engineering Lecture',
    location: 'Computer Science Building, University of Birmingham',
    type: 'class',
    must_attend: true,
    calendar_event_id: 'cal-event-1',
  };

  // Create test location (home)
  const homeLocation: Location = {
    name: 'Home',
    coordinates: [52.4508, -1.9305], // Birmingham coordinates
    type: 'home',
    address: '123 Test Street, Birmingham',
  };

  // Test 1: Generate chains for single anchor
  console.log('Test 1: Generate chains for single anchor');
  console.log('Anchor:', testAnchor.title);
  console.log('Anchor start:', testAnchor.start.toISOString());
  console.log('Anchor end:', testAnchor.end.toISOString());
  console.log('');

  try {
    const chains = await generator.generateChainsForDate(
      [testAnchor],
      {
        userId: 'test-user',
        date: testDate,
        config: {
          currentLocation: homeLocation,
          userEnergy: 3,
        },
      }
    );

    console.log('✓ Generated', chains.length, 'chain(s)');
    console.log('');

    // Examine first chain
    if (chains.length > 0) {
      const chain = chains[0];
      console.log('Chain ID:', chain.chain_id);
      console.log('Anchor ID:', chain.anchor_id);
      console.log('Chain Completion Deadline:', chain.chain_completion_deadline.toISOString());
      console.log('Chain Status:', chain.status);
      console.log('');

      console.log('Chain Steps:');
      chain.steps.forEach((step, index) => {
        console.log(`  ${index + 1}. ${step.name}`);
        console.log(`     Start: ${step.start_time.toISOString()}`);
        console.log(`     End: ${step.end_time.toISOString()}`);
        console.log(`     Duration: ${step.duration} minutes`);
        console.log(`     Required: ${step.is_required}`);
        console.log(`     Can skip when late: ${step.can_skip_when_late}`);
        console.log(`     Role: ${step.role}`);
        console.log('');
      });

      console.log('Commitment Envelope:');
      console.log('  Envelope ID:', chain.commitment_envelope.envelope_id);
      console.log('  Prep:', chain.commitment_envelope.prep.name);
      console.log('    Start:', chain.commitment_envelope.prep.start_time.toISOString());
      console.log('    End:', chain.commitment_envelope.prep.end_time.toISOString());
      console.log('    Duration:', chain.commitment_envelope.prep.duration, 'minutes');
      console.log('');
      console.log('  Travel There:', chain.commitment_envelope.travel_there.name);
      console.log('    Start:', chain.commitment_envelope.travel_there.start_time.toISOString());
      console.log('    End:', chain.commitment_envelope.travel_there.end_time.toISOString());
      console.log('    Duration:', chain.commitment_envelope.travel_there.duration, 'minutes');
      console.log('');
      console.log('  Anchor:', chain.commitment_envelope.anchor.name);
      console.log('    Start:', chain.commitment_envelope.anchor.start_time.toISOString());
      console.log('    End:', chain.commitment_envelope.anchor.end_time.toISOString());
      console.log('    Duration:', chain.commitment_envelope.anchor.duration, 'minutes');
      console.log('');
      console.log('  Travel Back:', chain.commitment_envelope.travel_back.name);
      console.log('    Start:', chain.commitment_envelope.travel_back.start_time.toISOString());
      console.log('    End:', chain.commitment_envelope.travel_back.end_time.toISOString());
      console.log('    Duration:', chain.commitment_envelope.travel_back.duration, 'minutes');
      console.log('');
      console.log('  Recovery:', chain.commitment_envelope.recovery.name);
      console.log('    Start:', chain.commitment_envelope.recovery.start_time.toISOString());
      console.log('    End:', chain.commitment_envelope.recovery.end_time.toISOString());
      console.log('    Duration:', chain.commitment_envelope.recovery.duration, 'minutes');
      console.log('');
    }
  } catch (error) {
    console.error('✗ Failed to generate chains:', error);
    process.exit(1);
  }

  // Test 2: Verify Chain Completion Deadline calculation
  console.log('Test 2: Verify Chain Completion Deadline calculation');
  const travelDuration = 30; // 30 minutes
  const deadline = generator.calculateChainCompletionDeadline(testAnchor, travelDuration);
  
  const expectedDeadline = new Date(testAnchor.start.getTime() - (30 + 45) * 60 * 1000);
  console.log('Expected deadline:', expectedDeadline.toISOString());
  console.log('Actual deadline:', deadline.toISOString());
  
  if (deadline.getTime() === expectedDeadline.getTime()) {
    console.log('✓ Chain Completion Deadline calculation correct');
  } else {
    console.error('✗ Chain Completion Deadline calculation incorrect');
    process.exit(1);
  }
  console.log('');

  // Test 3: Generate chains for multiple anchors
  console.log('Test 3: Generate chains for multiple anchors');
  const anchor2: Anchor = {
    id: 'test-anchor-2',
    start: new Date('2025-02-01T14:00:00Z'),
    end: new Date('2025-02-01T16:00:00Z'), // 2 hour duration
    title: 'Research Seminar',
    location: 'Research Building, University of Birmingham',
    type: 'seminar',
    must_attend: true,
    calendar_event_id: 'cal-event-2',
  };

  try {
    const chains = await generator.generateChainsForDate(
      [testAnchor, anchor2],
      {
        userId: 'test-user',
        date: testDate,
        config: {
          currentLocation: homeLocation,
          userEnergy: 3,
        },
      }
    );

    console.log('✓ Generated', chains.length, 'chain(s)');
    
    if (chains.length === 2) {
      console.log('✓ Correct number of chains generated');
      
      // Verify recovery duration for long anchor (>= 2 hours)
      const chain2 = chains.find(c => c.anchor_id === 'test-anchor-2');
      if (chain2) {
        const recoveryDuration = chain2.commitment_envelope.recovery.duration;
        console.log('Recovery duration for 2-hour anchor:', recoveryDuration, 'minutes');
        
        if (recoveryDuration === 20) {
          console.log('✓ Long anchor recovery duration correct (20 minutes)');
        } else {
          console.error('✗ Long anchor recovery duration incorrect (expected 20, got', recoveryDuration, ')');
          process.exit(1);
        }
      }
    } else {
      console.error('✗ Incorrect number of chains generated (expected 2, got', chains.length, ')');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Failed to generate chains:', error);
    process.exit(1);
  }
  console.log('');

  // Test 4: Anchor without location (should use default travel duration)
  console.log('Test 4: Anchor without location');
  const anchor3: Anchor = {
    id: 'test-anchor-3',
    start: new Date('2025-02-01T16:00:00Z'),
    end: new Date('2025-02-01T17:00:00Z'),
    title: 'Online Meeting',
    type: 'appointment',
    must_attend: false,
    calendar_event_id: 'cal-event-3',
  };

  try {
    const chains = await generator.generateChainsForDate(
      [anchor3],
      {
        userId: 'test-user',
        date: testDate,
        config: {
          currentLocation: homeLocation,
          userEnergy: 3,
        },
      }
    );

    console.log('✓ Generated', chains.length, 'chain(s) for anchor without location');
    
    if (chains.length > 0) {
      const travelDuration = chains[0].commitment_envelope.travel_there.duration;
      console.log('Travel duration:', travelDuration, 'minutes');
      
      if (travelDuration === 30) {
        console.log('✓ Default travel duration used (30 minutes)');
      } else {
        console.error('✗ Incorrect travel duration (expected 30, got', travelDuration, ')');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('✗ Failed to generate chains:', error);
    process.exit(1);
  }
  console.log('');

  console.log('=== All Chain Generator Tests Passed ===');
}

// Run tests
testChainGenerator().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
