/**
 * Test script for Enhanced Loop Habits Import V2
 * 
 * Tests the core functions without requiring database access.
 */

import {
  detectImportFormat,
  fuzzyMatchHabit,
  normalizeLoopValue,
  extractNotesFromPerHabit,
} from '../src/lib/import/enhanced-loop-habits-v2';

console.log('🧪 Testing Enhanced Loop Habits Import V2\n');

// Test 1: detectImportFormat
console.log('Test 1: detectImportFormat');
const rootFiles = [
  { name: 'Habits.csv' } as File,
  { name: 'Checkmarks.csv' } as File,
  { name: 'Scores.csv' } as File,
];
const perHabitFiles = [
  { name: 'Checkmarks.csv' } as File,
  { name: 'Checkmarks.csv' } as File,
];

const rootFormat = detectImportFormat(rootFiles);
const perHabitFormat = detectImportFormat(perHabitFiles);

console.log(`  Root format detection: ${rootFormat === 'root' ? '✅' : '❌'} (expected: root, got: ${rootFormat})`);
console.log(`  Per-habit format detection: ${perHabitFormat === 'per-habit' ? '✅' : '❌'} (expected: per-habit, got: ${perHabitFormat})`);

// Test 2: fuzzyMatchHabit
console.log('\nTest 2: fuzzyMatchHabit');
const existingHabits = [
  { id: '1', name: 'Vaping' },
  { id: '2', name: 'No Pot' },
  { id: '3', name: 'Meals Cooked' },
];

const exactMatch = fuzzyMatchHabit('Vaping', existingHabits);
const closeMatch = fuzzyMatchHabit('Vaping Habit', existingHabits); // Better test case
const noMatch = fuzzyMatchHabit('Unknown Habit', existingHabits);

console.log(`  Exact match: ${exactMatch?.confidence === 100 ? '✅' : '❌'} (confidence: ${exactMatch?.confidence}, habit: ${exactMatch?.habitName})`);
console.log(`  Close match (substring): ${closeMatch && closeMatch.confidence >= 70 ? '✅' : '❌'} (confidence: ${closeMatch?.confidence}, habit: ${closeMatch?.habitName})`);
console.log(`  No match: ${noMatch === null ? '✅' : '❌'} (expected: null, got: ${noMatch?.habitName})`);

// Test 3: normalizeLoopValue
console.log('\nTest 3: normalizeLoopValue');

// Numerical values (divide by 1000)
const numerical1 = normalizeLoopValue(3000, 'NUMERICAL');
const numerical2 = normalizeLoopValue('5500', 'NUMERICAL');
const numerical3 = normalizeLoopValue(0, 'NUMERICAL');

console.log(`  Numerical 3000: ${numerical1 === 3 ? '✅' : '❌'} (expected: 3, got: ${numerical1})`);
console.log(`  Numerical "5500": ${numerical2 === 5.5 ? '✅' : '❌'} (expected: 5.5, got: ${numerical2})`);
console.log(`  Numerical 0: ${numerical3 === 0 ? '✅' : '❌'} (expected: 0, got: ${numerical3})`);

// YES_NO values (0=missed, 2=completed, 3=skipped)
const yesNo1 = normalizeLoopValue(0, 'YES_NO');
const yesNo2 = normalizeLoopValue(2, 'YES_NO');
const yesNo3 = normalizeLoopValue(3, 'YES_NO');

console.log(`  YES_NO 0 (missed): ${yesNo1 === 0 ? '✅' : '❌'} (expected: 0, got: ${yesNo1})`);
console.log(`  YES_NO 2 (completed): ${yesNo2 === 1 ? '✅' : '❌'} (expected: 1, got: ${yesNo2})`);
console.log(`  YES_NO 3 (skipped): ${yesNo3 === 2 ? '✅' : '❌'} (expected: 2, got: ${yesNo3})`);

// Test 4: extractNotesFromPerHabit
console.log('\nTest 4: extractNotesFromPerHabit');

const rowWithNotes = { Timestamp: '2024-01-01', Value: '2', Notes: '2-3 pouches 6mg' };
const rowWithoutNotes = { Timestamp: '2024-01-01', Value: '2' };
const rowWithEmptyNotes = { Timestamp: '2024-01-01', Value: '2', Notes: '' };

const notes1 = extractNotesFromPerHabit(rowWithNotes);
const notes2 = extractNotesFromPerHabit(rowWithoutNotes);
const notes3 = extractNotesFromPerHabit(rowWithEmptyNotes);

console.log(`  Row with notes: ${notes1 === '2-3 pouches 6mg' ? '✅' : '❌'} (got: ${notes1})`);
console.log(`  Row without notes: ${notes2 === null ? '✅' : '❌'} (expected: null, got: ${notes2})`);
console.log(`  Row with empty notes: ${notes3 === null ? '✅' : '❌'} (expected: null, got: ${notes3})`);

// Test 5: Round-trip value normalization
console.log('\nTest 5: Round-trip value normalization (Property 1)');

const originalValue = 42;
const loopValue = originalValue * 1000;
const normalized = normalizeLoopValue(loopValue, 'NUMERICAL');
const roundTrip = normalized === originalValue;

console.log(`  Original: ${originalValue}, Loop: ${loopValue}, Normalized: ${normalized}`);
console.log(`  Round-trip successful: ${roundTrip ? '✅' : '❌'}`);

// Test 6: Edge cases
console.log('\nTest 6: Edge cases');

const invalidValue = normalizeLoopValue('invalid', 'NUMERICAL');
const nullValue = normalizeLoopValue(null as any, 'NUMERICAL');
const undefinedValue = normalizeLoopValue(undefined as any, 'NUMERICAL');

console.log(`  Invalid string: ${invalidValue === 0 ? '✅' : '❌'} (expected: 0, got: ${invalidValue})`);
console.log(`  Null value: ${nullValue === 0 ? '✅' : '❌'} (expected: 0, got: ${nullValue})`);
console.log(`  Undefined value: ${undefinedValue === 0 ? '✅' : '❌'} (expected: 0, got: ${undefinedValue})`);

console.log('\n✅ All tests completed!');
