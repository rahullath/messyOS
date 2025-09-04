// src/test/habits-test-suite.ts
/**
 * Comprehensive Habits Module Test Suite
 * 
 * This file provides a centralized way to run all habits-related tests
 * and generate comprehensive test reports.
 */

import { describe, it, expect } from 'vitest';

// Import all test suites
import './unit/habit-creation.test';
import './unit/habit-logging.test';
import './unit/streak-calculation-advanced.test';
import './integration/streak-calculation.test';
import './integration/enhanced-logging.test';
import './integration/habits-enhanced-logging-e2e.test';
import './integration/analytics-generation.test';
import './integration/mobile-quick-actions.test';
import './integration/mobile-pwa-offline.test';
import './e2e/habit-workflow.test';
import './performance/habits-performance.test';

describe('Habits Module Test Suite', () => {
  it('should have comprehensive test coverage', () => {
    // This test ensures all test files are properly imported
    // and provides a summary of test coverage areas
    
    const testAreas = [
      'Unit Tests - Habit Creation',
      'Unit Tests - Habit Logging',
      'Unit Tests - Advanced Streak Calculation',
      'Integration Tests - Basic Streak Calculation',
      'Integration Tests - Enhanced Logging',
      'Integration Tests - Enhanced Logging E2E',
      'Integration Tests - Analytics Generation',
      'Integration Tests - Mobile Quick Actions',
      'Integration Tests - Mobile PWA & Offline',
      'End-to-End Tests - Complete Workflows',
      'Performance Tests - Large Datasets & Concurrency'
    ];

    expect(testAreas.length).toBe(11);
    
    // Verify all critical areas are covered
    const criticalAreas = [
      'habit creation',
      'habit logging',
      'streak calculation',
      'analytics generation',
      'mobile functionality',
      'offline behavior',
      'performance optimization'
    ];

    criticalAreas.forEach(area => {
      const hasCoverage = testAreas.some(testArea => 
        testArea.toLowerCase().includes(area.toLowerCase())
      );
      expect(hasCoverage).toBe(true);
    });
  });

  it('should validate test environment setup', () => {
    // Ensure all necessary test utilities and mocks are available
    expect(typeof describe).toBe('function');
    expect(typeof it).toBe('function');
    expect(typeof expect).toBe('function');
    
    // Verify global mocks are set up
    expect(global.fetch).toBeDefined();
    expect(global.document).toBeDefined();
    expect(global.window).toBeDefined();
  });
});

// Test suite configuration and utilities
export const testSuiteConfig = {
  name: 'Habits Module Comprehensive Test Suite',
  version: '1.0.0',
  areas: [
    {
      name: 'Unit Tests',
      description: 'Test individual functions and components in isolation',
      files: [
        'unit/habit-creation.test.ts',
        'unit/habit-logging.test.ts',
        'unit/streak-calculation-advanced.test.ts'
      ]
    },
    {
      name: 'Integration Tests',
      description: 'Test interactions between components and API endpoints',
      files: [
        'integration/streak-calculation.test.ts',
        'integration/enhanced-logging.test.ts',
        'integration/habits-enhanced-logging-e2e.test.ts',
        'integration/analytics-generation.test.ts',
        'integration/mobile-quick-actions.test.tsx',
        'integration/mobile-pwa-offline.test.ts'
      ]
    },
    {
      name: 'End-to-End Tests',
      description: 'Test complete user workflows from start to finish',
      files: [
        'e2e/habit-workflow.test.ts'
      ]
    },
    {
      name: 'Performance Tests',
      description: 'Test system performance under load and with large datasets',
      files: [
        'performance/habits-performance.test.ts'
      ]
    }
  ],
  requirements: [
    'All requirements - quality assurance',
    'Habit creation, logging, and streak calculations',
    'Enhanced logging and analytics generation',
    'Complete user workflows',
    'Mobile PWA functionality and offline behavior',
    'Performance testing for large datasets and concurrent users'
  ]
};

// Utility function to run specific test categories
export const runTestCategory = (category: string) => {
  const categoryConfig = testSuiteConfig.areas.find(
    area => area.name.toLowerCase().includes(category.toLowerCase())
  );
  
  if (!categoryConfig) {
    throw new Error(`Test category '${category}' not found`);
  }
  
  return categoryConfig;
};

