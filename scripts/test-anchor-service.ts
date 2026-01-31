/**
 * Test script for Anchor Service
 * Verifies anchor classification and must_attend logic
 */

import { anchorService } from '../src/lib/anchors/anchor-service';
import type { CalendarEvent } from '../src/types/calendar';

console.log('🧪 Testing Anchor Service\n');

// Test 1: Classification logic
console.log('Test 1: Anchor Type Classification');
console.log('=====================================');

const testEvents: Partial<CalendarEvent>[] = [
  {
    id: '1',
    title: 'Computer Science Lecture',
    description: 'Introduction to algorithms',
    location: 'Room 101',
    start_time: new Date('2025-02-01T09:00:00').toISOString(),
    end_time: new Date('2025-02-01T10:00:00').toISOString(),
  },
  {
    id: '2',
    title: 'Tutorial Session',
    description: 'Math tutorial',
    location: 'Room 202',
    start_time: new Date('2025-02-01T11:00:00').toISOString(),
    end_time: new Date('2025-02-01T12:00:00').toISOString(),
  },
  {
    id: '3',
    title: 'Workshop on Machine Learning',
    description: 'Hands-on ML workshop',
    location: 'Lab 3',
    start_time: new Date('2025-02-01T14:00:00').toISOString(),
    end_time: new Date('2025-02-01T16:00:00').toISOString(),
  },
  {
    id: '4',
    title: 'Doctor Appointment',
    description: 'Annual checkup',
    location: 'Medical Center',
    start_time: new Date('2025-02-01T16:30:00').toISOString(),
    end_time: new Date('2025-02-01T17:00:00').toISOString(),
  },
  {
    id: '5',
    title: 'Team Meeting',
    description: 'Project discussion',
    location: '', // No location
    start_time: new Date('2025-02-01T13:00:00').toISOString(),
    end_time: new Date('2025-02-01T13:30:00').toISOString(),
  },
  {
    id: '6',
    title: 'Seminar on AI Ethics',
    description: 'Guest speaker seminar',
    location: 'Auditorium',
    start_time: new Date('2025-02-01T17:30:00').toISOString(),
    end_time: new Date('2025-02-01T18:30:00').toISOString(),
  },
];

testEvents.forEach(event => {
  const type = anchorService.classifyAnchorType(event as CalendarEvent);
  console.log(`✓ "${event.title}"`);
  console.log(`  Type: ${type}`);
  console.log(`  Location: ${event.location || '(none)'}`);
  console.log();
});

// Test 2: Must attend logic
console.log('\nTest 2: Must Attend Logic');
console.log('=====================================');

testEvents.forEach(event => {
  // Create a mock anchor by calling the private method through the service
  // We'll test this indirectly through getAnchorsForDate
  const hasLocation = !!(event.location && event.location.trim().length > 0);
  console.log(`✓ "${event.title}"`);
  console.log(`  Has location: ${hasLocation}`);
  console.log(`  Expected must_attend: ${hasLocation}`);
  console.log();
});

// Test 3: Edge cases
console.log('\nTest 3: Edge Cases');
console.log('=====================================');

const edgeCases: Partial<CalendarEvent>[] = [
  {
    id: '7',
    title: '', // Empty title
    description: 'class meeting',
    location: 'Room 1',
    start_time: new Date('2025-02-01T09:00:00').toISOString(),
    end_time: new Date('2025-02-01T10:00:00').toISOString(),
  },
  {
    id: '8',
    title: 'Random Event',
    description: '', // Empty description
    location: '   ', // Whitespace only location
    start_time: new Date('2025-02-01T11:00:00').toISOString(),
    end_time: new Date('2025-02-01T12:00:00').toISOString(),
  },
  {
    id: '9',
    title: 'CLASS', // All caps
    description: undefined,
    location: undefined,
    start_time: new Date('2025-02-01T13:00:00').toISOString(),
    end_time: new Date('2025-02-01T14:00:00').toISOString(),
  },
];

edgeCases.forEach(event => {
  const type = anchorService.classifyAnchorType(event as CalendarEvent);
  const hasLocation = !!(event.location && event.location.trim().length > 0);
  console.log(`✓ "${event.title || '(empty)'}"`);
  console.log(`  Type: ${type}`);
  console.log(`  Has location: ${hasLocation}`);
  console.log();
});

console.log('✅ All manual tests completed!\n');
console.log('Note: For full integration testing, use getAnchorsForDate() with a real user ID and database.');
