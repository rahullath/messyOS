/**
 * Test script to verify chain metadata structure
 * 
 * This script tests that:
 * 1. TimeBlock metadata structure is correct
 * 2. Chain steps can be converted to TimeBlocks with metadata
 * 3. All required metadata fields are present
 */

import { ChainGenerator } from '../src/lib/chains/chain-generator';
import type { Anchor } from '../src/lib/anchors/types';
import type { TimeBlockMetadata } from '../src/types/daily-plan';

async function testChainMetadata() {
  console.log('=== Testing Chain Metadata Structure ===\n');

  // Create a test anchor
  const testAnchor: Anchor = {
    id: 'test-anchor-1',
    start: new Date('2025-02-01T10:00:00'),
    end: new Date('2025-02-01T11:00:00'),
    title: 'Test Lecture',
    location: 'Room 101',
    type: 'class',
    must_attend: true,
    calendar_event_id: 'cal-event-1',
  };

  console.log('Test Anchor:', {
    title: testAnchor.title,
    type: testAnchor.type,
    start: testAnchor.start.toLocaleString(),
    location: testAnchor.location,
  });

  // Create chain generator
  const chainGenerator = new ChainGenerator();

  // Generate a chain
  const chains = await chainGenerator.generateChainsForDate(
    [testAnchor],
    {
      userId: 'test-user',
      date: new Date('2025-02-01'),
      config: {
        currentLocation: {
          name: 'Home',
          coordinates: [52.4862, -1.8904],
          type: 'home',
        },
      },
    }
  );

  if (chains.length === 0) {
    console.error('❌ No chains generated');
    return;
  }

  const chain = chains[0];
  console.log('\n✅ Chain generated successfully');
  console.log('Chain ID:', chain.chain_id);
  console.log('Chain steps:', chain.steps.length);
  console.log('Chain Completion Deadline:', chain.chain_completion_deadline.toLocaleString());

  // Convert chain to TimeBlocks
  console.log('\n=== Converting Chain to TimeBlocks ===\n');
  const timeBlocks = chainGenerator.convertChainToTimeBlocks(
    chain,
    'test-plan-id',
    'at_home'
  );

  console.log(`✅ Converted ${timeBlocks.length} TimeBlocks`);

  // Verify metadata structure
  console.log('\n=== Verifying Metadata Structure ===\n');
  let allValid = true;

  for (const block of timeBlocks) {
    const metadata = block.metadata as TimeBlockMetadata | undefined;
    
    if (!metadata) {
      console.error(`❌ Block "${block.activityName}" has no metadata`);
      allValid = false;
      continue;
    }

    // Check required fields
    const hasRole = !!metadata.role;
    const hasChainId = !!metadata.chain_id;
    const hasStepId = !!metadata.step_id;
    const hasAnchorId = !!metadata.anchor_id;
    const hasLocationState = !!metadata.location_state;

    console.log(`Block: ${block.activityName}`);
    console.log(`  ✓ Role: ${metadata.role?.type} (required: ${metadata.role?.required})`);
    console.log(`  ✓ Chain ID: ${metadata.chain_id}`);
    console.log(`  ✓ Step ID: ${metadata.step_id}`);
    console.log(`  ✓ Anchor ID: ${metadata.anchor_id}`);
    console.log(`  ✓ Location State: ${metadata.location_state}`);

    if (metadata.commitment_envelope) {
      console.log(`  ✓ Commitment Envelope: ${metadata.commitment_envelope.envelope_type}`);
    }

    if (metadata.role?.gate_conditions) {
      console.log(`  ✓ Gate Conditions: ${metadata.role.gate_conditions.length} conditions`);
    }

    if (!hasRole || !hasChainId || !hasStepId || !hasAnchorId || !hasLocationState) {
      console.error(`  ❌ Missing required metadata fields`);
      allValid = false;
    }

    console.log('');
  }

  if (allValid) {
    console.log('✅ All TimeBlocks have valid metadata structure');
  } else {
    console.error('❌ Some TimeBlocks have invalid metadata');
  }

  // Test commitment envelope metadata
  console.log('\n=== Verifying Commitment Envelope Metadata ===\n');
  const envelopeBlocks = timeBlocks.filter(
    b => b.metadata?.commitment_envelope
  );

  console.log(`Found ${envelopeBlocks.length} commitment envelope blocks`);
  
  const envelopeTypes = new Set(
    envelopeBlocks.map(b => b.metadata?.commitment_envelope?.envelope_type)
  );
  
  console.log('Envelope types:', Array.from(envelopeTypes).join(', '));

  const expectedTypes = ['prep', 'travel_there', 'anchor', 'travel_back', 'recovery'];
  const hasAllTypes = expectedTypes.every(type => envelopeTypes.has(type));

  if (hasAllTypes) {
    console.log('✅ All commitment envelope types present');
  } else {
    console.error('❌ Missing commitment envelope types');
    console.error('Expected:', expectedTypes);
    console.error('Found:', Array.from(envelopeTypes));
  }

  console.log('\n=== Test Complete ===');
}

// Run the test
testChainMetadata().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
