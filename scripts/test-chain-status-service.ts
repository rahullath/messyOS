// Test script for Chain Status Service

import { chainStatusService } from '../src/lib/chains/chain-status-service';
import type { ExecutionChain, ChainStepInstance } from '../src/lib/chains/types';
import type { Anchor } from '../src/lib/anchors/types';

/**
 * Create a mock execution chain for testing
 */
function createMockChain(
  anchorStart: Date,
  chainCompletionDeadline: Date,
  stepStatuses: Array<'pending' | 'in-progress' | 'completed' | 'skipped'>
): ExecutionChain {
  const anchorEnd = new Date(anchorStart.getTime() + 60 * 60 * 1000); // 1 hour later

  const anchor: Anchor = {
    id: 'anchor-1',
    start: anchorStart,
    end: anchorEnd,
    title: 'Test Class',
    location: 'Test Location',
    type: 'class',
    must_attend: true,
    calendar_event_id: 'cal-1',
  };

  const steps: ChainStepInstance[] = [
    {
      step_id: 'step-1',
      chain_id: 'chain-1',
      name: 'Feed cat',
      start_time: new Date(chainCompletionDeadline.getTime() - 60 * 60 * 1000),
      end_time: new Date(chainCompletionDeadline.getTime() - 55 * 60 * 1000),
      duration: 5,
      is_required: true,
      can_skip_when_late: false,
      status: stepStatuses[0] || 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-2',
      chain_id: 'chain-1',
      name: 'Shower',
      start_time: new Date(chainCompletionDeadline.getTime() - 55 * 60 * 1000),
      end_time: new Date(chainCompletionDeadline.getTime() - 40 * 60 * 1000),
      duration: 15,
      is_required: false,
      can_skip_when_late: true,
      status: stepStatuses[1] || 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-3',
      chain_id: 'chain-1',
      name: 'Pack bag',
      start_time: new Date(chainCompletionDeadline.getTime() - 40 * 60 * 1000),
      end_time: new Date(chainCompletionDeadline.getTime() - 30 * 60 * 1000),
      duration: 10,
      is_required: true,
      can_skip_when_late: false,
      status: stepStatuses[2] || 'pending',
      role: 'chain-step',
    },
  ];

  const anchorStep: ChainStepInstance = {
    step_id: 'anchor-step',
    chain_id: 'chain-1',
    name: 'Test Class',
    start_time: anchorStart,
    end_time: anchorEnd,
    duration: 60,
    is_required: true,
    can_skip_when_late: false,
    status: stepStatuses[3] || 'pending',
    role: 'anchor',
  };

  const chain: ExecutionChain = {
    chain_id: 'chain-1',
    anchor_id: 'anchor-1',
    anchor,
    chain_completion_deadline: chainCompletionDeadline,
    steps,
    status: 'pending',
    commitment_envelope: {
      envelope_id: 'env-1',
      prep: steps[0],
      travel_there: steps[1],
      anchor: anchorStep,
      travel_back: steps[2],
      recovery: steps[2],
    },
  };

  return chain;
}

/**
 * Test 1: Chain not started (pending)
 */
function testChainNotStarted() {
  console.log('\n=== Test 1: Chain Not Started ===');
  
  const now = new Date();
  const anchorStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
  const deadline = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
  
  const chain = createMockChain(anchorStart, deadline, ['pending', 'pending', 'pending', 'pending']);
  
  const result = chainStatusService.evaluateChainStatus(chain, now);
  
  console.log('Status:', result.status);
  console.log('Chain Integrity:', result.chain_integrity);
  console.log('Message:', result.message);
  console.log('Was Late:', result.was_late);
  
  console.log('✓ Expected: status=pending, integrity=intact');
  console.log(result.status === 'pending' && result.chain_integrity === 'intact' ? '✓ PASS' : '✗ FAIL');
}

/**
 * Test 2: Chain in progress
 */
