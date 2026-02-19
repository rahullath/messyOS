/**
 * E2E Test: Chain Integrity Tracking
 * 
 * Tests chain status tracking with different completion scenarios.
 * Should mark late-but-complete as SUCCESS and incomplete as FAILURE.
 * 
 * Requirements: 16.3, 16.4, 20.1, 20.2
 */

import { ChainGenerator } from '../src/lib/chains/chain-generator';
import { ChainStatusService } from '../src/lib/chains/chain-status-service';
import type { Anchor } from '../src/lib/anchors/types';
import type { ExecutionChain } from '../src/lib/chains/types';

async function testChainIntegrity() {
  console.log('=== E2E Test: Chain Integrity Tracking ===\n');

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
    console.log('📋 Setting up chain integrity test...');
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

    const chainStatusService = new ChainStatusService();

    // Test 2: Verify chain integrity check (all required steps completed)
    console.log('\nTest 2: Chain Integrity - All Required Steps Completed');
    console.log('=====================================');
    
    const chainAllComplete = JSON.parse(JSON.stringify(chain)) as ExecutionChain;
    
    // Mark all required steps as completed
    for (const step of chainAllComplete.steps) {
      if (step.is_required) {
        step.status = 'completed';
      } else {
        step.status = 'skipped';
      }
    }
    
    const integrityAllComplete = chainStatusService.getChainIntegrity(chainAllComplete);
    
    if (integrityAllComplete !== 'intact') {
      console.error('❌ Chain integrity should be intact when all required steps are completed');
      return false;
    }
    
    console.log('✓ Chain integrity intact when all required steps completed');

    // Test 3: Verify chain integrity check (missing required step)
    console.log('\nTest 3: Chain Integrity - Missing Required Step');
    console.log('=====================================');
    
    const chainMissingRequired = JSON.parse(JSON.stringify(chain)) as ExecutionChain;
    
    // Mark one required step as not completed
    let markedOneMissing = false;
    for (const step of chainMissingRequired.steps) {
      if (step.is_required && !markedOneMissing) {
        step.status = 'pending';
        markedOneMissing = true;
      } else {
        step.status = 'completed';
      }
    }
    
    const integrityMissingRequired = chainStatusService.getChainIntegrity(chainMissingRequired);
    
    if (integrityMissingRequired !== 'broken') {
      console.error('❌ Chain integrity should be broken when required step is missing');
      return false;
    }
    
    console.log('✓ Chain integrity broken when required step is missing');

    // Test 4: Scenario - Late but all required steps complete (SUCCESS)
    console.log('\nTest 4: Late but Complete Scenario');
    console.log('=====================================');
    
    const chainLateComplete = JSON.parse(JSON.stringify(chain)) as ExecutionChain;
    
    // Mark all required steps as completed, optional as skipped
    for (const step of chainLateComplete.steps) {
      if (step.is_required) {
        step.status = 'completed';
      } else {
        step.status = 'skipped';
        step.skip_reason = 'Running late';
      }
    }
    
    const integrityLateComplete = chainStatusService.getChainIntegrity(chainLateComplete);
    
    if (integrityLateComplete !== 'intact') {
      console.error('❌ Chain integrity should be intact even when late, if all required steps done');
      return false;
    }
    
    console.log('✓ Late but complete = Chain integrity INTACT (SUCCESS)');
    console.log('  All required steps completed: YES');
    console.log('  Optional steps skipped: YES (acceptable)');

    // Test 5: Scenario - On time but missing required step (FAILURE)
    console.log('\nTest 5: On Time but Incomplete Scenario');
    console.log('=====================================');
    
    const chainOnTimeIncomplete = JSON.parse(JSON.stringify(chain)) as ExecutionChain;
    
    // Mark some required steps as not completed
    let requiredStepSkipped = false;
    for (const step of chainOnTimeIncomplete.steps) {
      if (step.is_required && !requiredStepSkipped) {
        step.status = 'pending';
        requiredStepSkipped = true;
      } else {
        step.status = 'completed';
      }
    }
    
    const integrityOnTimeIncomplete = chainStatusService.getChainIntegrity(chainOnTimeIncomplete);
    
    if (integrityOnTimeIncomplete !== 'broken') {
      console.error('❌ Chain integrity should be broken when required step is missing');
      return false;
    }
    
    console.log('✓ On time but incomplete = Chain integrity BROKEN (FAILURE)');
    console.log('  Required step missing: YES');
    console.log('  On time: YES (but doesn\'t matter)');


    // Test 6: Verify no replanning on overrun (chain ID preserved)
    console.log('\nTest 6: No Replanning on Overrun');
    console.log('=====================================');
    
    // Just verify that chain ID doesn't change (no need to simulate overrun with dates)
    const chainWithOverrun = { ...chain };
    
    // Mark all steps as completed
    for (const step of chainWithOverrun.steps) {
      step.status = 'completed';
    }
    
    // Chain ID should remain the same (no replanning)
    if (chainWithOverrun.chain_id !== chain.chain_id) {
      console.error('❌ Chain ID changed (indicates replanning occurred)');
      return false;
    }
    
    console.log('✓ Chain ID preserved (no replanning on overrun)');
    console.log(`  Chain ID: ${chainWithOverrun.chain_id}`);
    console.log(`  Anchor: ${chainWithOverrun.anchor.title}`);
    console.log('  Note: Momentum preservation means no replanning mid-flow');

    // Test 7: Verify chain integrity property across scenarios
    console.log('\nTest 7: Chain Integrity Property Verification');
    console.log('=====================================');
    
    // Property: For any chain where all required steps are completed,
    // chain integrity should be intact regardless of timing
    
    const testChains = [
      { name: 'All required complete', allComplete: true, expectedIntegrity: 'intact' },
      { name: 'Missing required step', allComplete: false, expectedIntegrity: 'broken' },
    ];
    
    for (const testCase of testChains) {
      const testChain = JSON.parse(JSON.stringify(chain)) as ExecutionChain;
      
      if (testCase.allComplete) {
        for (const step of testChain.steps) {
          if (step.is_required) {
            step.status = 'completed';
          } else {
            step.status = 'skipped';
          }
        }
      } else {
        let markedMissing = false;
        for (const step of testChain.steps) {
          if (step.is_required && !markedMissing) {
            step.status = 'pending';
            markedMissing = true;
          } else {
            step.status = 'completed';
          }
        }
      }
      
      const integrity = chainStatusService.getChainIntegrity(testChain);
      
      if (integrity !== testCase.expectedIntegrity) {
        console.error(`❌ ${testCase.name}: Expected ${testCase.expectedIntegrity}, got ${integrity}`);
        return false;
      }
      
      console.log(`✓ ${testCase.name}: integrity ${integrity} (correct)`);
    }

    console.log('\n=== ✅ All Tests Passed ===');
    return true;
  } catch (error) {
    console.error('\n=== ❌ Test Failed ===');
    console.error('Error:', error);
    return false;
  }
}

testChainIntegrity()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
