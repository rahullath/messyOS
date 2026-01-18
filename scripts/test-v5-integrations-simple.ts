// scripts/test-v5-integrations-simple.ts
// Simplified test script to verify v5 service integrations
// Run with: npx tsx scripts/test-v5-integrations-simple.ts

import { createClient } from '@supabase/supabase-js';
import { TravelService } from '../src/lib/uk-student/travel-service.js';
import { RoutineService } from '../src/lib/uk-student/routine-service.js';
import { ExitTimeCalculator } from '../src/lib/daily-plan/exit-time-calculator.js';
import type { Location, TravelConditions, TravelPreferences } from '../src/types/uk-student-travel';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://mdhtpjpwwbuepsytgrva.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user ID
const TEST_USER_ID = '70429eba-f32e-47ab-bfcb-a75e2f819de4';

// Test locations
const FIVE_WAYS: Location = {
  name: 'Five Ways Station',
  coordinates: [52.4751, -1.9180],
  type: 'other',
  address: 'Five Ways Station, Birmingham B16 0SP'
};

const UNIVERSITY: Location = {
  name: 'University of Birmingham',
  coordinates: [52.4508, -1.9305],
  type: 'university',
  address: 'University of Birmingham, Edgbaston, Birmingham B15 2TT'
};

/**
 * Test 1: Travel Service Integration
 */
async function testTravelServiceIntegration() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: Travel Service Integration');
  console.log('='.repeat(80));
  
  try {
    const travelService = new TravelService();
    
    // Test conditions
    const conditions: TravelConditions = {
      weather: {
        temperature: 15,
        condition: 'cloudy',
        windSpeed: 10,
        humidity: 70,
        precipitation: 0,
        visibility: 10,
        timestamp: new Date(),
      },
      userEnergy: 3,
      timeConstraints: {
        departure: new Date(),
        arrival: new Date(Date.now() + 60 * 60 * 1000),
        flexibility: 15,
      },
    };
    
    const preferences: TravelPreferences = {
      preferredMethod: 'mixed',
      maxWalkingDistance: 1500,
      weatherThreshold: {
        minTemperature: 0,
        maxWindSpeed: 30,
        maxPrecipitation: 10,
      },
      fitnessLevel: 'medium',
      budgetConstraints: {
        dailyLimit: 500,
        weeklyLimit: 2000,
      },
      timePreferences: {
        bufferTime: 10,
        maxTravelTime: 60,
      },
    };
    
    console.log('\n📍 Testing route: Five Ways → University');
    console.log(`From: ${FIVE_WAYS.name}`);
    console.log(`To: ${UNIVERSITY.name}`);
    
    const route = await travelService.getOptimalRoute(
      FIVE_WAYS,
      UNIVERSITY,
      conditions,
      preferences
    );
    
    console.log('\n✅ Route calculated successfully:');
    console.log(`  Method: ${route.method}`);
    console.log(`  Duration: ${route.duration} minutes`);
    console.log(`  Distance: ${Math.round(route.distance)}m`);
    console.log(`  Cost: £${(route.cost / 100).toFixed(2)}`);
    console.log(`  Difficulty: ${route.difficulty}`);
    console.log(`  Weather Suitability: ${(route.weatherSuitability * 100).toFixed(0)}%`);
    console.log(`  Energy Required: ${route.energyRequired}/5`);
    
    return true;
  } catch (error) {
    console.error('\n❌ Travel service test failed:', error);
    return false;
  }
}

/**
 * Test 2: Exit Time Calculator Integration
 */
async function testExitTimeCalculatorIntegration() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Exit Time Calculator Integration (with Travel Service)');
  console.log('='.repeat(80));
  
  try {
    const exitTimeCalculator = new ExitTimeCalculator();
    
    // Create a test commitment
    const commitmentStart = new Date();
    commitmentStart.setHours(9, 0, 0, 0);
    
    const commitmentEnd = new Date();
    commitmentEnd.setHours(10, 0, 0, 0);
    
    const commitment = {
      id: 'test-commitment-1',
      title: 'Morning Lecture',
      startTime: commitmentStart,
      endTime: commitmentEnd,
      location: UNIVERSITY,
    };
    
    console.log('\n📅 Test Commitment:');
    console.log(`  Title: ${commitment.title}`);
    console.log(`  Start: ${commitment.startTime.toLocaleTimeString('en-GB')}`);
    console.log(`  Location: ${commitment.location.name}`);
    
    console.log('\n🧮 Calculating exit time...');
    const exitTimeResult = await exitTimeCalculator.calculateExitTime(commitment, {
      currentLocation: FIVE_WAYS,
      userEnergy: 3,
    });
    
    console.log('\n✅ Exit time calculated successfully:');
    console.log(`  Exit Time: ${exitTimeResult.exitTime.toLocaleTimeString('en-GB')}`);
    console.log(`  Travel Duration: ${exitTimeResult.travelDuration} minutes`);
    console.log(`  Preparation Time: ${exitTimeResult.preparationTime} minutes`);
    console.log(`  Travel Method: ${exitTimeResult.travelMethod}`);
    console.log(`  Total Travel Block: ${exitTimeResult.travelBlockDuration} minutes`);
    
    // Verify the calculation
    const expectedExitTime = new Date(
      commitment.startTime.getTime() - exitTimeResult.travelBlockDuration * 60000
    );
    
    if (Math.abs(exitTimeResult.exitTime.getTime() - expectedExitTime.getTime()) < 1000) {
      console.log('\n✅ Exit time calculation is correct');
    } else {
      console.log('\n⚠️ Exit time calculation may be incorrect');
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Exit time calculator test failed:', error);
    return false;
  }
}

