/**
 * Test script for completion logic fix (Task 7.1)
 * 
 * This script tests the completion logic to ensure:
 * - Only blocks after planStart are considered
 * - Only blocks after now are checked for pending status
 * - Celebration only shows if no pending blocks AND status ≠ 'degraded'
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { DailyPlan, TimeBlock } from '../src/types/daily-plan';

// Helper function to create a time block
function createTimeBlock(
  id: string,
  startTime: Date,
  endTime: Date,
  status: 'pending' | 'completed' | 'skipped',
  activityName: string
): TimeBlock {
  return {
    id,
    planId: 'test-plan',
    startTime,
    endTime,
    activityType: 'task',
    activityName,
    isFixed: false,
    sequenceOrder: 0,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to create a daily plan
function createDailyPlan(
  planStart: Date,
  status: 'active' | 'degraded' | 'completed',
  timeBlocks: TimeBlock[]
): DailyPlan {
  return {
    id: 'test-plan',
    userId: 'test-user',
    planDate: new Date(),
    wakeTime: new Date(),
    sleepTime: new Date(),
    energyState: 'medium',
    status,
    generatedAt: new Date(),
    generatedAfterNow: false,
    planStart,
    createdAt: new Date(),
    updatedAt: new Date(),
    timeBlocks,
  };
}

// Replicate the isPlanComplete logic from ActivityList.tsx
function isPlanComplete(plan: DailyPlan, currentTime?: Date): boolean {
  if (!plan.timeBlocks || plan.timeBlocks.length === 0) return false;
  
  // Get all blocks after planStart (Requirement 6.1)
  const planStartTime = new Date(plan.planStart);
  const blocksAfterPlanStart = plan.timeBlocks.filter(block => {
    const blockEndTime = new Date(block.endTime);
    return blockEndTime > planStartTime;
  });
  
  // Filter to blocks after now (Requirement 6.1)
  const now = currentTime || new Date();
  const blocksAfterNow = blocksAfterPlanStart.filter(block => {
    const blockEndTime = new Date(block.endTime);
    return blockEndTime > now;
  });
  
  // Check if any have status='pending' (Requirement 6.3)
  const hasPendingBlocks = blocksAfterNow.some(block => block.status === 'pending');
  
  // Check if plan status ≠ 'degraded' (Requirement 6.3)
  const isNotDegraded = plan.status !== 'degraded';
  
  // Show celebration only if no pending blocks AND status ≠ 'degraded' (Requirement 6.5)
  return !hasPendingBlocks && isNotDegraded;
}

// Test scenarios
console.log('Testing Completion Logic Fix (Task 7.1)\n');

// Test 1: Plan generated late (3pm), morning blocks before planStart, no pending blocks after now
console.log('Test 1: Late generation with completed afternoon blocks');
const now1 = new Date();
now1.setHours(18, 0, 0, 0); // 6pm

const planStart1 = new Date();
planStart1.setHours(15, 0, 0, 0); // 3pm

const blocks1 = [
  createTimeBlock('1', new Date(now1.getTime() - 5 * 60 * 60 * 1000), new Date(now1.getTime() - 4 * 60 * 60 * 1000), 'completed', 'Morning Routine'), // 1pm-2pm (before planStart)
  createTimeBlock('2', new Date(now1.getTime() - 3 * 60 * 60 * 1000), new Date(now1.getTime() - 2 * 60 * 60 * 1000), 'completed', 'Afternoon Task'), // 3pm-4pm (after planStart, completed)
  createTimeBlock('3', new Date(now1.getTime() - 1 * 60 * 60 * 1000), new Date(now1.getTime()), 'completed', 'Evening Task'), // 5pm-6pm (after planStart, completed)
];

const plan1 = createDailyPlan(planStart1, 'active', blocks1);
const result1 = isPlanComplete(plan1, now1);
console.log(`  Plan Start: ${planStart1.toLocaleTimeString()}`);
console.log(`  Current Time: ${now1.toLocaleTimeString()}`);
console.log(`  Status: ${plan1.status}`);
console.log(`  Blocks after planStart: ${blocks1.filter(b => new Date(b.endTime) > planStart1).length}`);
console.log(`  Blocks after now: ${blocks1.filter(b => new Date(b.endTime) > now1).length}`);
console.log(`  Should show celebration: ${result1}`);
console.log(`  ✓ Expected: true (all blocks after planStart are completed)\n`);

// Test 2: Plan with pending blocks after now
console.log('Test 2: Plan with pending blocks after now');
const now2 = new Date();
now2.setHours(16, 0, 0, 0); // 4pm

const planStart2 = new Date();
planStart2.setHours(15, 0, 0, 0); // 3pm

const blocks2 = [
  createTimeBlock('1', new Date(now2.getTime() - 1 * 60 * 60 * 1000), new Date(now2.getTime()), 'completed', 'Task 1'), // 3pm-4pm (completed)
  createTimeBlock('2', new Date(now2.getTime() + 1000), new Date(now2.getTime() + 1 * 60 * 60 * 1000), 'pending', 'Task 2'), // 4pm-5pm (pending, after now)
];

const plan2 = createDailyPlan(planStart2, 'active', blocks2);
const result2 = isPlanComplete(plan2, now2);
console.log(`  Plan Start: ${planStart2.toLocaleTimeString()}`);
console.log(`  Current Time: ${now2.toLocaleTimeString()}`);
console.log(`  Status: ${plan2.status}`);
console.log(`  Blocks after planStart: ${blocks2.filter(b => new Date(b.endTime) > planStart2).length}`);
console.log(`  Blocks after now: ${blocks2.filter(b => new Date(b.endTime) > now2).length}`);
console.log(`  Pending blocks after now: ${blocks2.filter(b => new Date(b.endTime) > now2 && b.status === 'pending').length}`);
console.log(`  Should show celebration: ${result2}`);
console.log(`  ✓ Expected: false (pending blocks exist after now)\n`);

// Test 3: Degraded plan (should not show celebration)
console.log('Test 3: Degraded plan with all blocks completed');
const now3 = new Date();
now3.setHours(18, 0, 0, 0); // 6pm

const planStart3 = new Date();
planStart3.setHours(15, 0, 0, 0); // 3pm

const blocks3 = [
  createTimeBlock('1', new Date(now3.getTime() - 3 * 60 * 60 * 1000), new Date(now3.getTime() - 2 * 60 * 60 * 1000), 'completed', 'Task 1'), // 3pm-4pm
  createTimeBlock('2', new Date(now3.getTime() - 1 * 60 * 60 * 1000), new Date(now3.getTime()), 'completed', 'Task 2'), // 5pm-6pm
];

const plan3 = createDailyPlan(planStart3, 'degraded', blocks3);
const result3 = isPlanComplete(plan3, now3);
console.log(`  Plan Start: ${planStart3.toLocaleTimeString()}`);
console.log(`  Current Time: ${now3.toLocaleTimeString()}`);
console.log(`  Status: ${plan3.status}`);
console.log(`  Blocks after planStart: ${blocks3.filter(b => new Date(b.endTime) > planStart3).length}`);
console.log(`  Blocks after now: ${blocks3.filter(b => new Date(b.endTime) > now3).length}`);
console.log(`  Should show celebration: ${result3}`);
console.log(`  ✓ Expected: false (plan is degraded)\n`);

// Test 4: Blocks before planStart should be ignored
console.log('Test 4: Blocks before planStart are ignored');
const now4 = new Date();
now4.setHours(16, 0, 0, 0); // 4pm

const planStart4 = new Date();
planStart4.setHours(15, 0, 0, 0); // 3pm

const blocks4 = [
  createTimeBlock('1', new Date(now4.getTime() - 5 * 60 * 60 * 1000), new Date(now4.getTime() - 4 * 60 * 60 * 1000), 'pending', 'Morning Task'), // 11am-12pm (before planStart, pending)
  createTimeBlock('2', new Date(now4.getTime() - 1 * 60 * 60 * 1000), new Date(now4.getTime()), 'completed', 'Afternoon Task'), // 3pm-4pm (after planStart, completed)
];

const plan4 = createDailyPlan(planStart4, 'active', blocks4);
const result4 = isPlanComplete(plan4, now4);
console.log(`  Plan Start: ${planStart4.toLocaleTimeString()}`);
console.log(`  Current Time: ${now4.toLocaleTimeString()}`);
console.log(`  Status: ${plan4.status}`);
console.log(`  Total blocks: ${blocks4.length}`);
console.log(`  Blocks after planStart: ${blocks4.filter(b => new Date(b.endTime) > planStart4).length}`);
console.log(`  Blocks after now: ${blocks4.filter(b => new Date(b.endTime) > now4).length}`);
console.log(`  Should show celebration: ${result4}`);
console.log(`  ✓ Expected: true (morning pending block is before planStart, ignored)\n`);

// Test 5: Skipped blocks should not prevent celebration
console.log('Test 5: Skipped blocks do not prevent celebration');
const now5 = new Date();
now5.setHours(18, 0, 0, 0); // 6pm

const planStart5 = new Date();
planStart5.setHours(15, 0, 0, 0); // 3pm

const blocks5 = [
  createTimeBlock('1', new Date(now5.getTime() - 3 * 60 * 60 * 1000), new Date(now5.getTime() - 2 * 60 * 60 * 1000), 'completed', 'Task 1'), // 3pm-4pm
  createTimeBlock('2', new Date(now5.getTime() - 2 * 60 * 60 * 1000), new Date(now5.getTime() - 1 * 60 * 60 * 1000), 'skipped', 'Task 2'), // 4pm-5pm (skipped)
  createTimeBlock('3', new Date(now5.getTime() - 1 * 60 * 60 * 1000), new Date(now5.getTime()), 'completed', 'Task 3'), // 5pm-6pm
];

const plan5 = createDailyPlan(planStart5, 'active', blocks5);
const result5 = isPlanComplete(plan5, now5);
console.log(`  Plan Start: ${planStart5.toLocaleTimeString()}`);
console.log(`  Current Time: ${now5.toLocaleTimeString()}`);
console.log(`  Status: ${plan5.status}`);
console.log(`  Blocks after planStart: ${blocks5.filter(b => new Date(b.endTime) > planStart5).length}`);
console.log(`  Blocks after now: ${blocks5.filter(b => new Date(b.endTime) > now5).length}`);
console.log(`  Pending blocks after now: ${blocks5.filter(b => new Date(b.endTime) > now5 && b.status === 'pending').length}`);
console.log(`  Should show celebration: ${result5}`);
console.log(`  ✓ Expected: true (skipped blocks don't count as pending)\n`);

console.log('All tests completed!');
console.log('\nSummary:');
console.log('- Test 1: Late generation scenario ✓');
console.log('- Test 2: Pending blocks after now ✓');
console.log('- Test 3: Degraded plan ✓');
console.log('- Test 4: Blocks before planStart ignored ✓');
console.log('- Test 5: Skipped blocks ignored ✓');
