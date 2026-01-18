/**
 * Test script for Behind Schedule Logic (Task 6)
 * 
 * This script tests the behind schedule calculation logic:
 * - Only considers blocks after planStart
 * - Ignores skipped blocks
 * - Checks if now > currentBlock.endTime + 30 minutes
 * - Hides button if no current block or all blocks are in the future
 */

import type { DailyPlan, TimeBlock } from '../src/types/daily-plan';

// Helper to create a time block
function createBlock(
  id: string,
  startOffset: number, // minutes from now
  duration: number, // minutes
  status: 'pending' | 'completed' | 'skipped'
): TimeBlock {
  const now = new Date();
  const startTime = new Date(now.getTime() + startOffset * 60 * 1000);
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

  return {
    id,
    planId: 'test-plan',
    startTime,
    endTime,
    activityType: 'task',
    activityName: `Block ${id}`,
    isFixed: false,
    sequenceOrder: parseInt(id),
    status,
    createdAt: now,
    updatedAt: now,
  };
}

// Simulate the behind schedule logic from DegradePlanButton
function shouldShowDegradeButton(plan: DailyPlan): boolean {
  if (!plan.timeBlocks || plan.timeBlocks.length === 0) {
    return false;
  }

  const now = new Date();
  const planStart = new Date(plan.planStart);

  // Requirement 5.1: Only consider blocks after planStart
  const blocksAfterPlanStart = plan.timeBlocks.filter(block => {
    const blockEnd = new Date(block.endTime);
    return blockEnd > planStart;
  });

  if (blocksAfterPlanStart.length === 0) {
    return false;
  }

  // Requirement 5.2: Ignore blocks with status = 'skipped'
  // Find current block (first pending block after planStart)
  const currentBlock = blocksAfterPlanStart.find(block => block.status === 'pending');
  
  // Requirement 5.5: Hide if no current block exists
  if (!currentBlock) {
    return false;
  }

  // Requirement 5.5: Hide if all remaining blocks are after now
  const currentBlockStart = new Date(currentBlock.startTime);
  if (currentBlockStart > now) {
    return false;
  }

  // Requirement 5.3: Check if now > currentBlock.endTime + 30 minutes
  const endTime = new Date(currentBlock.endTime);
  const thirtyMinutesAfterEnd = new Date(endTime.getTime() + 30 * 60 * 1000);

  // Requirement 5.4: When all blocks before now are skipped, don't consider user behind schedule
  // This is handled by finding the first pending block (skipped blocks are ignored)
  return now > thirtyMinutesAfterEnd;
}

// Test scenarios
console.log('🧪 Testing Behind Schedule Logic\n');

// Test 1: User is behind schedule (current block ended 40 minutes ago)
console.log('Test 1: User is behind schedule (current block ended 40 minutes ago)');
const test1Plan: DailyPlan = {
  id: 'test-1',
  userId: 'user-1',
  planDate: new Date(),
  wakeTime: new Date(),
  sleepTime: new Date(),
  energyState: 'medium',
  status: 'active',
  generatedAt: new Date(),
  generatedAfterNow: false,
  planStart: new Date(Date.now() - 120 * 60 * 1000), // 2 hours ago
  createdAt: new Date(),
  updatedAt: new Date(),
  timeBlocks: [
    createBlock('1', -70, 30, 'pending'), // Started 70 min ago, ended 40 min ago
    createBlock('2', 10, 30, 'pending'),
  ],
};
const result1 = shouldShowDegradeButton(test1Plan);
console.log(`Result: ${result1 ? '✅ SHOW' : '❌ HIDE'} (Expected: SHOW)`);
console.log(result1 === true ? '✅ PASS\n' : '❌ FAIL\n');

// Test 2: User is on time (current block ended 20 minutes ago)
console.log('Test 2: User is on time (current block ended 20 minutes ago)');
const test2Plan: DailyPlan = {
  ...test1Plan,
  id: 'test-2',
  timeBlocks: [
    createBlock('1', -50, 30, 'pending'), // Started 50 min ago, ended 20 min ago
    createBlock('2', 10, 30, 'pending'),
  ],
};
const result2 = shouldShowDegradeButton(test2Plan);
console.log(`Result: ${result2 ? '✅ SHOW' : '❌ HIDE'} (Expected: HIDE)`);
console.log(result2 === false ? '✅ PASS\n' : '❌ FAIL\n');

