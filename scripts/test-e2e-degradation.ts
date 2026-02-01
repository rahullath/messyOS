/**
 * E2E Test: Degradation Scenario
 * 
 * Tests chain degradation when running late.
 * Should drop optional steps and preserve required steps.
 * 
 * Requirements: 15.1, 15.2, 15.3
 */

import { ChainGenerator } from '../src/lib/chains/chain-generator';
import { DegradationService } from '../src/lib/chains/degradation-service';
import type { Anchor } from '../src/lib/anchors/types';

async function testDegradation() {
  console.log('=== E2E Test: Degradation Scenario ===\n');

  const today = new Date('2025-02-01T00:00:00Z');

  // Create a class anchor
  const mockAnchor: Anchor = {
    id: 'anchor-1',
    start: new Date('2025-02-01T10:00:00Z'),
    end: new Date('2025-02-01T11:00:00Z'),
    title: 'Computer Science Lecture',
    location: 'Room 101',
    type: 'class',
    must_attend: true,
    calendar_event_id: 'cal-1',
  };

  try {
    console.log('📋 Setting up degradation scenario...');
    console.log(`   Anchor: ${mockAnchor.title}`);
    console.log(`   Time: ${mockAnchor.start.toLocaleTimeString()} - ${mockAnchor.end.toLocaleTimeString()}\n`);

    // Test 1: Generate chain
    console.log('Test 1: Initial Chain Generation');
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
    console.log(`  Completion Deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);
    console.log(`  Total Steps: ${chain.steps.length}`);

    // Test 2: Identify optional and required steps
    console.log('\nTest 2: Step Classification');
    console.log('=====================================');
    
    const requiredSteps = chain.steps.filter(s => s.is_required);
    const optionalSteps = chain.steps.filter(s => !s.is_required);
    
    console.log(`Required steps: ${requiredSteps.length}`);
    for (const step of requiredSteps) {
      console.log(`  - ${step.name} (can_skip_when_late: ${step.can_skip_when_late})`);
    }
    
    console.log(`\nOptional steps: ${optionalSteps.length}`);
    for (const step of optionalSteps) {
      console.log(`  - ${step.name} (can_skip_when_late: ${step.can_skip_when_late})`);
    }

    // Test 3: Check if degradation should trigger (before deadline)
    console.log('\nTest 3: Degradation Trigger Check (Before Deadline)');
    console.log('=====================================');
    
    const degradationService = new DegradationService();
    
    // Current time is before deadline - should NOT trigger
    const currentTimeBeforeDeadline = new Date(chain.chain_completion_deadline.getTime() - 10 * 60 * 1000); // 10 min before
    const chainBeforeDeadline = { ...chain };
    const shouldTriggerBefore = degradationService.shouldTriggerDegradation(
      chainBeforeDeadline,
      currentTimeBeforeDeadline
    );
    
    if (shouldTriggerBefore) {
      console.error('❌ Degradation should NOT trigger before deadline');
      return false;
    }
    
    console.log(`✓ Degradation does NOT trigger before deadline`);
    console.log(`  Current time: ${currentTimeBeforeDeadline.toLocaleTimeString()}`);
    console.log(`  Deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);

    // Test 4: Check if degradation should trigger (after deadline)
    console.log('\nTest 4: Degradation Trigger Check (After Deadline)');
    console.log('=====================================');
    
    // Current time is after deadline - should trigger
    const currentTimeAfterDeadline = new Date(chain.chain_completion_deadline.getTime() + 5 * 60 * 1000); // 5 min after
    const chainAfterDeadline = { ...chain };
    const shouldTriggerAfter = degradationService.shouldTriggerDegradation(
      chainAfterDeadline,
      currentTimeAfterDeadline
    );
    
    if (!shouldTriggerAfter) {
      console.error('❌ Degradation SHOULD trigger after deadline');
      return false;
    }
    
    console.log(`✓ Degradation triggers after deadline`);
    console.log(`  Current time: ${currentTimeAfterDeadline.toLocaleTimeString()}`);
    console.log(`  Deadline: ${chain.chain_completion_deadline.toLocaleTimeString()}`);

    // Test 5: Degrade the chain
    console.log('\nTest 5: Chain Degradation');
    console.log('=====================================');
    
    const degradedChain = degradationService.degradeChain(chain);
    
    console.log(`✓ Chain degraded`);
    console.log(`  Original steps: ${chain.steps.length}`);
    console.log(`  Degraded steps: ${degradedChain.steps.length}`);

    // Test 6: Verify optional steps are dropped
    console.log('\nTest 6: Optional Steps Dropped');
    console.log('=====================================');
    
    const droppedSteps = chain.steps.filter(originalStep => {
      return !degradedChain.steps.some(degradedStep => degradedStep.step_id === originalStep.step_id);
    });
    
    console.log(`Dropped steps: ${droppedSteps.length}`);
    for (const step of droppedSteps) {
      console.log(`  - ${step.name} (required: ${step.is_required}, can_skip: ${step.can_skip_when_late})`);
      
      if (step.is_required) {
        console.error(`  ❌ Required step was dropped!`);
        return false;
      }
      
      if (!step.can_skip_when_late) {
        console.error(`  ❌ Step that cannot be skipped was dropped!`);
        return false;
      }
    }
    
    console.log('✓ All dropped steps are optional and can be skipped when late');

    // Test 7: Verify required steps are preserved
    console.log('\nTest 7: Required Steps Preserved');
    console.log('=====================================');
    
    for (const requiredStep of requiredSteps) {
      const isPreserved = degradedChain.steps.some(s => s.step_id === requiredStep.step_id);
      
      if (!isPreserved) {
        console.error(`❌ Required step "${requiredStep.name}" was not preserved`);
        return false;
      }
      
      console.log(`✓ Required step preserved: ${requiredStep.name}`);
    }

    // Test 8: Verify skipped steps have correct status and skip_reason
    console.log('\nTest 8: Skipped Step Metadata');
    console.log('=====================================');
    
    const skippedSteps = degradedChain.steps.filter(s => s.status === 'skipped');
    
    console.log(`Skipped steps in degraded chain: ${skippedSteps.length}`);
    for (const step of skippedSteps) {
      console.log(`  - ${step.name}`);
      console.log(`    Status: ${step.status}`);
      console.log(`    Skip reason: ${step.skip_reason || 'NOT SET'}`);
      
      if (step.status !== 'skipped') {
        console.error(`  ❌ Status should be 'skipped'`);
        return false;
      }
      
      if (!step.skip_reason || !step.skip_reason.includes('late')) {
        console.error(`  ❌ Skip reason should mention running late`);
        return false;
      }
    }
    
    console.log('✓ All skipped steps have correct status and skip_reason');

    // Test 9: Verify degraded chain still has Exit Gate
    console.log('\nTest 9: Exit Gate Preservation');
    console.log('=====================================');
    
    const exitGateInOriginal = chain.steps.find(s => s.role === 'exit-gate');
    const exitGateInDegraded = degradedChain.steps.find(s => s.role === 'exit-gate');
    
    if (!exitGateInOriginal) {
      console.error('❌ Original chain missing Exit Gate');
      return false;
    }
    
    if (!exitGateInDegraded) {
      console.error('❌ Degraded chain missing Exit Gate');
      return false;
    }
    
    console.log('✓ Exit Gate preserved in degraded chain');
    console.log(`  Original: ${exitGateInOriginal.name}`);
    console.log(`  Degraded: ${exitGateInDegraded.name}`);

    // Test 10: Verify degraded chain maintains step ordering
    console.log('\nTest 10: Degraded Chain Step Ordering');
    console.log('=====================================');
    
    for (let i = 0; i < degradedChain.steps.length - 1; i++) {
      const currentStep = degradedChain.steps[i];
      const nextStep = degradedChain.steps[i + 1];
      
      // Skip ordering check for skipped steps
      if (currentStep.status === 'skipped' || nextStep.status === 'skipped') {
        continue;
      }
      
      if (currentStep.end_time.getTime() > nextStep.start_time.getTime()) {
        console.error(`❌ Step ordering broken between ${currentStep.name} and ${nextStep.name}`);
        return false;
      }
    }
    
    console.log('✓ Degraded chain maintains correct step ordering');

    // Test 11: Verify commitment envelope is preserved
    console.log('\nTest 11: Commitment Envelope Preservation');
    console.log('=====================================');
    
    const originalEnvelope = chain.commitment_envelope;
    const degradedEnvelope = degradedChain.commitment_envelope;
    
    if (!degradedEnvelope) {
      console.error('❌ Degraded chain missing commitment envelope');
      return false;
    }
    
    const envelopeComponents = ['prep', 'travel_there', 'anchor', 'travel_back', 'recovery'];
    for (const component of envelopeComponents) {
      const original = (originalEnvelope as any)[component];
      const degraded = (degradedEnvelope as any)[component];
      
      if (!degraded) {
        console.error(`❌ Degraded envelope missing ${component}`);
        return false;
      }
      
      console.log(`✓ ${component}: preserved`);
    }

    // Test 12: Verify no replanning occurs (momentum preservation)
    console.log('\nTest 12: Momentum Preservation (No Replanning)');
    console.log('=====================================');
    
    // The degraded chain should have the same chain_id and anchor
    if (degradedChain.chain_id !== chain.chain_id) {
      console.error('❌ Chain ID changed (indicates replanning)');
      return false;
    }
    
    if (degradedChain.anchor.id !== chain.anchor.id) {
      console.error('❌ Anchor changed (indicates replanning)');
      return false;
    }
    
    console.log('✓ Chain ID and anchor preserved (no replanning)');
    console.log(`  Chain ID: ${degradedChain.chain_id}`);
    console.log(`  Anchor: ${degradedChain.anchor.title}`);

    console.log('\n=== ✅ All Tests Passed ===');
    return true;
  } catch (error) {
    console.error('\n=== ❌ Test Failed ===');
    console.error('Error:', error);
    return false;
  }
}

testDegradation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
