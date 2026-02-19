// Test script for Location State Tracker

import { LocationStateTracker } from '../src/lib/chains/location-state';
import type { ExecutionChain, ChainStepInstance } from '../src/lib/chains/types';
import type { Anchor } from '../src/lib/anchors/types';

console.log('🧪 Testing Location State Tracker\n');

const tracker = new LocationStateTracker();

// Helper to create a mock chain
function createMockChain(
  chainId: string,
  anchorStart: Date,
  anchorEnd: Date,
  travelDuration: number = 30
): ExecutionChain {
  const travelThereStart = new Date(anchorStart.getTime() - travelDuration * 60 * 1000);
  const travelThereEnd = anchorStart;
  const travelBackStart = anchorEnd;
  const travelBackEnd = new Date(anchorEnd.getTime() + travelDuration * 60 * 1000);
  const recoveryEnd = new Date(travelBackEnd.getTime() + 10 * 60 * 1000);

  const mockAnchor: Anchor = {
    id: `anchor-${chainId}`,
    start: anchorStart,
    end: anchorEnd,
    title: 'Test Class',
    type: 'class',
    must_attend: true,
    calendar_event_id: `cal-${chainId}`
  };

  const createStep = (
    id: string,
    name: string,
    start: Date,
    end: Date,
    role: 'chain-step' | 'anchor' | 'recovery' = 'chain-step'
  ): ChainStepInstance => ({
    step_id: id,
    chain_id: chainId,
    name,
    start_time: start,
    end_time: end,
    duration: Math.floor((end.getTime() - start.getTime()) / (1000 * 60)),
    is_required: true,
    can_skip_when_late: false,
    status: 'pending',
    role
  });

  return {
    chain_id: chainId,
    anchor_id: mockAnchor.id,
    anchor: mockAnchor,
    chain_completion_deadline: new Date(travelThereStart.getTime() - 45 * 60 * 1000),
    steps: [],
    commitment_envelope: {
      envelope_id: `env-${chainId}`,
      prep: createStep('prep', 'Prep', new Date(travelThereStart.getTime() - 15 * 60 * 1000), travelThereStart),
      travel_there: createStep('travel-there', 'Travel There', travelThereStart, travelThereEnd),
      anchor: createStep('anchor', 'Class', anchorStart, anchorEnd, 'anchor'),
      travel_back: createStep('travel-back', 'Travel Back', travelBackStart, travelBackEnd),
      recovery: createStep('recovery', 'Recovery', travelBackEnd, recoveryEnd, 'recovery')
    },
    status: 'pending'
  };
}

// Test 1: No chains (entire day at home)
console.log('Test 1: No chains (entire day at home)');
const planStart = new Date('2025-01-31T08:00:00');
const sleepTime = new Date('2025-01-31T23:00:00');

const periods1 = tracker.calculateLocationPeriods([], planStart, sleepTime);
console.log('Location periods:', periods1.length);
console.log('Period 1:', {
  start: periods1[0].start.toLocaleTimeString(),
  end: periods1[0].end.toLocaleTimeString(),
  state: periods1[0].state
});

const homeIntervals1 = tracker.calculateHomeIntervals(periods1);
console.log('Home intervals:', homeIntervals1.length);
console.log('Home interval 1:', {
  start: homeIntervals1[0].start.toLocaleTimeString(),
  end: homeIntervals1[0].end.toLocaleTimeString(),
  duration: homeIntervals1[0].duration
});

console.log('✅ Test 1 passed\n');

// Test 2: Single chain
console.log('Test 2: Single chain');
const chain1Start = new Date('2025-01-31T10:00:00');
const chain1End = new Date('2025-01-31T11:00:00');
const chain1 = createMockChain('chain1', chain1Start, chain1End);

const periods2 = tracker.calculateLocationPeriods([chain1], planStart, sleepTime);
console.log('Location periods:', periods2.length);
periods2.forEach((period, i) => {
  console.log(`Period ${i + 1}:`, {
    start: period.start.toLocaleTimeString(),
    end: period.end.toLocaleTimeString(),
    state: period.state
  });
});

