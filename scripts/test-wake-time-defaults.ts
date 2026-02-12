/**
 * Test script for wake time default logic
 * Requirements: 8.1, 8.2, 8.3, 8.5
 */

/**
 * Calculate default wake time based on current time
 * Requirements: 8.1, 8.2, 8.5
 * 
 * - If current time < 12:00, default wake time = 07:00
 * - If current time >= 12:00, default wake time = now rounded down to nearest 15 min
 */
function calculateDefaultWakeTime(now: Date = new Date()): string {
  const currentHour = now.getHours();
  
  // Requirement 8.1: If current time < 12:00, default to 07:00
  if (currentHour < 12) {
    return '07:00';
  }
  
  // Requirement 8.2: If current time >= 12:00, round down to nearest 15 minutes
  const currentMinute = now.getMinutes();
  const roundedMinute = Math.floor(currentMinute / 15) * 15;
  
  const hours = currentHour.toString().padStart(2, '0');
  const minutes = roundedMinute.toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

console.log('Testing wake time default logic...\n');

// Test 1: Morning time (before 12:00)
console.log('Test 1: Morning time (before 12:00)');
const morning = new Date('2025-01-30T09:30:00');
const morningResult = calculateDefaultWakeTime(morning);
console.log(`  Current time: ${morning.toLocaleTimeString()}`);
console.log(`  Expected: 07:00`);
console.log(`  Result: ${morningResult}`);
console.log(`  ✓ ${morningResult === '07:00' ? 'PASS' : 'FAIL'}\n`);

// Test 2: Afternoon time (after 12:00)
console.log('Test 2: Afternoon time (after 12:00)');
const afternoon = new Date('2025-01-30T14:37:00');
const afternoonResult = calculateDefaultWakeTime(afternoon);
console.log(`  Current time: ${afternoon.toLocaleTimeString()}`);
console.log(`  Expected: 14:30 (rounded down to nearest 15 min)`);
console.log(`  Result: ${afternoonResult}`);
console.log(`  ✓ ${afternoonResult === '14:30' ? 'PASS' : 'FAIL'}\n`);

// Test 3: Exactly at noon
console.log('Test 3: Exactly at noon');
const noon = new Date('2025-01-30T12:00:00');
const noonResult = calculateDefaultWakeTime(noon);
console.log(`  Current time: ${noon.toLocaleTimeString()}`);
console.log(`  Expected: 12:00`);
console.log(`  Result: ${noonResult}`);
console.log(`  ✓ ${noonResult === '12:00' ? 'PASS' : 'FAIL'}\n`);

// Test 4: Late afternoon with rounding
console.log('Test 4: Late afternoon with rounding');
const lateAfternoon = new Date('2025-01-30T16:47:00');
const lateAfternoonResult = calculateDefaultWakeTime(lateAfternoon);
console.log(`  Current time: ${lateAfternoon.toLocaleTimeString()}`);
console.log(`  Expected: 16:45 (rounded down to nearest 15 min)`);
console.log(`  Result: ${lateAfternoonResult}`);
console.log(`  ✓ ${lateAfternoonResult === '16:45' ? 'PASS' : 'FAIL'}\n`);

// Test 5: Evening time
console.log('Test 5: Evening time');
const evening = new Date('2025-01-30T19:08:00');
const eveningResult = calculateDefaultWakeTime(evening);
console.log(`  Current time: ${evening.toLocaleTimeString()}`);
console.log(`  Expected: 19:00 (rounded down to nearest 15 min)`);
console.log(`  Result: ${eveningResult}`);
console.log(`  ✓ ${eveningResult === '19:00' ? 'PASS' : 'FAIL'}\n`);

// Test 6: Just before noon
console.log('Test 6: Just before noon');
const beforeNoon = new Date('2025-01-30T11:59:00');
const beforeNoonResult = calculateDefaultWakeTime(beforeNoon);
console.log(`  Current time: ${beforeNoon.toLocaleTimeString()}`);
console.log(`  Expected: 07:00 (still morning)`);
console.log(`  Result: ${beforeNoonResult}`);
console.log(`  ✓ ${beforeNoonResult === '07:00' ? 'PASS' : 'FAIL'}\n`);

console.log('All tests completed!');