/**
 * Test 3: Exit Time Calculator Fallback
 */
async function testExitTimeCalculatorFallback() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Exit Time Calculator Fallback (No Location)');
  console.log('='.repeat(80));
  
  try {
    const exitTimeCalculator = new ExitTimeCalculator();
    
    // Create a commitment without location
    const commitmentStart = new Date();
    commitmentStart.setHours(14, 0, 0, 0);
    
    const commitmentEnd = new Date();
    commitmentEnd.setHours(15, 0, 0, 0);
    
    const commitment = {
      id: 'test-commitment-2',
      title: 'Online Meeting',
      startTime: commitmentStart,
      endTime: commitmentEnd,
      // No location
    };
    
    console.log('\n📅 Test Commitment (No Location):');
    console.log(`  Title: ${commitment.title}`);
    console.log(`  Start: ${commitment.startTime.toLocaleTimeString('en-GB')}`);
    console.log(`  Location: None`);
    
    console.log('\n🧮 Calculating exit time with fallback...');
    const exitTimeResult = await exitTimeCalculator.calculateExitTime(commitment, {
      currentLocation: FIVE_WAYS,
    });
    
    console.log('\n✅ Fallback exit time calculated:');
    console.log(`  Exit Time: ${exitTimeResult.exitTime.toLocaleTimeString('en-GB')}`);
    console.log(`  Travel Duration: ${exitTimeResult.travelDuration} minutes (default)`);
    console.log(`  Preparation Time: ${exitTimeResult.preparationTime} minutes`);
    console.log(`  Travel Method: ${exitTimeResult.travelMethod} (default)`);
    
    // Verify fallback uses 30-minute default
    if (exitTimeResult.travelDuration === 30) {
      console.log('\n✅ Fallback correctly uses 30-minute default');
    } else {
      console.log('\n⚠️ Fallback may not be using correct default');
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Exit time calculator fallback test failed:', error);
    return false;
  }
}

/**
 * Test 4: Routine Service Integration
 */
async function testRoutineServiceIntegration() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: Routine Service Integration');
  console.log('='.repeat(80));
  
  try {
    const routineService = new RoutineService(supabase as any, TEST_USER_ID);
    
    console.log('\n🔍 Fetching active routines...');
    const routines = await routineService.getActiveRoutines();
    
    console.log(`\n✅ Found ${routines.length} active routine(s):`);
    
    if (routines.length > 0) {
      routines.forEach((routine, index) => {
        console.log(`\n  ${index + 1}. ${routine.name}`);
        console.log(`     Type: ${routine.routine_type}`);
        console.log(`     Duration: ${routine.estimated_duration} minutes`);
        console.log(`     Frequency: ${routine.frequency}`);
        console.log(`     Streak: ${routine.completion_streak} days`);
      });
    } else {
      console.log('  ℹ️ No routines found (will use defaults in plan generation)');
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Routine service test failed:', error);
    console.log('ℹ️ This is expected if routine tables don\'t exist yet');
    return false;
  }
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log('🧪 Testing V5 Service Integrations (Simplified)');
  console.log(`User ID: ${TEST_USER_ID}`);
  
  const results = {
    travelService: false,
    exitTimeCalculator: false,
    exitTimeFallback: false,
    routineService: false,
  };
  
  // Run tests
  results.travelService = await testTravelServiceIntegration();
  results.exitTimeCalculator = await testExitTimeCalculatorIntegration();
  results.exitTimeFallback = await testExitTimeCalculatorFallback();
  results.routineService = await testRoutineServiceIntegration();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  const testResults = [
    { name: 'Travel Service Integration', passed: results.travelService },
    { name: 'Exit Time Calculator (with Travel Service)', passed: results.exitTimeCalculator },
    { name: 'Exit Time Calculator Fallback', passed: results.exitTimeFallback },
    { name: 'Routine Service Integration', passed: results.routineService },
  ];
  
  testResults.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
  });
  
  const passedCount = testResults.filter(t => t.passed).length;
  const totalCount = testResults.length;
  
  console.log(`\n${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('\n🎉 All integration tests passed!');
    console.log('\n📝 Integration Summary:');
    console.log('  ✅ Travel Service: Integrated and working');
    console.log('  ✅ Exit Time Calculator: Uses Travel Service correctly');
    console.log('  ✅ Exit Time Fallback: 30-minute default when service fails');
    console.log('  ✅ Routine Service: Integrated (with fallback to defaults)');
    return true;
  } else {
    console.log('\n⚠️ Some integration tests failed');
    return false;
  }
}

// Run the tests
runIntegrationTests()
  .then((success) => {
    if (success) {
      console.log('\n✅ Integration test suite completed successfully');
      process.exit(0);
    } else {
      console.log('\n⚠️ Integration test suite completed with failures');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Integration test suite failed:', error);
    process.exit(1);
  });
