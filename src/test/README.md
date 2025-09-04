# Habits Module Test Suite

This directory contains a comprehensive testing suite for the Habits module, covering all aspects of functionality from unit tests to performance testing.

## Test Structure

### Unit Tests (`src/test/unit/`)
Tests individual functions and components in isolation:

- **`habit-creation.test.ts`** - Tests habit creation validation logic
- **`habit-logging.test.ts`** - Tests enhanced logging validation and sanitization
- **`streak-calculation-advanced.test.ts`** - Tests advanced streak calculation for different habit types

### Integration Tests (`src/test/integration/`)
Tests interactions between components and API endpoints:

- **`streak-calculation.test.ts`** - Tests basic streak calculation logic
- **`enhanced-logging.test.ts`** - Tests enhanced logging API endpoints
- **`habits-enhanced-logging-e2e.test.ts`** - End-to-end enhanced logging workflow
- **`analytics-generation.test.ts`** - Tests analytics generation and processing
- **`mobile-quick-actions.test.tsx`** - Tests mobile quick actions functionality
- **`mobile-pwa-offline.test.ts`** - Tests PWA installation and offline behavior

### End-to-End Tests (`src/test/e2e/`)
Tests complete user workflows from start to finish:

- **`habit-workflow.test.ts`** - Complete habit creation, logging, and analytics workflows

### Performance Tests (`src/test/performance/`)
Tests system performance under load and with large datasets:

- **`habits-performance.test.ts`** - Large dataset handling and concurrent user testing

## Running Tests

### All Habits Tests
```bash
npm run test:habits:all
```

### By Category
```bash
# Unit tests only
npm run test:habits:unit

# Integration tests only
npm run test:habits:integration

# End-to-end tests only
npm run test:habits:e2e

# Performance tests only
npm run test:habits:performance
```

### Individual Test Files
```bash
# Run specific test file
npx vitest src/test/unit/habit-creation.test.ts

# Watch mode for development
npx vitest src/test/unit/habit-creation.test.ts --watch
```

### With Coverage
```bash
npm run test:coverage
```

## Test Coverage Areas

### ✅ Habit Creation
- Form validation (required fields, data types, limits)
- Habit templates and suggestions
- Color validation and defaults
- Error handling and user feedback

### ✅ Habit Logging
- Enhanced logging with context data
- Validation of completion statuses (0-3)
- Date validation (no future dates)
- Context field validation (effort, mood, energy 1-5)
- Duration and time format validation
- Notes length validation
- Data sanitization and defaults

### ✅ Streak Calculation
- Basic streak calculation logic
- Advanced streak calculation for different habit types:
  - Build habits (completed/partial = success)
  - Break habits (not doing = success)
  - Maintain habits (completed/partial = success)
- Handling of skipped days
- Edge cases (timezone changes, gaps in data)
- Performance optimization for long histories

### ✅ Analytics Generation
- Completion rate calculations
- Context correlation analysis
- Streak timeline generation
- Cross-habit correlation analysis
- Large dataset processing
- Performance metrics and optimization

### ✅ Mobile Functionality
- Quick actions widget
- Swipe gestures for completion
- Touch interactions and long press
- Batch completion
- Virtual scrolling for performance

### ✅ PWA & Offline Behavior
- Service worker registration
- PWA installation prompts
- Network status detection
- Offline action queuing
- Background sync when online
- IndexedDB storage for offline data

### ✅ Performance & Scalability
- Large dataset handling (10,000+ habits, 100,000+ entries)
- Concurrent user testing (100+ simultaneous users)
- Memory usage optimization
- Database query optimization
- Caching strategies and invalidation
- Response time benchmarks

## Performance Benchmarks

| Operation | Target | Description |
|-----------|--------|-------------|
| Habit Creation | < 500ms | Complete habit creation workflow |
| Habit Logging | < 300ms | Enhanced logging with context data |
| Streak Calculation | < 100ms | Process 5 years of daily entries |
| Analytics Generation | < 3s | Large dataset analysis |
| Concurrent Throughput | > 50 RPS | Simultaneous user requests |
| Mobile Rendering | < 100ms | Virtual scrolling performance |

## Test Data Factories

The test suite includes comprehensive data factories for consistent test data generation:

```typescript
import { testDataFactories } from './habits-test-suite';

// Create test habit
const habit = testDataFactories.createTestHabit({
  name: 'Custom Habit',
  type: 'build'
});

// Create test habit entry
const entry = testDataFactories.createTestHabitEntry({
  value: 1,
  mood: 5
});

// Create large dataset for performance testing
const largeDataset = testDataFactories.createLargeDataset(10000, 'entries');
```

## Mock Setup

Tests use comprehensive mocking for:

- **Supabase Client** - Database operations
- **Authentication** - User sessions and permissions
- **Fetch API** - HTTP requests and responses
- **IndexedDB** - Offline storage
- **Service Worker** - PWA functionality
- **Touch Events** - Mobile interactions

## Error Scenarios Tested

- Network failures and timeouts
- Database connection errors
- Authentication failures
- Invalid input data
- Memory pressure conditions
- Concurrent access conflicts
- Offline/online transitions

## Continuous Integration

Tests are designed to run in CI/CD environments with:

- Deterministic test data
- Proper cleanup between tests
- Performance regression detection
- Coverage reporting
- Parallel test execution

## Contributing

When adding new habits functionality:

1. **Add unit tests** for individual functions
2. **Add integration tests** for API endpoints
3. **Update e2e tests** if user workflows change
4. **Add performance tests** for new data processing
5. **Update benchmarks** if performance targets change

### Test Naming Convention

- Unit tests: `describe('Function/Component Name')`
- Integration tests: `describe('API Endpoint or Feature Integration')`
- E2E tests: `describe('Complete User Workflow')`
- Performance tests: `describe('Performance Scenario')`

### Assertion Guidelines

- Use descriptive test names that explain the scenario
- Include both positive and negative test cases
- Test edge cases and boundary conditions
- Verify error messages and user feedback
- Check performance metrics where applicable

## Debugging Tests

### Common Issues

1. **Async/Await Problems** - Ensure all promises are properly awaited
2. **Mock Setup** - Verify mocks are reset between tests
3. **DOM Cleanup** - Clean up DOM elements after tests
4. **Timer Issues** - Use `vi.useFakeTimers()` for time-dependent tests

### Debug Commands

```bash
# Run with debug output
DEBUG=* npm run test:habits:unit

# Run single test with verbose output
npx vitest src/test/unit/habit-creation.test.ts --reporter=verbose

# Run with UI for interactive debugging
npm run test:ui
```

## Test Maintenance

- Review and update tests when requirements change
- Monitor test execution times and optimize slow tests
- Update mock data to reflect real-world scenarios
- Ensure tests remain deterministic and reliable
- Regular cleanup of obsolete tests and test data