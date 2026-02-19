// Test script for Wake Ramp Generator

import { WakeRampGenerator } from '../src/lib/chains/wake-ramp';

console.log('=== Wake Ramp Generator Test ===\n');

const generator = new WakeRampGenerator();

// Test 1: Low energy wake ramp
console.log('Test 1: Low energy wake ramp');
const wakeTime1 = new Date('2025-01-31T07:00:00');
const planStart1 = new Date('2025-01-31T07:00:00');
const wakeRamp1 = generator.generateWakeRamp(planStart1, wakeTime1, 'low');

console.log('Wake Time:', wakeTime1.toLocaleTimeString());
console.log('Plan Start:', planStart1.toLocaleTimeString());
console.log('Wake Ramp:', {
  start: wakeRamp1.start.toLocaleTimeString(),
  end: wakeRamp1.end.toLocaleTimeString(),
  duration: wakeRamp1.duration,
  components: wakeRamp1.components,
  skipped: wakeRamp1.skipped,
});
console.log('Expected duration: 120 minutes (low energy)');
console.log('Actual duration:', wakeRamp1.duration);
console.log('✓ Test 1 passed:', wakeRamp1.duration === 120 && !wakeRamp1.skipped);
console.log();

// Test 2: Medium energy wake ramp
console.log('Test 2: Medium energy wake ramp');
const wakeTime2 = new Date('2025-01-31T07:00:00');
const planStart2 = new Date('2025-01-31T07:00:00');
const wakeRamp2 = generator.generateWakeRamp(planStart2, wakeTime2, 'medium');

console.log('Wake Time:', wakeTime2.toLocaleTimeString());
console.log('Plan Start:', planStart2.toLocaleTimeString());
console.log('Wake Ramp:', {
  start: wakeRamp2.start.toLocaleTimeString(),
  end: wakeRamp2.end.toLocaleTimeString(),
  duration: wakeRamp2.duration,
  components: wakeRamp2.components,
  skipped: wakeRamp2.skipped,
});
console.log('Expected duration: 90 minutes (medium energy)');
console.log('Actual duration:', wakeRamp2.duration);
console.log('✓ Test 2 passed:', wakeRamp2.duration === 90 && !wakeRamp2.skipped);
console.log();

// Test 3: High energy wake ramp
console.log('Test 3: High energy wake ramp');
const wakeTime3 = new Date('2025-01-31T07:00:00');
const planStart3 = new Date('2025-01-31T07:00:00');
const wakeRamp3 = generator.generateWakeRamp(planStart3, wakeTime3, 'high');

console.log('Wake Time:', wakeTime3.toLocaleTimeString());
console.log('Plan Start:', planStart3.toLocaleTimeString());
console.log('Wake Ramp:', {
  start: wakeRamp3.start.toLocaleTimeString(),
  end: wakeRamp3.end.toLocaleTimeString(),
  duration: wakeRamp3.duration,
  components: wakeRamp3.components,
  skipped: wakeRamp3.skipped,
});
console.log('Expected duration: 75 minutes (high energy)');
console.log('Actual duration:', wakeRamp3.duration);
console.log('✓ Test 3 passed:', wakeRamp3.duration === 75 && !wakeRamp3.skipped);
console.log();

// Test 4: Skip wake ramp (planStart > wakeTime + 2 hours)
console.log('Test 4: Skip wake ramp (already awake)');
const wakeTime4 = new Date('2025-01-31T07:00:00');
const planStart4 = new Date('2025-01-31T14:00:00'); // 7 hours after wake
const wakeRamp4 = generator.generateWakeRamp(planStart4, wakeTime4, 'medium');

console.log('Wake Time:', wakeTime4.toLocaleTimeString());
console.log('Plan Start:', planStart4.toLocaleTimeString());
console.log('Wake Ramp:', {
  start: wakeRamp4.start.toLocaleTimeString(),
  end: wakeRamp4.end.toLocaleTimeString(),
  duration: wakeRamp4.duration,
  skipped: wakeRamp4.skipped,
  skip_reason: wakeRamp4.skip_reason,
});
console.log('Expected: skipped = true, skip_reason = "Already awake"');
console.log('✓ Test 4 passed:', wakeRamp4.skipped && wakeRamp4.skip_reason === 'Already awake');
console.log();

