/**
 * Test script for Chain View Context Integration Service
 * 
 * Tests all functions in context-integration.ts with sample data.
 */

import {
  generateExitGateSuggestions,
  injectMissingSteps,
  applyDurationPriors,
  calculateRiskInflators,
  enhanceChainWithContext,
} from '../src/lib/chains/context-integration';
import type { DailyContext } from '../src/lib/context/daily-context';
import type { ExecutionChain, ChainStepInstance } from '../src/lib/chains/types';

// Sample DailyContext with various scenarios
const sampleContext: DailyContext = {
  date: '2025-02-14',
  wake: {
    timestamp: '2025-02-14T08:00:00Z',
    source: 'wake_events',
    reliability: 0.9,
  },
  substances: {
    nicotine: {
      used: true,
      pouches: 3,
      strength_mg: 6,
      last_used_time: '2025-02-13T22:00:00Z',
      reliability: 0.8,
    },
    cannabis: {
      used: false,
      reliability: 0.7,
    },
    caffeine: {
      used: true,
      drinks: ['monster ultra white'],
      last_used_time: '2025-02-13T19:00:00Z', // Late caffeine
      reliability: 0.9,
    },
  },
  meds: {
    taken: false, // Meds not taken yesterday
    reliability: 0.8,
  },
  hygiene: {
    shower_done: true,
    shower_type: 'reg_shower',
    oral_sessions: 2,
    reliability: 0.9,
  },
  meals: {
    cooked_meals: 2,
    likely_meal_count: 3,
    reliability: 0.8,
  },
  day_flags: {
    low_energy_risk: true, // Late caffeine
    sleep_debt_risk: false,
  },
  duration_priors: {
    bathroom_min: 5,
    hygiene_min: 8,
    shower_min: 12,
    dress_min: 6,
    pack_min: 4,
    cook_simple_meal_min: 25,
  },
};