function testChainInProgress() {
  console.log('\n=== Test 2: Chain In Progress ===');
  
  const now = new Date();
  const anchorStart = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
  const deadline = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago (late)
  
  const chain = createMockChain(anchorStart, deadline, ['completed', 'in-progress', 'pending', 'pending']);
  
  const result = chainStatusService.evaluateChainStatus(chain, now);
  
  console.log('Status:', result.status);
  console.log('Chain Integrity:', result.chain_integrity);
  console.log('Message:', result.message);
  console.log('Was Late:', result.was_late);
  
  console.log('✓ Expected: status=in-progress, was_late=true');
  console.log(result.status === 'in-progress' && result.was_late ? '✓ PASS' : '✗ FAIL');
}

/**
 * Test 3: Chain completed on time
 */
function testChainCompletedOnTime() {
  console.log('\n=== Test 3: Chain Completed On Time ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const anchorStart = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
  
  // Create chain where first step starts BEFORE deadline (on time)
  const chain = createMockChain(anchorStart, deadline, ['completed', 'completed', 'completed', 'completed']);
  
  // Manually adjust first step to start before deadline
  chain.steps[0].start_time = new Date(deadline.getTime() - 30 * 60 * 1000); // 30 min before deadline
  
  const result = chainStatusService.evaluateChainStatus(chain, now);
  
  console.log('Status:', result.status);
  console.log('Chain Integrity:', result.chain_integrity);
  console.log('Message:', result.message);
  console.log('Was Late:', result.was_late);
  console.log('Missing Steps:', result.missing_steps);
  console.log('First step start:', chain.steps[0].start_time);
  console.log('Deadline:', deadline);
  
  console.log('✓ Expected: status=completed, integrity=intact, was_late=false');
  console.log(
    result.status === 'completed' && 
    result.chain_integrity === 'intact' && 
    !result.was_late
      ? '✓ PASS' 
      : '✗ FAIL'
  );
}

/**
 * Test 4: Chain completed late but intact (SUCCESS)
 */
function testChainCompletedLateButIntact() {
  console.log('\n=== Test 4: Chain Completed Late But Intact (SUCCESS) ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const anchorStart = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
  
  const chain = createMockChain(anchorStart, deadline, ['completed', 'completed', 'completed', 'completed']);
  
  // Manually adjust first step to start AFTER deadline (late)
  chain.steps[0].start_time = new Date(deadline.getTime() + 30 * 60 * 1000); // 30 min after deadline (late)
  
  const result = chainStatusService.evaluateChainStatus(chain, now);
  
  console.log('Status:', result.status);
  console.log('Chain Integrity:', result.chain_integrity);
  console.log('Message:', result.message);
  console.log('Was Late:', result.was_late);
  console.log('Missing Steps:', result.missing_steps);
  console.log('First step start:', chain.steps[0].start_time);
  console.log('Deadline:', deadline);
  
  console.log('✓ Expected: status=completed, integrity=intact, was_late=true');
  console.log('✓ This is SUCCESS (late but complete)');
  console.log(
    result.status === 'completed' && 
    result.chain_integrity === 'intact' && 
    result.was_late
      ? '✓ PASS' 
      : '✗ FAIL'
  );
}

/**
 * Test 5: Chain completed on time but missing required steps (FAILURE)
 */
function testChainCompletedMissingSteps() {
  console.log('\n=== Test 5: Chain Completed On Time But Missing Required Steps (FAILURE) ===');
  
  const now = new Date();
  const deadline = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const anchorStart = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
  
  // Missing required step: "Pack bag" (step 3)
  const chain = createMockChain(anchorStart, deadline, ['completed', 'skipped', 'pending', 'completed']);
  
  // Manually adjust first step to start before deadline (on time)
  chain.steps[0].start_time = new Date(deadline.getTime() - 30 * 60 * 1000); // 30 min before deadline
  
  const result = chainStatusService.evaluateChainStatus(chain, now);
  
  console.log('Status:', result.status);
  console.log('Chain Integrity:', result.chain_integrity);
  console.log('Message:', result.message);
  console.log('Was Late:', result.was_late);
  console.log('Missing Steps:', result.missing_steps);
  console.log('First step start:', chain.steps[0].start_time);
  console.log('Deadline:', deadline);
  
  console.log('✓ Expected: status=failed, integrity=broken, was_late=false');
  console.log('✓ This is FAILURE (on time but incomplete)');
  console.log(
    result.status === 'failed' && 
    result.chain_integrity === 'broken' && 
    !result.was_late &&
    result.missing_steps.length > 0
      ? '✓ PASS' 
      : '✗ FAIL'
  );
}

/**
 * Test 6: Should not trigger replanning mid-flow
 */
function testNoReplanningMidFlow() {
  console.log('\n=== Test 6: No Replanning Mid-Flow (Momentum Preservation) ===');
  
  const now = new Date();
  const anchorStart = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour from now
  const deadline = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago (late)
  
  // Chain is running late but in progress
  const chain = createMockChain(anchorStart, deadline, ['completed', 'in-progress', 'pending', 'pending']);
  
  const shouldReplan = chainStatusService.shouldTriggerReplanning(chain);
  
  console.log('Should Trigger Replanning:', shouldReplan);
  console.log('✓ Expected: false (never replan mid-flow)');
  console.log(!shouldReplan ? '✓ PASS' : '✗ FAIL');
}

/**
 * Test 7: Mark step as completed
 */
function testMarkStepCompleted() {
  console.log('\n=== Test 7: Mark Step As Completed ===');
  
  const now = new Date();
  const anchorStart = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() + 30 * 60 * 1000);
  
  let chain = createMockChain(anchorStart, deadline, ['pending', 'pending', 'pending', 'pending']);
  
  console.log('Initial status:', chain.status);
  console.log('Initial step 1 status:', chain.steps[0].status);
  
  // Mark first step as completed
  chain = chainStatusService.markStepCompleted(chain, 'step-1');
  
  console.log('After marking step 1 completed:');
  console.log('Chain status:', chain.status);
  console.log('Step 1 status:', chain.steps[0].status);
  
  console.log('✓ Expected: step status=completed, chain status=in-progress');
  console.log(
    chain.steps[0].status === 'completed' && 
    chain.status === 'in-progress'
      ? '✓ PASS' 
      : '✗ FAIL'
  );
}

/**
 * Test 8: Get chain integrity
 */
function testGetChainIntegrity() {
  console.log('\n=== Test 8: Get Chain Integrity ===');
  
  const now = new Date();
  const anchorStart = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  // All required steps completed
  const intactChain = createMockChain(anchorStart, deadline, ['completed', 'completed', 'completed', 'completed']);
  const intactIntegrity = chainStatusService.getChainIntegrity(intactChain);
  
  console.log('Intact chain integrity:', intactIntegrity);
  console.log('✓ Expected: intact');
  console.log(intactIntegrity === 'intact' ? '✓ PASS' : '✗ FAIL');
  
  // Missing required step
  const brokenChain = createMockChain(anchorStart, deadline, ['completed', 'skipped', 'pending', 'completed']);
  const brokenIntegrity = chainStatusService.getChainIntegrity(brokenChain);
  
  console.log('Broken chain integrity:', brokenIntegrity);
  console.log('✓ Expected: broken');
  console.log(brokenIntegrity === 'broken' ? '✓ PASS' : '✗ FAIL');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=================================================');
  console.log('Chain Status Service Tests');
  console.log('=================================================');

  testChainNotStarted();
  testChainInProgress();
  testChainCompletedOnTime();
  testChainCompletedLateButIntact();
  testChainCompletedMissingSteps();
  testNoReplanningMidFlow();
  testMarkStepCompleted();
  testGetChainIntegrity();

  console.log('\n=================================================');
  console.log('All tests completed');
  console.log('=================================================');
}

// Run tests
runTests().catch(console.error);
