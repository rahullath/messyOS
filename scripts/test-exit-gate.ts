// Test script for Exit Gate Service
// Validates Requirements: 3.1, 3.2, 3.3, 3.4, 3.5

import { ExitGateService, DEFAULT_GATE_CONDITIONS } from '../src/lib/chains/exit-gate';

console.log('=== Exit Gate Service Test ===\n');

// Test 1: Create default exit gate
console.log('Test 1: Create default exit gate');
const exitGate = ExitGateService.createDefault();
console.log('✓ Created exit gate with default conditions');
console.log(`  Conditions count: ${exitGate.getAllConditions().length}`);
console.log(`  Expected: ${DEFAULT_GATE_CONDITIONS.length}`);
console.log();

// Test 2: Evaluate gate with all conditions unsatisfied (should be blocked)
console.log('Test 2: Evaluate gate with all conditions unsatisfied');
let gateStatus = exitGate.evaluateGate();
console.log(`  Status: ${gateStatus.status}`);
console.log(`  Expected: blocked`);
console.log(`  Blocked reasons count: ${gateStatus.blocked_reasons.length}`);
console.log(`  Blocked reasons: ${gateStatus.blocked_reasons.join(', ')}`);
if (gateStatus.status === 'blocked' && gateStatus.blocked_reasons.length === 6) {
  console.log('✓ Gate correctly blocked with all reasons');
} else {
  console.log('✗ Gate status incorrect');
}
console.log();

// Test 3: Toggle some conditions
console.log('Test 3: Toggle some conditions');
exitGate.toggleCondition('keys', true);
exitGate.toggleCondition('phone', true);
exitGate.toggleCondition('water', true);
console.log('✓ Toggled keys, phone, water to satisfied');

gateStatus = exitGate.evaluateGate();
console.log(`  Status: ${gateStatus.status}`);
console.log(`  Expected: blocked (still 3 unsatisfied)`);
console.log(`  Blocked reasons: ${gateStatus.blocked_reasons.join(', ')}`);
if (gateStatus.status === 'blocked' && gateStatus.blocked_reasons.length === 3) {
  console.log('✓ Gate correctly blocked with remaining reasons');
} else {
  console.log('✗ Gate status incorrect');
}
console.log();

// Test 4: Satisfy all conditions
console.log('Test 4: Satisfy all conditions');
exitGate.satisfyAllConditions();
gateStatus = exitGate.evaluateGate();
console.log(`  Status: ${gateStatus.status}`);
console.log(`  Expected: ready`);
console.log(`  Blocked reasons count: ${gateStatus.blocked_reasons.length}`);
if (gateStatus.status === 'ready' && gateStatus.blocked_reasons.length === 0) {
  console.log('✓ Gate correctly ready with no blocked reasons');
} else {
  console.log('✗ Gate status incorrect');
}
console.log();

// Test 5: Reset all conditions
console.log('Test 5: Reset all conditions');
exitGate.resetAllConditions();
gateStatus = exitGate.evaluateGate();
console.log(`  Status: ${gateStatus.status}`);
console.log(`  Expected: blocked`);
if (gateStatus.status === 'blocked' && gateStatus.blocked_reasons.length === 6) {
  console.log('✓ Gate correctly reset to blocked');
} else {
  console.log('✗ Gate reset failed');
}
console.log();

// Test 6: Create gate from gate tags
console.log('Test 6: Create gate from gate tags');
const gateTags = ['keys', 'phone', 'bag-packed'];
const customGate = ExitGateService.fromGateTags(gateTags);
const customStatus = customGate.evaluateGate();
console.log(`  Gate tags: ${gateTags.join(', ')}`);
console.log(`  Conditions count: ${customGate.getAllConditions().length}`);
console.log(`  Expected: ${gateTags.length}`);
console.log(`  Blocked reasons: ${customStatus.blocked_reasons.join(', ')}`);
if (customGate.getAllConditions().length === gateTags.length) {
  console.log('✓ Custom gate created correctly from tags');
} else {
  console.log('✗ Custom gate creation failed');
}
console.log();

// Test 7: Get specific condition
console.log('Test 7: Get specific condition');
const keysCondition = exitGate.getCondition('keys');
console.log(`  Keys condition: ${keysCondition?.name}`);
console.log(`  Satisfied: ${keysCondition?.satisfied}`);
if (keysCondition && keysCondition.name === 'Keys present') {
  console.log('✓ Condition retrieval works');
} else {
  console.log('✗ Condition retrieval failed');
}
console.log();

// Test 8: Error handling for invalid condition ID
console.log('Test 8: Error handling for invalid condition ID');
try {
  exitGate.toggleCondition('invalid-id', true);
  console.log('✗ Should have thrown error for invalid condition ID');
} catch (error) {
  console.log('✓ Correctly threw error for invalid condition ID');
  console.log(`  Error: ${(error as Error).message}`);
}
console.log();

// Test 9: Verify all default conditions
console.log('Test 9: Verify all default conditions');
const expectedConditions = [
  'keys',
  'phone',
  'water',
  'meds',
  'cat-fed',
  'bag-packed'
];
const actualConditions = DEFAULT_GATE_CONDITIONS.map(c => c.id);
const allPresent = expectedConditions.every(id => actualConditions.includes(id));
console.log(`  Expected conditions: ${expectedConditions.join(', ')}`);
console.log(`  Actual conditions: ${actualConditions.join(', ')}`);
if (allPresent && actualConditions.length === expectedConditions.length) {
  console.log('✓ All default conditions present');
} else {
  console.log('✗ Default conditions mismatch');
}
console.log();

console.log('=== Exit Gate Service Test Complete ===');