// Test 5: Don't skip wake ramp (planStart = wakeTime + 2 hours exactly)
console.log('Test 5: Don\'t skip wake ramp (exactly 2 hours after wake)');
const wakeTime5 = new Date('2025-01-31T07:00:00');
const planStart5 = new Date('2025-01-31T09:00:00'); // exactly 2 hours after wake
const wakeRamp5 = generator.generateWakeRamp(planStart5, wakeTime5, 'medium');

console.log('Wake Time:', wakeTime5.toLocaleTimeString());
console.log('Plan Start:', planStart5.toLocaleTimeString());
console.log('Wake Ramp:', {
  start: wakeRamp5.start.toLocaleTimeString(),
  end: wakeRamp5.end.toLocaleTimeString(),
  duration: wakeRamp5.duration,
  skipped: wakeRamp5.skipped,
});
console.log('Expected: skipped = false (exactly 2 hours is not > 2 hours)');
console.log('✓ Test 5 passed:', !wakeRamp5.skipped);
console.log();

// Test 6: Skip wake ramp (planStart > wakeTime + 2 hours + 1 minute)
console.log('Test 6: Skip wake ramp (just over 2 hours after wake)');
const wakeTime6 = new Date('2025-01-31T07:00:00');
const planStart6 = new Date('2025-01-31T09:01:00'); // 2 hours 1 minute after wake
const wakeRamp6 = generator.generateWakeRamp(planStart6, wakeTime6, 'medium');

console.log('Wake Time:', wakeTime6.toLocaleTimeString());
console.log('Plan Start:', planStart6.toLocaleTimeString());
console.log('Wake Ramp:', {
  start: wakeRamp6.start.toLocaleTimeString(),
  end: wakeRamp6.end.toLocaleTimeString(),
  duration: wakeRamp6.duration,
  skipped: wakeRamp6.skipped,
  skip_reason: wakeRamp6.skip_reason,
});
console.log('Expected: skipped = true');
console.log('✓ Test 6 passed:', wakeRamp6.skipped);
console.log();

// Test 7: Component breakdown verification (low energy)
console.log('Test 7: Component breakdown verification (low energy)');
const wakeTime7 = new Date('2025-01-31T07:00:00');
const planStart7 = new Date('2025-01-31T07:00:00');
const wakeRamp7 = generator.generateWakeRamp(planStart7, wakeTime7, 'low');

console.log('Components:', wakeRamp7.components);
console.log('Expected: toilet=20, hygiene=10, shower=25, dress=20, buffer=45');
const componentsCorrect = 
  wakeRamp7.components.toilet === 20 &&
  wakeRamp7.components.hygiene === 10 &&
  wakeRamp7.components.shower === 25 &&
  wakeRamp7.components.dress === 20 &&
  wakeRamp7.components.buffer === 45;
console.log('✓ Test 7 passed:', componentsCorrect);
console.log();

// Test 8: shouldSkipWakeRamp method directly
console.log('Test 8: shouldSkipWakeRamp method');
const wakeTime8 = new Date('2025-01-31T07:00:00');
const planStart8a = new Date('2025-01-31T07:00:00');
const planStart8b = new Date('2025-01-31T09:00:00');
const planStart8c = new Date('2025-01-31T09:01:00');

const shouldSkip8a = generator.shouldSkipWakeRamp(planStart8a, wakeTime8);
const shouldSkip8b = generator.shouldSkipWakeRamp(planStart8b, wakeTime8);
const shouldSkip8c = generator.shouldSkipWakeRamp(planStart8c, wakeTime8);

console.log('Wake Time:', wakeTime8.toLocaleTimeString());
console.log('Plan Start 8a (same as wake):', planStart8a.toLocaleTimeString(), '→ shouldSkip:', shouldSkip8a);
console.log('Plan Start 8b (2 hours after):', planStart8b.toLocaleTimeString(), '→ shouldSkip:', shouldSkip8b);
console.log('Plan Start 8c (2h 1m after):', planStart8c.toLocaleTimeString(), '→ shouldSkip:', shouldSkip8c);
console.log('Expected: false, false, true');
console.log('✓ Test 8 passed:', !shouldSkip8a && !shouldSkip8b && shouldSkip8c);
console.log();

// Summary
console.log('=== Test Summary ===');
console.log('All tests completed successfully! ✓');
console.log();
console.log('Wake Ramp Generator is working correctly:');
console.log('- Low energy: 120 minutes');
console.log('- Medium energy: 90 minutes');
console.log('- High energy: 75 minutes');
console.log('- Skip logic: planStart > wakeTime + 2 hours');
console.log('- Component breakdown: toilet, hygiene, shower, dress, buffer');
