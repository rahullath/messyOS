// src/test/unit/habit-logging.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Habit Logging Logic', () => {
  // Mock enhanced logging validation
  const validateEnhancedLogData = (logData: any) => {
    const errors: string[] = [];
    
    // Value validation
    if (logData.value === undefined || logData.value === null) {
      errors.push('Completion status is required');
    }
    
    if (logData.value !== undefined && ![0, 1, 2, 3].includes(logData.value)) {
      errors.push('Invalid completion status (must be 0-3)');
    }
    
    // Date validation
    if (logData.date) {
      const logDate = new Date(logData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (logDate > today) {
        errors.push('Cannot log habits for future dates');
      }
      
      if (isNaN(logDate.getTime())) {
        errors.push('Invalid date format');
      }
    }
    
    // Context field validation
    if (logData.effort !== undefined && (logData.effort < 1 || logData.effort > 5)) {
      errors.push('Effort must be between 1 and 5');
    }
    
    if (logData.energy_level !== undefined && (logData.energy_level < 1 || logData.energy_level > 5)) {
      errors.push('Energy level must be between 1 and 5');
    }
    
    if (logData.mood !== undefined && (logData.mood < 1 || logData.mood > 5)) {
      errors.push('Mood must be between 1 and 5');
    }
    
    // Duration validation
    if (logData.duration_minutes !== undefined) {
      if (logData.duration_minutes < 0 || logData.duration_minutes > 1440) {
        errors.push('Duration must be between 0 and 1440 minutes');
      }
    }
    
    // Time validation
    if (logData.completion_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(logData.completion_time)) {
      errors.push('Invalid time format (use HH:MM)');
    }
    
    // Notes length validation
    if (logData.notes && logData.notes.length > 500) {
      errors.push('Notes must be less than 500 characters');
    }
    
    return errors;
  };

  // Mock context data sanitization
  const sanitizeLogData = (logData: any) => {
    const sanitized = { ...logData };
    
    // Ensure numeric fields are numbers
    if (sanitized.effort !== undefined) sanitized.effort = parseInt(sanitized.effort);
    if (sanitized.energy_level !== undefined) sanitized.energy_level = parseInt(sanitized.energy_level);
    if (sanitized.mood !== undefined) sanitized.mood = parseInt(sanitized.mood);
    if (sanitized.duration_minutes !== undefined) sanitized.duration_minutes = parseInt(sanitized.duration_minutes);
    
    // Sanitize strings
    if (sanitized.notes) sanitized.notes = sanitized.notes.trim();
    if (sanitized.location) sanitized.location = sanitized.location.trim();
    if (sanitized.weather) sanitized.weather = sanitized.weather.trim();
    
    // Ensure context_tags is an array
    if (sanitized.context && !Array.isArray(sanitized.context)) {
      sanitized.context = [];
    }
    
    // Set defaults for required fields
    if (!sanitized.date) {
      sanitized.date = new Date().toISOString().split('T')[0];
    }
    
    if (sanitized.effort === undefined) sanitized.effort = 3;
    if (sanitized.energy_level === undefined) sanitized.energy_level = 3;
    if (sanitized.mood === undefined) sanitized.mood = 3;
    
    return sanitized;
  };

  it('should validate required completion status', () => {
    const invalidLog = {};
    const errors = validateEnhancedLogData(invalidLog);
    
    expect(errors).toContain('Completion status is required');
  });

  it('should validate completion status values', () => {
    const invalidLog = { value: 5 };
    const errors = validateEnhancedLogData(invalidLog);
    
    expect(errors).toContain('Invalid completion status (must be 0-3)');
  });

  it('should accept valid completion statuses', () => {
    const validStatuses = [0, 1, 2, 3]; // Failed, Completed, Skipped, Partial
    
    validStatuses.forEach(status => {
      const logData = { value: status };
      const errors = validateEnhancedLogData(logData);
      expect(errors).not.toContain('Invalid completion status (must be 0-3)');
    });
  });

  it('should prevent future date logging', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const futureLog = {
      value: 1,
      date: tomorrow.toISOString().split('T')[0]
    };
    
    const errors = validateEnhancedLogData(futureLog);
    expect(errors).toContain('Cannot log habits for future dates');
  });

  it('should validate context field ranges', () => {
    const invalidContextLog = {
      value: 1,
      effort: 6,
      energy_level: 0,
      mood: -1
    };
    
    const errors = validateEnhancedLogData(invalidContextLog);
    expect(errors).toContain('Effort must be between 1 and 5');
    expect(errors).toContain('Energy level must be between 1 and 5');
    expect(errors).toContain('Mood must be between 1 and 5');
  });

  it('should validate duration limits', () => {
    const invalidDurationLog = {
      value: 1,
      duration_minutes: 2000 // More than 24 hours
    };
    
    const errors = validateEnhancedLogData(invalidDurationLog);
    expect(errors).toContain('Duration must be between 0 and 1440 minutes');
  });

  it('should validate time format', () => {
    const invalidTimeLog = {
      value: 1,
      completion_time: '25:70' // Invalid time
    };
    
    const errors = validateEnhancedLogData(invalidTimeLog);
    expect(errors).toContain('Invalid time format (use HH:MM)');
  });

  it('should validate notes length', () => {
    const longNotesLog = {
      value: 1,
      notes: 'A'.repeat(501)
    };
    
    const errors = validateEnhancedLogData(longNotesLog);
    expect(errors).toContain('Notes must be less than 500 characters');
  });

  it('should accept valid enhanced log data', () => {
    const validLog = {
      value: 1,
      date: '2025-01-01',
      effort: 4,
      energy_level: 3,
      mood: 5,
      duration_minutes: 45,
      completion_time: '14:30',
      location: 'Gym',
      weather: 'Sunny',
      context: ['Morning', 'High Energy'],
      notes: 'Great workout today!'
    };
    
    const errors = validateEnhancedLogData(validLog);
    expect(errors).toHaveLength(0);
  });

  it('should sanitize numeric fields', () => {
    const rawData = {
      value: 1,
      effort: '4',
      energy_level: '3',
      mood: '5',
      duration_minutes: '45'
    };
    
    const sanitized = sanitizeLogData(rawData);
    
    expect(typeof sanitized.effort).toBe('number');
    expect(typeof sanitized.energy_level).toBe('number');
    expect(typeof sanitized.mood).toBe('number');
    expect(typeof sanitized.duration_minutes).toBe('number');
  });

  it('should trim string fields', () => {
    const rawData = {
      value: 1,
      notes: '  Great workout!  ',
      location: '  Gym  ',
      weather: '  Sunny  '
    };
    
    const sanitized = sanitizeLogData(rawData);
    
    expect(sanitized.notes).toBe('Great workout!');
    expect(sanitized.location).toBe('Gym');
    expect(sanitized.weather).toBe('Sunny');
  });

  it('should set default values', () => {
    const minimalData = { value: 1 };
    const sanitized = sanitizeLogData(minimalData);
    
    expect(sanitized.date).toBeTruthy();
    expect(sanitized.effort).toBe(3);
    expect(sanitized.energy_level).toBe(3);
    expect(sanitized.mood).toBe(3);
  });

  it('should ensure context is an array', () => {
    const invalidContextData = {
      value: 1,
      context: 'not-an-array'
    };
    
    const sanitized = sanitizeLogData(invalidContextData);
    expect(Array.isArray(sanitized.context)).toBe(true);
  });

  it('should handle valid time formats', () => {
    const validTimes = ['00:00', '12:30', '23:59', '9:15'];
    
    validTimes.forEach(time => {
      const logData = { value: 1, completion_time: time };
      const errors = validateEnhancedLogData(logData);
      expect(errors).not.toContain('Invalid time format (use HH:MM)');
    });
  });

  it('should handle edge case durations', () => {
    const edgeCases = [
      { duration_minutes: 0, shouldPass: true },
      { duration_minutes: 1440, shouldPass: true }, // 24 hours
      { duration_minutes: 1441, shouldPass: false }, // Over 24 hours
      { duration_minutes: -1, shouldPass: false }
    ];
    
    edgeCases.forEach(({ duration_minutes, shouldPass }) => {
      const logData = { value: 1, duration_minutes };
      const errors = validateEnhancedLogData(logData);
      
      if (shouldPass) {
        expect(errors).not.toContain('Duration must be between 0 and 1440 minutes');
      } else {
        expect(errors).toContain('Duration must be between 0 and 1440 minutes');
      }
    });
  });
});