// Test 3: Skipped blocks should be ignored
console.log('Test 3: Skipped blocks should be ignored (morning blocks skipped, current block on time)');
const test3Plan: DailyPlan = {
  ...test1Plan,
  id: 'test-3',
  planStart: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
  timeBlocks: [
    createBlock('1', -120, 30, 'skipped'), // Morning block (skipped)
    createBlock('2', -90, 30, 'skipped'),  // Morning block (skipped)
    createBlock('3', -20, 30, 'pending'),  // Current block (started 20 min ago, ends in 10 min)
    createBlock('4', 20, 30, 'pending'),
  ],
};
const result3 = shouldShowDegradeButton(test3Plan);
console.log(`Result: ${result3 ? '✅ SHOW' : '❌ HIDE'} (Expected: HIDE)`);
console.log(result3 === false ? '✅ PASS\n' : '❌ FAIL\n');

// Test 4: Only consider blocks after planStart
console.log('Test 4: Only consider blocks after planStart (late generation)');
const now = new Date();
const test4Plan: DailyPlan = {
  ...test1Plan,
  id: 'test-4',
  planStart: now, // Plan starts now
  generatedAfterNow: true,
  timeBlocks: [
    createBlock('1', -120, 30, 'pending'), // Before planStart (should be ignored)
    createBlock('2', -90, 30, 'pending'),  // Before planStart (should be ignored)
    createBlock('3', 10, 30, 'pending'),   // After planStart (current block)
    createBlock('4', 50, 30, 'pending'),
  ],
};
const result4 = shouldShowDegradeButton(test4Plan);
console.log(`Result: ${result4 ? '✅ SHOW' : '❌ HIDE'} (Expected: HIDE - current block hasn't started)`);
console.log(result4 === false ? '✅ PASS\n' : '❌ FAIL\n');

// Test 5: Hide if no current block exists (all completed)
console.log('Test 5: Hide if no current block exists (all completed)');
const test5Plan: DailyPlan = {
  ...test1Plan,
  id: 'test-5',
  timeBlocks: [
    createBlock('1', -70, 30, 'completed'),
    createBlock('2', -30, 30, 'completed'),
  ],
};
const result5 = shouldShowDegradeButton(test5Plan);
console.log(`Result: ${result5 ? '✅ SHOW' : '❌ HIDE'} (Expected: HIDE)`);
console.log(result5 === false ? '✅ PASS\n' : '❌ FAIL\n');

// Test 6: Hide if all remaining blocks are after now
console.log('Test 6: Hide if all remaining blocks are after now');
const test6Plan: DailyPlan = {
  ...test1Plan,
  id: 'test-6',
  timeBlocks: [
    createBlock('1', 10, 30, 'pending'),  // Starts in 10 minutes
    createBlock('2', 50, 30, 'pending'),
  ],
};
const result6 = shouldShowDegradeButton(test6Plan);
console.log(`Result: ${result6 ? '✅ SHOW' : '❌ HIDE'} (Expected: HIDE)`);
console.log(result6 === false ? '✅ PASS\n' : '❌ FAIL\n');

// Test 7: Complex scenario - late generation with skipped blocks and behind schedule
console.log('Test 7: Complex scenario - late generation, skipped morning, behind on afternoon block');
const test7Plan: DailyPlan = {
  ...test1Plan,
  id: 'test-7',
  planStart: new Date(Date.now() - 90 * 60 * 1000), // Plan started 90 min ago
  generatedAfterNow: true,
  timeBlocks: [
    createBlock('1', -180, 30, 'skipped'), // Before planStart (morning)
    createBlock('2', -150, 30, 'skipped'), // Before planStart (morning)
    createBlock('3', -80, 30, 'pending'),  // After planStart, ended 50 min ago (BEHIND!)
    createBlock('4', 10, 30, 'pending'),
  ],
};
const result7 = shouldShowDegradeButton(test7Plan);
console.log(`Result: ${result7 ? '✅ SHOW' : '❌ HIDE'} (Expected: SHOW)`);
console.log(result7 === true ? '✅ PASS\n' : '❌ FAIL\n');

console.log('✅ All tests completed!');
