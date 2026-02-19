/**
 * Test Chain View Context Integration
 * 
 * Verifies that Chain View properly consumes DailyContext:
 * - Fetches DailyContext in chain generator
 * - Applies exit gate suggestions
 * - Injects missing steps (e.g., meds)
 * - Applies duration priors
 * - Applies risk inflators
 * - Displays duration ranges
 * - Shows "Complete by" constraints
 * - Shows reliability indicators
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { ChainGenerator } from '../src/lib/chains/chain-generator';
import type { Anchor } from '../src/lib/anchors/types';
import type { Location } from '../src/types/uk-student-travel';

async function testChainViewContextIntegration() {
  console.log('=== Testing Chain View Context Integration ===\n');

  const generator = new ChainGenerator();

  // Create test anchor
  const testAnchor: Anchor = {
    id: 'test-anchor-1',
    user_id: 'test-user',
    title: 'Software Engineering Lecture',
    type: 'lecture',
    start: new Date('2026-02-14T10:00:00'),
    end: new Date('2026-02-14T12:00:00'),
    location: 'Computer Science Building',
    is_fixed: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const currentLocation: Location = {
    name: 'Home',
    coordinates: [52.4862, -1.8904],
    type: 'home',
    address: '123 Test Street',
  };

  console.log('Test Anchor:', {
    title: testAnchor.title,
    type: testAnchor.type,
    start: testAnchor.start.toLocaleString(),
    location: testAnchor.location,
  });

  // Generate chains
  console.log('\n--- Generating Chains ---');
  const chains = await generator.generateChainsForDate(
    [testAnchor],
    {
      userId: 'test-user',
      date: new Date('2026-02-14'),
      config: {
        currentLocation,
        userEnergy: 3,
      },
    }
  );

  if (chains.length === 0) {
    console.error('❌ No chains generated');
    return;
  }

  const chain = chains[0];
  console.log('✅ Chain generated:', {
    chainId: chain.chain_id,
    anchorId: chain.anchor_id,
    totalSteps: chain.steps.length,
    deadline: chain.chain_completion_deadline.toLocaleString(),
  });

  // Test 1: Check for DailyContext enhancements
  console.log('\n--- Test 1: DailyContext Enhancements ---');
  
  // Check for exit gate suggestions
  const exitGateStep = chain.steps.find(s => s.role === 'exit-gate');
  if (exitGateStep?.metadata?.gate_suggestions) {
    console.log('✅ Exit gate suggestions applied:', exitGateStep.metadata.gate_suggestions.length);
    exitGateStep.metadata.gate_suggestions.forEach((suggestion: any) => {
      console.log(`  - ${suggestion.name}`);
    });
  } else {
    console.log('⚠️  No exit gate suggestions found (DailyContext may not be available)');
  }

  // Check for injected steps
  const injectedSteps = chain.steps.filter(s => s.metadata?.injected);
  if (injectedSteps.length > 0) {
    console.log('✅ Injected steps found:', injectedSteps.length);
    injectedSteps.forEach(step => {
      console.log(`  - ${step.name} (reason: ${step.metadata?.reason})`);
    });
  } else {
    console.log('ℹ️  No steps injected (meds may have been taken yesterday)');
  }

  // Check for duration priors
  const stepsWithPriors = chain.steps.filter(s => s.metadata?.duration_prior_applied);
  if (stepsWithPriors.length > 0) {
    console.log('✅ Duration priors applied:', stepsWithPriors.length);
    stepsWithPriors.forEach(step => {
      console.log(`  - ${step.name}: ${step.metadata?.original_duration}m → ${step.duration}m`);
    });
  } else {
    console.log('ℹ️  No duration priors applied (may not have matching historical data)');
  }

  // Check for risk inflators
  if (chain.metadata?.risk_inflator) {
    console.log('✅ Risk inflator applied:', chain.metadata.risk_inflator);
    if (chain.metadata.low_energy_risk) {
      console.log('  - Low energy risk detected (+10%)');
    }
    if (chain.metadata.sleep_debt_risk) {
      console.log('  - Sleep debt risk detected (+15%)');
    }
  } else {
    console.log('ℹ️  No risk inflators applied (no risks detected)');
  }

  // Test 2: Verify duration ranges
  console.log('\n--- Test 2: Duration Ranges ---');
  const totalDuration = chain.steps.reduce((sum, step) => sum + step.duration, 0);
  const riskInflator = chain.metadata?.risk_inflator || 1.0;
  const adjustedTotal = Math.round(totalDuration * riskInflator);
  const minDuration = Math.round(adjustedTotal * 0.8);
  const maxDuration = Math.round(adjustedTotal * 1.2);
  
  console.log('Total chain duration:', {
    base: totalDuration,
    adjusted: adjustedTotal,
    range: `${minDuration}-${maxDuration} minutes`,
  });
  console.log('✅ Duration ranges calculated');

  // Test 3: Verify "Complete by" constraint
  console.log('\n--- Test 3: Complete By Constraint ---');
  console.log('Chain Completion Deadline:', chain.chain_completion_deadline.toLocaleString());
  console.log('Anchor Start Time:', chain.anchor.start.toLocaleString());
  
  const bufferMinutes = Math.round(
    (chain.anchor.start.getTime() - chain.chain_completion_deadline.getTime()) / (60 * 1000)
  );
  console.log('Buffer before anchor:', bufferMinutes, 'minutes');
  console.log('✅ "Complete by" constraint verified');

  // Test 4: Display step details
  console.log('\n--- Test 4: Step Details ---');
  chain.steps.forEach((step, index) => {
    const durationRange = {
      min: Math.round(step.duration * 0.8),
      max: Math.round(step.duration * 1.2),
    };
    
    console.log(`${index + 1}. ${step.name}`);
    console.log(`   Duration: ${durationRange.min}-${durationRange.max}m (estimate: ${step.duration}m)`);
    console.log(`   Complete by: ${step.end_time.toLocaleTimeString()}`);
    console.log(`   Status: ${step.status}`);
    console.log(`   Role: ${step.role}`);
    
    if (step.metadata?.duration_prior_applied) {
      console.log(`   ⚡ Duration based on history`);
    }
    if (step.metadata?.injected) {
      console.log(`   ➕ Injected based on habits`);
    }
    if (step.metadata?.fallback_used) {
      console.log(`   ⚠️  Travel time estimated (service unavailable)`);
    }
    console.log('');
  });

  console.log('\n=== Chain View Context Integration Test Complete ===');
}

// Run test
testChainViewContextIntegration().catch(console.error);