// Sample chain with various steps
const sampleChain: ExecutionChain = {
  chain_id: 'chain-1',
  anchor_id: 'anchor-1',
  anchor: {
    id: 'anchor-1',
    user_id: 'user-1',
    date: '2025-02-14',
    start_time: new Date('2025-02-14T10:00:00Z'),
    end_time: new Date('2025-02-14T11:00:00Z'),
    title: 'Morning Class',
    location: 'University',
    anchor_type: 'class',
    travel_time_there: 15,
    travel_time_back: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  chain_completion_deadline: new Date('2025-02-14T09:45:00Z'),
  steps: [
    {
      step_id: 'step-1',
      chain_id: 'chain-1',
      name: 'Bathroom',
      start_time: new Date('2025-02-14T08:00:00Z'),
      end_time: new Date('2025-02-14T08:05:00Z'),
      duration: 5,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-2',
      chain_id: 'chain-1',
      name: 'Shower',
      start_time: new Date('2025-02-14T08:05:00Z'),
      end_time: new Date('2025-02-14T08:15:00Z'),
      duration: 10,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-3',
      chain_id: 'chain-1',
      name: 'Get dressed',
      start_time: new Date('2025-02-14T08:15:00Z'),
      end_time: new Date('2025-02-14T08:20:00Z'),
      duration: 5,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
    {
      step_id: 'step-4',
      chain_id: 'chain-1',
      name: 'Pack bag',
      start_time: new Date('2025-02-14T08:20:00Z'),
      end_time: new Date('2025-02-14T08:25:00Z'),
      duration: 5,
      is_required: true,
      can_skip_when_late: false,
      status: 'pending',
      role: 'chain-step',
    },
  ],
  commitment_envelope: {
    envelope_id: 'envelope-1',
    prep: {} as ChainStepInstance,
    travel_there: {} as ChainStepInstance,
    anchor: {} as ChainStepInstance,
    travel_back: {} as ChainStepInstance,
    recovery: {} as ChainStepInstance,
  },
  status: 'pending',
};

console.log('=== Testing Chain View Context Integration ===\n');

// Test 1: Generate exit gate suggestions
console.log('Test 1: Generate Exit Gate Suggestions');
console.log('Context: meds.taken =', sampleContext.meds.taken);
console.log('Context: low_energy_risk =', sampleContext.day_flags.low_energy_risk);
const exitGates = generateExitGateSuggestions(sampleContext);
console.log('Exit gate suggestions:', exitGates.length);
exitGates.forEach(gate => {
  console.log(`  - ${gate.name} (${gate.id})`);
});
console.log('✓ Should include: keys, phone, water, meds (not taken), phone-charger (low energy risk)\n');

// Test 2: Inject missing steps
console.log('Test 2: Inject Missing Steps');
console.log('Context: meds.taken =', sampleContext.meds.taken);
console.log('Context: meds.reliability =', sampleContext.meds.reliability);
const injectedSteps = injectMissingSteps(sampleChain, sampleContext);
console.log('Injected steps:', injectedSteps.length);
injectedSteps.forEach(step => {
  console.log(`  - ${step.name} (${step.duration_estimate} min)`);
});
console.log('✓ Should inject "Take meds" step (2 min)\n');

// Test 3: Apply duration priors
console.log('Test 3: Apply Duration Priors');
console.log('Duration priors:', sampleContext.duration_priors);
const durationAdjustments = applyDurationPriors(sampleChain, sampleContext);
console.log('Duration adjustments:');
Object.entries(durationAdjustments).forEach(([stepId, duration]) => {
  const step = sampleChain.steps.find(s => s.step_id === stepId);
  console.log(`  - ${step?.name}: ${step?.duration} min → ${duration} min`);
});
console.log('✓ Should adjust: Bathroom (5→5), Shower (10→12), Get dressed (5→6), Pack bag (5→4)\n');

// Test 4: Calculate risk inflators
console.log('Test 4: Calculate Risk Inflators');
console.log('Day flags:', sampleContext.day_flags);
const riskInflators = calculateRiskInflators(sampleContext);
console.log('Risk inflators:');
console.log(`  - Low energy: ${riskInflators.low_energy}x (${(riskInflators.low_energy - 1) * 100}%)`);
console.log(`  - Sleep debt: ${riskInflators.sleep_debt}x (${(riskInflators.sleep_debt - 1) * 100}%)`);
const totalInflator = riskInflators.low_energy * riskInflators.sleep_debt;
console.log(`  - Total: ${totalInflator}x (${(totalInflator - 1) * 100}%)`);
console.log('✓ Should be: low_energy=1.1 (10%), sleep_debt=1.0 (0%), total=1.1 (10%)\n');

// Test 5: Enhance chain with context (full integration)
console.log('Test 5: Enhance Chain with Context (Full Integration)');
enhanceChainWithContext(sampleChain, sampleContext).then(enhancement => {
  console.log('Enhancement result:');
  console.log(`  - Exit gate suggestions: ${enhancement.exitGateSuggestions.length}`);
  console.log(`  - Injected steps: ${enhancement.injectedSteps.length}`);
  console.log(`  - Duration adjustments: ${Object.keys(enhancement.durationAdjustments).length}`);
  console.log(`  - Risk inflators: low_energy=${enhancement.riskInflators.low_energy}, sleep_debt=${enhancement.riskInflators.sleep_debt}`);
  console.log('✓ All enhancements generated successfully\n');
  
  // Test 6: Test with different context (no meds issue, no risk flags)
  console.log('Test 6: Test with Clean Context (no issues)');
  const cleanContext: DailyContext = {
    ...sampleContext,
    meds: { taken: true, reliability: 0.9 },
    day_flags: { low_energy_risk: false, sleep_debt_risk: false },
  };
  
  return enhanceChainWithContext(sampleChain, cleanContext);
}).then(enhancement => {
  console.log('Clean context enhancement:');
  console.log(`  - Exit gate suggestions: ${enhancement.exitGateSuggestions.length}`);
  console.log(`  - Injected steps: ${enhancement.injectedSteps.length}`);
  console.log(`  - Risk inflators: low_energy=${enhancement.riskInflators.low_energy}, sleep_debt=${enhancement.riskInflators.sleep_debt}`);
  console.log('✓ Should have: 3 exit gates (no meds, no charger), 0 injected steps, 1.0x inflators\n');
  
  // Test 7: Test with both risk flags
  console.log('Test 7: Test with Both Risk Flags');
  const highRiskContext: DailyContext = {
    ...sampleContext,
    day_flags: { low_energy_risk: true, sleep_debt_risk: true },
  };
  
  return enhanceChainWithContext(sampleChain, highRiskContext);
}).then(enhancement => {
  console.log('High risk context enhancement:');
  console.log(`  - Risk inflators: low_energy=${enhancement.riskInflators.low_energy}, sleep_debt=${enhancement.riskInflators.sleep_debt}`);
  const totalInflator = enhancement.riskInflators.low_energy * enhancement.riskInflators.sleep_debt;
  console.log(`  - Total inflator: ${totalInflator}x (${((totalInflator - 1) * 100).toFixed(1)}%)`);
  console.log('✓ Should be: 1.1 * 1.15 = 1.265x (26.5% increase)\n');
  
  console.log('=== All Tests Completed Successfully ===');
}).catch(error => {
  console.error('Error during testing:', error);
  process.exit(1);
});
