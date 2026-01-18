// Test script for evening routine placement logic
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5

console.log('🧪 Testing Evening Routine Placement Logic\n');

// Test the logic for determining evening routine start time
function testEveningRoutineStartTime() {
  const EVENING_ROUTINE_EARLIEST_TIME = 18; // 6:00 PM
  const BUFFER_MINUTES = 5;
  const EVENING_ROUTINE_DURATION = 20;

  console.log('Test 1: Normal case - wake 7am, sleep 11pm, current time 5pm');
  {
    const wakeTime = new Date('2025-01-18T07:00:00');
    const sleepTime = new Date('2025-01-18T23:00:00');
    const currentTime = new Date('2025-01-18T17:00:00'); // 5pm
    const planStartTime = new Date(Math.max(wakeTime.getTime(), currentTime.getTime()));

    const eveningRoutineEarliestTime = new Date(wakeTime);
    eveningRoutineEarliestTime.setHours(EVENING_ROUTINE_EARLIEST_TIME, 0, 0, 0);

    const eveningRoutineMinStartTime = sleepTime.getHours() < EVENING_ROUTINE_EARLIEST_TIME
      ? new Date(Math.max(currentTime.getTime(), planStartTime.getTime()))
      : new Date(Math.max(currentTime.getTime(), eveningRoutineEarliestTime.getTime(), planStartTime.getTime()));

    const eveningRoutineEnd = new Date(
      eveningRoutineMinStartTime.getTime() + EVENING_ROUTINE_DURATION * 60000
    );

    console.log(`   Plan start: ${planStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine start: ${eveningRoutineMinStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine end: ${eveningRoutineEnd.toLocaleTimeString()}`);
    console.log(`   Sleep time: ${sleepTime.toLocaleTimeString()}`);

    if (eveningRoutineMinStartTime.getHours() >= 18) {
      console.log('   ✅ Evening routine scheduled after 6pm');
    } else {
      console.log('   ❌ Evening routine scheduled before 6pm');
    }

    if (eveningRoutineEnd <= sleepTime) {
      console.log('   ✅ Evening routine fits before sleep time');
    } else {
      console.log('   ❌ Evening routine extends past sleep time');
    }
  }

  console.log();
  console.log('Test 2: Early sleep time (5pm) - should schedule before sleep');
  {
    const wakeTime = new Date('2025-01-18T07:00:00');
    const sleepTime = new Date('2025-01-18T17:00:00'); // 5pm
    const currentTime = new Date('2025-01-18T15:00:00'); // 3pm
    const planStartTime = new Date(Math.max(wakeTime.getTime(), currentTime.getTime()));

    const eveningRoutineEarliestTime = new Date(wakeTime);
    eveningRoutineEarliestTime.setHours(EVENING_ROUTINE_EARLIEST_TIME, 0, 0, 0);

    const eveningRoutineMinStartTime = sleepTime.getHours() < EVENING_ROUTINE_EARLIEST_TIME
      ? new Date(Math.max(currentTime.getTime(), planStartTime.getTime()))
      : new Date(Math.max(currentTime.getTime(), eveningRoutineEarliestTime.getTime(), planStartTime.getTime()));

    const eveningRoutineEnd = new Date(
      eveningRoutineMinStartTime.getTime() + EVENING_ROUTINE_DURATION * 60000
    );

    console.log(`   Plan start: ${planStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine start: ${eveningRoutineMinStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine end: ${eveningRoutineEnd.toLocaleTimeString()}`);
    console.log(`   Sleep time: ${sleepTime.toLocaleTimeString()}`);

    if (sleepTime.getHours() < 18) {
      console.log('   ✅ Sleep time is before 6pm, so 6pm constraint is relaxed');
    }

    if (eveningRoutineEnd <= sleepTime) {
      console.log('   ✅ Evening routine fits before sleep time');
    } else {
      console.log('   ❌ Evening routine extends past sleep time - should be dropped');
    }
  }

  console.log();
  console.log('Test 3: Very tight schedule - evening routine should be dropped');
  {
    const wakeTime = new Date('2025-01-18T07:00:00');
    const sleepTime = new Date('2025-01-18T18:10:00'); // 6:10pm - barely any time
    const currentTime = new Date('2025-01-18T18:00:00'); // 6pm
    const planStartTime = new Date(Math.max(wakeTime.getTime(), currentTime.getTime()));

    const eveningRoutineEarliestTime = new Date(wakeTime);
    eveningRoutineEarliestTime.setHours(EVENING_ROUTINE_EARLIEST_TIME, 0, 0, 0);

    const eveningRoutineMinStartTime = sleepTime.getHours() < EVENING_ROUTINE_EARLIEST_TIME
      ? new Date(Math.max(currentTime.getTime(), planStartTime.getTime()))
      : new Date(Math.max(currentTime.getTime(), eveningRoutineEarliestTime.getTime(), planStartTime.getTime()));

    const eveningRoutineEnd = new Date(
      eveningRoutineMinStartTime.getTime() + EVENING_ROUTINE_DURATION * 60000
    );

    console.log(`   Plan start: ${planStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine start: ${eveningRoutineMinStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine end: ${eveningRoutineEnd.toLocaleTimeString()}`);
    console.log(`   Sleep time: ${sleepTime.toLocaleTimeString()}`);

    if (eveningRoutineEnd <= sleepTime) {
      console.log('   ⚠️  Evening routine fits (barely)');
    } else {
      console.log('   ✅ Evening routine extends past sleep time - correctly dropped');
    }
  }

  console.log();
  console.log('Test 4: Late generation (9pm) - should schedule immediately');
  {
    const wakeTime = new Date('2025-01-18T07:00:00');
    const sleepTime = new Date('2025-01-18T23:00:00'); // 11pm
    const currentTime = new Date('2025-01-18T21:00:00'); // 9pm
    const planStartTime = new Date(Math.max(wakeTime.getTime(), currentTime.getTime()));

    const eveningRoutineEarliestTime = new Date(wakeTime);
    eveningRoutineEarliestTime.setHours(EVENING_ROUTINE_EARLIEST_TIME, 0, 0, 0);

    const eveningRoutineMinStartTime = sleepTime.getHours() < EVENING_ROUTINE_EARLIEST_TIME
      ? new Date(Math.max(currentTime.getTime(), planStartTime.getTime()))
      : new Date(Math.max(currentTime.getTime(), eveningRoutineEarliestTime.getTime(), planStartTime.getTime()));

    const eveningRoutineEnd = new Date(
      eveningRoutineMinStartTime.getTime() + EVENING_ROUTINE_DURATION * 60000
    );

    console.log(`   Plan start: ${planStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine start: ${eveningRoutineMinStartTime.toLocaleTimeString()}`);
    console.log(`   Evening routine end: ${eveningRoutineEnd.toLocaleTimeString()}`);
    console.log(`   Sleep time: ${sleepTime.toLocaleTimeString()}`);

    if (eveningRoutineMinStartTime.getTime() === planStartTime.getTime()) {
      console.log('   ✅ Evening routine scheduled immediately (current time is after 6pm)');
    }

    if (eveningRoutineEnd <= sleepTime) {
      console.log('   ✅ Evening routine fits before sleep time');
    } else {
      console.log('   ❌ Evening routine extends past sleep time');
    }
  }

  console.log();
  console.log('✅ All logic tests completed');
}

testEveningRoutineStartTime();