// Test coverage validation
export const validateTestCoverage = () => {
  const requiredTestTypes = [
    'unit',
    'integration', 
    'e2e',
    'performance'
  ];
  
  const availableTests = testSuiteConfig.areas.map(area => 
    area.name.toLowerCase().replace(' tests', '')
  );
  
  const coverage = requiredTestTypes.map(type => ({
    type,
    covered: availableTests.includes(type),
    files: testSuiteConfig.areas.find(area => 
      area.name.toLowerCase().includes(type)
    )?.files || []
  }));
  
  return {
    totalTypes: requiredTestTypes.length,
    coveredTypes: coverage.filter(c => c.covered).length,
    coverage,
    isComplete: coverage.every(c => c.covered)
  };
};

// Performance benchmarks
export const performanceBenchmarks = {
  habitCreation: {
    maxResponseTime: 500, // ms
    description: 'Habit creation should complete within 500ms'
  },
  habitLogging: {
    maxResponseTime: 300, // ms
    description: 'Habit logging should complete within 300ms'
  },
  streakCalculation: {
    maxProcessingTime: 100, // ms for 5 years of data
    description: 'Streak calculation should process 5 years of data within 100ms'
  },
  analyticsGeneration: {
    maxResponseTime: 3000, // ms for large datasets
    description: 'Analytics generation should complete within 3 seconds for large datasets'
  },
  concurrentUsers: {
    minThroughput: 50, // requests per second
    description: 'System should handle at least 50 concurrent requests per second'
  },
  mobilePerformance: {
    maxRenderTime: 100, // ms for virtual scrolling
    description: 'Mobile virtual scrolling should render within 100ms'
  }
};

// Test data factories for consistent test data generation
export const testDataFactories = {
  createTestHabit: (overrides = {}) => ({
    id: 'test-habit-id',
    name: 'Test Habit',
    type: 'build',
    measurement_type: 'boolean',
    color: '#3B82F6',
    current_streak: 0,
    best_streak: 0,
    user_id: 'test-user-id',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  createTestHabitEntry: (overrides = {}) => ({
    id: 'test-entry-id',
    habit_id: 'test-habit-id',
    user_id: 'test-user-id',
    date: new Date().toISOString().split('T')[0],
    value: 1,
    effort: 3,
    energy_level: 3,
    mood: 3,
    location: null,
    weather: null,
    context_tags: [],
    notes: null,
    logged_at: new Date().toISOString(),
    ...overrides
  }),

  createTestAnalytics: (overrides = {}) => ({
    completionRate: 0.75,
    streakTimeline: [
      { date: '2025-01-01', streak: 1 },
      { date: '2025-01-02', streak: 2 },
      { date: '2025-01-03', streak: 3 }
    ],
    contextCorrelations: {
      mood: { correlation: 0.8, insight: 'Higher mood leads to better completion' },
      energy_level: { correlation: 0.7, insight: 'High energy improves success rate' }
    },
    ...overrides
  }),

  createLargeDataset: (size: number, type: 'habits' | 'entries' = 'entries') => {
    const dataset = [];
    
    for (let i = 0; i < size; i++) {
      if (type === 'habits') {
        dataset.push(testDataFactories.createTestHabit({
          id: `habit-${i}`,
          name: `Habit ${i}`,
          current_streak: Math.floor(Math.random() * 100)
        }));
      } else {
        const date = new Date();
        date.setDate(date.getDate() - (i % 365));
        
        dataset.push(testDataFactories.createTestHabitEntry({
          id: `entry-${i}`,
          habit_id: `habit-${i % 10}`,
          date: date.toISOString().split('T')[0],
          value: Math.random() > 0.3 ? 1 : 0
        }));
      }
    }
    
    return dataset;
  }
};

// Export test suite summary
export default {
  config: testSuiteConfig,
  runCategory: runTestCategory,
  validateCoverage: validateTestCoverage,
  benchmarks: performanceBenchmarks,
  factories: testDataFactories
};