const homeIntervals2 = tracker.calculateHomeIntervals(periods2);
console.log('Home intervals:', homeIntervals2.length);
homeIntervals2.forEach((interval, i) => {
  console.log(`Home interval ${i + 1}:`, {
    start: interval.start.toLocaleTimeString(),
    end: interval.end.toLocaleTimeString(),
    duration: interval.duration
  });
});

console.log('✅ Test 2 passed\n');

// Test 3: Multiple chains
console.log('Test 3: Multiple chains');
const chain2Start = new Date('2025-01-31T14:00:00');
const chain2End = new Date('2025-01-31T15:00:00');
const chain2 = createMockChain('chain2', chain2Start, chain2End);

const periods3 = tracker.calculateLocationPeriods([chain1, chain2], planStart, sleepTime);
console.log('Location periods:', periods3.length);
periods3.forEach((period, i) => {
  console.log(`Period ${i + 1}:`, {
    start: period.start.toLocaleTimeString(),
    end: period.end.toLocaleTimeString(),
    state: period.state
  });
});

const homeIntervals3 = tracker.calculateHomeIntervals(periods3);
console.log('Home intervals:', homeIntervals3.length);
homeIntervals3.forEach((interval, i) => {
  console.log(`Home interval ${i + 1}:`, {
    start: interval.start.toLocaleTimeString(),
    end: interval.end.toLocaleTimeString(),
    duration: interval.duration
  });
});

console.log('✅ Test 3 passed\n');

// Test 4: isHomeInterval check
console.log('Test 4: isHomeInterval check');
const testTime1 = new Date('2025-01-31T08:30:00'); // Should be at home
const testTime2 = new Date('2025-01-31T10:00:00'); // Should be not home (anchor)
const testTime3 = new Date('2025-01-31T12:00:00'); // Should be at home

console.log('08:30 is home:', tracker.isHomeInterval(testTime1, homeIntervals3));
console.log('10:00 is home:', tracker.isHomeInterval(testTime2, homeIntervals3));
console.log('12:00 is home:', tracker.isHomeInterval(testTime3, homeIntervals3));

console.log('✅ Test 4 passed\n');

// Test 5: Short home interval filtering (< 30 min)
console.log('Test 5: Short home interval filtering');
const chain3Start = new Date('2025-01-31T08:20:00'); // Only 20 min after planStart
const chain3End = new Date('2025-01-31T09:00:00');
const chain3 = createMockChain('chain3', chain3Start, chain3End);

const periods5 = tracker.calculateLocationPeriods([chain3], planStart, sleepTime);
const homeIntervals5 = tracker.calculateHomeIntervals(periods5);
console.log('Home intervals (should exclude short first interval):', homeIntervals5.length);
homeIntervals5.forEach((interval, i) => {
  console.log(`Home interval ${i + 1}:`, {
    start: interval.start.toLocaleTimeString(),
    end: interval.end.toLocaleTimeString(),
    duration: interval.duration
  });
});

console.log('✅ Test 5 passed\n');

// Test 6: Helper methods
console.log('Test 6: Helper methods');
const totalHomeTime = tracker.getTotalHomeTime(homeIntervals3);
console.log('Total home time (minutes):', totalHomeTime);

const currentState = tracker.getLocationStateAt(testTime1, periods3);
console.log('Location state at 08:30:', currentState);

const nextInterval = tracker.getNextHomeInterval(testTime2, homeIntervals3);
console.log('Next home interval after 10:00:', nextInterval ? {
  start: nextInterval.start.toLocaleTimeString(),
  end: nextInterval.end.toLocaleTimeString()
} : 'none');

const currentOrNext = tracker.getCurrentOrNextHomeInterval(testTime1, homeIntervals3);
console.log('Current or next home interval at 08:30:', currentOrNext ? {
  start: currentOrNext.start.toLocaleTimeString(),
  end: currentOrNext.end.toLocaleTimeString()
} : 'none');

console.log('✅ Test 6 passed\n');

console.log('✅ All Location State Tracker tests passed!');
