// Test script for Degradation Service

import { degradationService } from '../src/lib/chains/degradation-service';
import type { ExecutionChain, ChainStepInstance, CommitmentEnvelope } from '../src/lib/chains/types';
import type { Anchor } from '../src/lib/anchors/types';

/**
 * Create a mock execution chain for testing
 */
function createMockChain(chainCompletionDeadline: Date): ExecutionChain {
  const now = new Date();
  const anchor: Anchor = {
    id: 'anchor-1',
    start: new Date(now.getTime() + 120 * 60 * 1000), // 2 hours from now
    end: new Date(now.getTime() + 180 * 60 * 1000), // 3 hours from now
    title: 'Test Class',
    type: 'class',
    must_attend: true,
    calendar_event_id: 'cal-1',
  };

  const steps: ChainStepInstance[] = [
    {
      step_id: 'step-1',
      chain_id: 'chain-1',
      name: 'Feed cat',
      start_time: new Date(now.getTime() + 30 * 60 * 1000),
      end_time: new Date(now.getTime() + 35 * 60 * 1000),
      duration: 5,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-2',
      chain_id: 'chain-1',
      name: 'Bathroom',
      start_time: new Date(now.getTime() + 35 * 60 * 1000),
      end_time: new Date(now.getTime() + 45 * 60 * 1000),
      duration: 10,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-3',
      chain_id: 'chain-1',
      name: 'Hygiene',
      start_time: new Date(now.getTime() + 45 * 60 * 1000),
      end_time: new Date(now.getTime() + 50 * 60 * 1000),
      duration: 5,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-4',
      chain_id: 'chain-1',
      name: 'Shower',
      start_time: new Date(now.getTime() + 50 * 60 * 1000),
      end_time: new Date(now.getTime() + 65 * 60 * 1000),
      duration: 15,
      is_required: false,
      can_skip_when_late: true,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-5',
      chain_id: 'chain-1',
      name: 'Get dressed',
      start_time: new Date(now.getTime() + 65 * 60 * 1000),
      end_time: new Date(now.getTime() + 75 * 60 * 1000),
      duration: 10,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-6',
      chain_id: 'chain-1',
      name: 'Pack bag',
      start_time: new Date(now.getTime() + 75 * 60 * 1000),
      end_time: new Date(now.getTime() + 85 * 60 * 1000),
      duration: 10,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
  ];

  const envelope: CommitmentEnvelope = {
    envelope_id: 'env-1',
    prep: steps[0],
    travel_there: {
      step_id: 'travel-there',
      chain_id: 'chain-1',
      name: 'Travel to Test Class',
      start_time: new Date(now.getTime() + 85 * 60 * 1000),
      end_time: new Date(now.getTime() + 115 * 60 * 1000),
      duration: 30,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    anchor: {
      step_id: 'anchor',
      chain_id: 'chain-1',
      name: 'Test Class',
      start_time: anchor.start,
      end_time: anchor.end,
      duration: 60,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'anchor',
    },
    travel_back: {
      step_id: 'travel-back',
      chain_id: 'chain-1',
      name: 'Travel from Test Class',
      start_time: anchor.end,
      end_time: new Date(anchor.end.getTime() + 30 * 60 * 1000),
      duration: 30,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    recovery: {
      step_id: 'recovery',
      chain_id: 'chain-1',
      name: 'Recovery',
      start_time: new Date(anchor.end.getTime() + 30 * 60 * 1000),
      end_time: new Date(anchor.end.getTime() + 40 * 60 * 1000),
      duration: 10,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'recovery',
    },
  };

  return {
    chain_id: 'chain-1',
    anchor_id: 'anchor-1',
    anchor,
    chain_completion_deadline: chainCompletionDeadline,
    steps,
    commitment_envelope: envelope,
    status: 'pending',
  };
}

/**
 * Test 1: shouldTriggerDegradation - Before deadline
 */
function testShouldNotTriggerBeforeDeadline() {
  console.log('\n=== Test 1: Should NOT trigger degradation before deadline ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const chain = createMockChain(deadline);
  
  const shouldTrigger = degradationService.shouldTriggerDegradation(chain, now);
  
  console.log('Current time:', now.toISOString());
  console.log('Chain Completion Deadline:', deadline.toISOString());
  console.log('Should trigger degradation:', shouldTrigger);
  console.log('✓ Test passed:', shouldTrigger === false);
  
  return shouldTrigger === false;
}

/**
 * Test 2: shouldTriggerDegradation - After deadline
 */
function testShouldTriggerAfterDeadline() {
  console.log('\n=== Test 2: Should trigger degradation after deadline ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
  const chain = createMockChain(deadline);
  
  const shouldTrigger = degradationService.shouldTriggerDegradation(chain, now);
  
  console.log('Current time:', now.toISOString());
  console.log('Chain Completion Deadline:', deadline.toISOString());
  console.log('Should trigger degradation:', shouldTrigger);
  console.log('✓ Test passed:', shouldTrigger === true);
  
  return shouldTrigger === true;
}

/**
 * Test 3: degradeChain - Drop optional steps
 */
function testDegradeChainDropsOptionalSteps() {
  console.log('\n=== Test 3: Degrade chain drops optional steps ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000);
  const chain = createMockChain(deadline);
  
  console.log('Original chain steps:');
  chain.steps.forEach(step => {
    console.log(`  - ${step.name}: required=${step.is_required}, can_skip=${step.can_skip_when_late}, status=${step.status}`);
  });
  
  const degradedChain = degradationService.degradeChain(chain);
  
  console.log('\nDegraded chain steps:');
  degradedChain.steps.forEach(step => {
    console.log(`  - ${step.name}: required=${step.is_required}, can_skip=${step.can_skip_when_late}, status=${step.status}, skip_reason=${step.skip_reason || 'N/A'}`);
  });
  
  // Check that optional steps are skipped
  const optionalSteps = degradedChain.steps.filter(s => s.can_skip_when_late && !s.is_required);
  const allOptionalSkipped = optionalSteps.every(s => s.status === 'skipped' && s.skip_reason === 'Running late');
  
  console.log('\nOptional steps (should be skipped):');
  optionalSteps.forEach(step => {
    console.log(`  - ${step.name}: status=${step.status}, skip_reason=${step.skip_reason}`);
  });
  
  console.log('✓ Test passed:', allOptionalSkipped);
  
  return allOptionalSkipped;
}

/**
 * Test 4: degradeChain - Preserve required steps
 */
function testDegradeChainPreservesRequiredSteps() {
  console.log('\n=== Test 4: Degrade chain preserves required steps ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000);
  const chain = createMockChain(deadline);
  
  const degradedChain = degradationService.degradeChain(chain);
  
  // Check that required steps are NOT skipped
  const requiredSteps = degradedChain.steps.filter(s => s.is_required);
  const allRequiredPreserved = requiredSteps.every(s => s.status !== 'skipped');
  
  console.log('Required steps (should be preserved):');
  requiredSteps.forEach(step => {
    console.log(`  - ${step.name}: status=${step.status}`);
  });
  
  console.log('✓ Test passed:', allRequiredPreserved);
  
  return allRequiredPreserved;
}

/**
 * Test 5: getDroppedSteps
 */
function testGetDroppedSteps() {
  console.log('\n=== Test 5: Get dropped steps ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000);
  const originalChain = createMockChain(deadline);
  const degradedChain = degradationService.degradeChain(originalChain);
  
  const droppedSteps = degradationService.getDroppedSteps(originalChain, degradedChain);
  
  console.log('Dropped steps:', droppedSteps);
  
  // Should include "Shower" (the only optional step)
  const hasShower = droppedSteps.includes('Shower');
  
  console.log('✓ Test passed:', hasShower && droppedSteps.length === 1);
  
  return hasShower && droppedSteps.length === 1;
}

/**
 * Test 6: getPreservedSteps
 */
function testGetPreservedSteps() {
  console.log('\n=== Test 6: Get preserved steps ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000);
  const chain = createMockChain(deadline);
  const degradedChain = degradationService.degradeChain(chain);
  
  const preservedSteps = degradationService.getPreservedSteps(degradedChain);
  
  console.log('Preserved steps:', preservedSteps);
  
  // Should NOT include "Shower"
  const noShower = !preservedSteps.includes('Shower');
  // Should include all required steps
  const hasRequired = preservedSteps.includes('Feed cat') && 
                      preservedSteps.includes('Bathroom') &&
                      preservedSteps.includes('Hygiene') &&
                      preservedSteps.includes('Get dressed') &&
                      preservedSteps.includes('Pack bag');
  
  console.log('✓ Test passed:', noShower && hasRequired);
  
  return noShower && hasRequired;
}

/**
 * Test 7: areRequiredStepsPreserved
 */
function testAreRequiredStepsPreserved() {
  console.log('\n=== Test 7: Check required steps preserved ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() + 60 * 60 * 1000);
  const chain = createMockChain(deadline);
  const degradedChain = degradationService.degradeChain(chain);
  
  const preserved = degradationService.areRequiredStepsPreserved(degradedChain);
  
  console.log('All required steps preserved:', preserved);
  console.log('✓ Test passed:', preserved === true);
  
  return preserved === true;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Degradation Service Test Suite                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results = [
    testShouldNotTriggerBeforeDeadline(),
    testShouldTriggerAfterDeadline(),
    testDegradeChainDropsOptionalSteps(),
    testDegradeChainPreservesRequiredSteps(),
    testGetDroppedSteps(),
    testGetPreservedSteps(),
    testAreRequiredStepsPreserved(),
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  Test Results: ${passed}/${total} passed                              ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (passed === total) {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  } else {
    console.log(`\n✗ ${total - passed} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
