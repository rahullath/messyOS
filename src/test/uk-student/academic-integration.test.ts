// Academic Integration Tests
// Simple integration tests for academic functionality

import { describe, it, expect } from 'vitest';

describe('Academic System Integration', () => {
  it('should have all required academic types defined', () => {
    // Test that types are properly exported
    expect(() => {
      const types = require('../../types/uk-student-academic');
      expect(types).toBeDefined();
      expect(types.AssignmentBreakdownComponent).toBeDefined;
    }).not.toThrow();
  });

  it('should have academic service class available', () => {
    expect(() => {
      const { AcademicService } = require('../../lib/uk-student/academic-service');
      expect(AcademicService).toBeDefined();
      expect(typeof AcademicService.createAssignment).toBe('function');
      expect(typeof AcademicService.breakdownAssignment).toBe('function');
      expect(typeof AcademicService.getAcademicDashboard).toBe('function');
    }).not.toThrow();
  });

  it('should have academic components available', () => {
    expect(() => {
      const AcademicDashboard = require('../../components/uk-student/AcademicDashboard');
      const AssignmentBreakdown = require('../../components/uk-student/AssignmentBreakdown');
      expect(AcademicDashboard).toBeDefined();
      expect(AssignmentBreakdown).toBeDefined();
    }).not.toThrow();
  });

  it('should generate correct assignment tasks for essays', () => {
    const { AcademicService } = require('../../lib/uk-student/academic-service');
    
    const mockAssignment = {
      id: 'test-123',
      assignment_type: 'essay',
      title: 'Test Essay',
      estimated_hours: 15,
      deadline: '2024-12-01T23:59:59Z'
    };

    // Access the private method through reflection for testing
    const tasks = AcademicService.generateAssignmentTasks(mockAssignment);
    
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(5); // Essays should have 5 tasks
    expect(tasks[0].title).toBe('Research and Reading');
    expect(tasks[1].title).toBe('Create Outline');
    expect(tasks[2].title).toBe('Write First Draft');
    expect(tasks[3].title).toBe('Review and Edit');
    expect(tasks[4].title).toBe('Final Proofreading');
  });

  it('should estimate assignment hours correctly', () => {
    const { AcademicService } = require('../../lib/uk-student/academic-service');
    
    const essayAssignment = {
      assignment_type: 'essay',
      word_count: 2000
    };

    const reportAssignment = {
      assignment_type: 'report',
      word_count: 3000
    };

    // Access the private method for testing
    const essayHours = AcademicService.estimateAssignmentHours(essayAssignment);
    const reportHours = AcademicService.estimateAssignmentHours(reportAssignment);

    expect(essayHours).toBeGreaterThan(0);
    expect(reportHours).toBeGreaterThan(essayHours); // Reports should take longer
    expect(typeof essayHours).toBe('number');
    expect(typeof reportHours).toBe('number');
  });

  it('should calculate task deadlines correctly', () => {
    const { AcademicService } = require('../../lib/uk-student/academic-service');
    
    const assignmentDeadline = '2024-12-01T23:59:59Z';
    const offsetDays = 7;

    const taskDeadline = AcademicService.calculateTaskDeadline(assignmentDeadline, offsetDays);
    
    expect(taskDeadline).toBeDefined();
    expect(typeof taskDeadline).toBe('string');
    expect(new Date(taskDeadline)).toBeInstanceOf(Date);
    expect(new Date(taskDeadline).getTime()).toBeLessThan(new Date(assignmentDeadline).getTime());
  });

  it('should determine session types correctly', () => {
    const { AcademicService } = require('../../lib/uk-student/academic-service');
    
    expect(AcademicService.getSessionTypeForTask('Research and Reading')).toBe('research');
    expect(AcademicService.getSessionTypeForTask('Write First Draft')).toBe('writing');
    expect(AcademicService.getSessionTypeForTask('Review and Edit')).toBe('revision');
    expect(AcademicService.getSessionTypeForTask('Study Session')).toBe('reading');
  });
});