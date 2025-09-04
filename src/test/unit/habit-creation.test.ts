// src/test/unit/habit-creation.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Habit Creation Logic', () => {
  // Mock habit creation validation
  const validateHabitData = (habitData: any) => {
    const errors: string[] = [];
    
    if (!habitData.name || habitData.name.trim().length === 0) {
      errors.push('Habit name is required');
    }
    
    if (habitData.name && habitData.name.length > 100) {
      errors.push('Habit name must be less than 100 characters');
    }
    
    if (!habitData.type || !['build', 'break', 'maintain'].includes(habitData.type)) {
      errors.push('Valid habit type is required (build, break, maintain)');
    }
    
    if (!habitData.measurement_type || !['boolean', 'count', 'duration'].includes(habitData.measurement_type)) {
      errors.push('Valid measurement type is required (boolean, count, duration)');
    }
    
    if (habitData.measurement_type === 'count' || habitData.measurement_type === 'duration') {
      if (!habitData.target_value || habitData.target_value <= 0) {
        errors.push('Target value is required for count and duration habits');
      }
    }
    
    if (habitData.target_value && habitData.target_value > 10000) {
      errors.push('Target value must be reasonable (≤ 10000)');
    }
    
    if (habitData.color && !/^#[0-9A-F]{6}$/i.test(habitData.color)) {
      errors.push('Color must be a valid hex color');
    }
    
    return errors;
  };

  it('should validate required fields', () => {
    const invalidHabit = {};
    const errors = validateHabitData(invalidHabit);
    
    expect(errors).toContain('Habit name is required');
    expect(errors).toContain('Valid habit type is required (build, break, maintain)');
    expect(errors).toContain('Valid measurement type is required (boolean, count, duration)');
  });

  it('should accept valid habit data', () => {
    const validHabit = {
      name: 'Daily Exercise',
      type: 'build',
      measurement_type: 'boolean',
      color: '#3B82F6'
    };
    
    const errors = validateHabitData(validHabit);
    expect(errors).toHaveLength(0);
  });

  it('should validate habit name length', () => {
    const longNameHabit = {
      name: 'A'.repeat(101),
      type: 'build',
      measurement_type: 'boolean'
    };
    
    const errors = validateHabitData(longNameHabit);
    expect(errors).toContain('Habit name must be less than 100 characters');
  });

  it('should require target value for count and duration habits', () => {
    const countHabit = {
      name: 'Push-ups',
      type: 'build',
      measurement_type: 'count'
    };
    
    const durationHabit = {
      name: 'Meditation',
      type: 'build',
      measurement_type: 'duration'
    };
    
    expect(validateHabitData(countHabit)).toContain('Target value is required for count and duration habits');
    expect(validateHabitData(durationHabit)).toContain('Target value is required for count and duration habits');
  });

  it('should validate target value limits', () => {
    const extremeHabit = {
      name: 'Extreme Habit',
      type: 'build',
      measurement_type: 'count',
      target_value: 50000
    };
    
    const errors = validateHabitData(extremeHabit);
    expect(errors).toContain('Target value must be reasonable (≤ 10000)');
  });

  it('should validate color format', () => {
    const invalidColorHabit = {
      name: 'Test Habit',
      type: 'build',
      measurement_type: 'boolean',
      color: 'invalid-color'
    };
    
    const errors = validateHabitData(invalidColorHabit);
    expect(errors).toContain('Color must be a valid hex color');
  });

  it('should accept valid count habit with target', () => {
    const validCountHabit = {
      name: 'Push-ups',
      type: 'build',
      measurement_type: 'count',
      target_value: 50,
      target_unit: 'reps',
      color: '#10B981'
    };
    
    const errors = validateHabitData(validCountHabit);
    expect(errors).toHaveLength(0);
  });

  it('should accept valid duration habit with target', () => {
    const validDurationHabit = {
      name: 'Meditation',
      type: 'build',
      measurement_type: 'duration',
      target_value: 20,
      target_unit: 'minutes',
      color: '#8B5CF6'
    };
    
    const errors = validateHabitData(validDurationHabit);
    expect(errors).toHaveLength(0);
  });

  it('should validate habit types', () => {
    const invalidTypeHabit = {
      name: 'Test Habit',
      type: 'invalid-type',
      measurement_type: 'boolean'
    };
    
    const errors = validateHabitData(invalidTypeHabit);
    expect(errors).toContain('Valid habit type is required (build, break, maintain)');
  });

  it('should validate measurement types', () => {
    const invalidMeasurementHabit = {
      name: 'Test Habit',
      type: 'build',
      measurement_type: 'invalid-measurement'
    };
    
    const errors = validateHabitData(invalidMeasurementHabit);
    expect(errors).toContain('Valid measurement type is required (boolean, count, duration)');
  });
});