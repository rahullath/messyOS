// Integration tests for cross-module functionality
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { crossModuleService } from '../../lib/cross-module/integration-service';
import type { Database } from '../../types/supabase';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

describe('Cross-Module Integration', () => {
  let testUserId: string;
  let testHabitId: string;
  let testTaskId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    });
    
    testUserId = authData.user!.id;

    // Create test profile
    await supabase.from('profiles').insert({
      id: testUserId,
      username: 'testuser',
      full_name: 'Test User'
    });

    // Initialize user tokens
    await supabase.from('user_tokens').insert({
      user_id: testUserId,
      balance: 1000,
      total_earned: 1000,
      total_spent: 0
    });

    // Create test habit
    const { data: habitData } = await supabase.from('habits').insert({
      user_id: testUserId,
      name: 'Test Habit',
      category: 'health',
      type: 'build',
      measurement_type: 'boolean',
      is_active: true
    }).select().single();
    
    testHabitId = habitData!.id;

    // Create test task
    const { data: taskData } = await supabase.from('tasks').insert({
      user_id: testUserId,
      title: 'Test Task',
      category: 'productivity',
      priority: 'high',
      status: 'todo'
    }).select().single();
    
    testTaskId = taskData!.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
      await supabase.from('profiles').delete().eq('id', testUserId);
      await supabase.from('user_tokens').delete().eq('user_id', testUserId);
      await supabase.from('habits').delete().eq('user_id', testUserId);
      await supabase.from('habit_entries').delete().eq('user_id', testUserId);
      await supabase.from('tasks').delete().eq('user_id', testUserId);
      await supabase.from('life_optimization_scores').delete().eq('user_id', testUserId);
      await supabase.from('user_achievements').delete().eq('user_id', testUserId);
      await supabase.from('cross_module_correlations').delete().eq('user_id', testUserId);
    }
  });

  describe('Life Optimization Score Calculation', () => {
    it('should calculate initial life optimization score', async () => {
      const score = await crossModuleService.calculateLifeScore(testUserId);
      
      expect(score).toBeDefined();
      expect(score.user_id).toBe(testUserId);
      expect(score.overall_score).toBeGreaterThanOrEqual(0);
      expect(score.overall_score).toBeLessThanOrEqual(100);
      expect(score.habits_score).toBeGreaterThanOrEqual(0);
      expect(score.tasks_score).toBeGreaterThanOrEqual(0);
      expect(score.health_score).toBeGreaterThanOrEqual(0);
      expect(score.productivity_score).toBeGreaterThanOrEqual(0);
      expect(score.content_score).toBeGreaterThanOrEqual(0);
    });

    it('should update score when habit is completed', async () => {
      // Get initial score
      const initialScore = await crossModuleService.calculateLifeScore(testUserId);
      
      // Complete a habit
      await supabase.from('habit_entries').insert({
        habit_id: testHabitId,
        user_id: testUserId,
        value: 1,
        date: new Date().toISOString().split('T')[0]
      });

      // Get updated score
      const updatedScore = await crossModuleService.calculateLifeScore(testUserId);
      
      expect(updatedScore.habits_score).toBeGreaterThan(initialScore.habits_score);
      expect(updatedScore.overall_score).toBeGreaterThan(initialScore.overall_score);
    });

    it('should update score when task is completed', async () => {
      // Get initial score
      const initialScore = await crossModuleService.calculateLifeScore(testUserId);
      
      // Complete a task
      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', testTaskId);

      // Get updated score
      const updatedScore = await crossModuleService.calculateLifeScore(testUserId);
      
      expect(updatedScore.tasks_score).toBeGreaterThan(initialScore.tasks_score);
      expect(updatedScore.overall_score).toBeGreaterThan(initialScore.overall_score);
    });
  });

  describe('Achievement System', () => {
    it('should award first habit completion achievement', async () => {
      // Complete a habit
      await supabase.from('habit_entries').insert({
        habit_id: testHabitId,
        user_id: testUserId,
        value: 1,
        date: new Date().toISOString().split('T')[0]
      });

      // Check for achievements
      const result = await crossModuleService.checkAchievements(testUserId);
      
      expect(result.success).toBe(true);
      expect(result.new_achievements).toBeDefined();
      
      // Should have earned "First Steps" achievement
      const firstStepsAchievement = result.new_achievements.find(
        a => a.achievement?.name === 'First Steps'
      );
      expect(firstStepsAchievement).toBeDefined();
    });

    it('should award first task completion achievement', async () => {
      // Complete a task
      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', testTaskId);

      // Check for achievements
      const result = await crossModuleService.checkAchievements(testUserId);
      
      expect(result.success).toBe(true);
      
      // Should have earned "Task Tackler" achievement
      const taskTacklerAchievement = result.new_achievements.find(
        a => a.achievement?.name === 'Task Tackler'
      );
      expect(taskTacklerAchievement).toBeDefined();
    });

    it('should award tokens for achievements', async () => {
      // Get initial token balance
      const { data: initialTokens } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      // Complete a habit to trigger achievement
      await supabase.from('habit_entries').insert({
        habit_id: testHabitId,
        user_id: testUserId,
        value: 1,
        date: new Date().toISOString().split('T')[0]
      });

      // Check achievements
      await crossModuleService.checkAchievements(testUserId);

      // Check updated token balance
      const { data: updatedTokens } = await supabase
        .from('user_tokens')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(updatedTokens!.balance).toBeGreaterThan(initialTokens!.balance);
    });
  });

  describe('Cross-Module Correlations', () => {
    it('should calculate correlations with sufficient data', async () => {
      // Create multiple habit entries and task completions over time
      const dates = [];
      for (let i = 0; i < 15; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      // Add habit entries
      for (const date of dates) {
        await supabase.from('habit_entries').insert({
          habit_id: testHabitId,
          user_id: testUserId,
          value: Math.random() > 0.5 ? 1 : 0,
          date
        });
      }

      // Add task completions
      for (let i = 0; i < 10; i++) {
        const { data: taskData } = await supabase.from('tasks').insert({
          user_id: testUserId,
          title: `Task ${i}`,
          category: 'productivity',
          priority: 'medium',
          status: 'completed',
          completed_at: dates[i] + 'T12:00:00Z'
        }).select().single();
      }

      // Calculate correlations
      const result = await crossModuleService.calculateCorrelations(testUserId);
      
      expect(result.success).toBe(true);
      expect(result.correlations).toBeDefined();
      expect(result.insights).toBeDefined();
    });
  });

  describe('Module Statistics', () => {
    it('should return comprehensive module stats', async () => {
      // Add some data
      await supabase.from('habit_entries').insert({
        habit_id: testHabitId,
        user_id: testUserId,
        value: 1,
        date: new Date().toISOString().split('T')[0]
      });

      await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString()
      }).eq('id', testTaskId);

      const stats = await crossModuleService.getModuleStats(testUserId);
      
      expect(stats).toBeDefined();
      expect(stats.habits).toBeDefined();
      expect(stats.tasks).toBeDefined();
      expect(stats.health).toBeDefined();
      expect(stats.productivity).toBeDefined();
      expect(stats.content).toBeDefined();
      
      expect(stats.habits.total).toBeGreaterThan(0);
      expect(stats.habits.active).toBeGreaterThan(0);
      expect(stats.tasks.total).toBeGreaterThan(0);
      expect(stats.tasks.completed).toBeGreaterThan(0);
    });
  });

  describe('Progress Summary Creation', () => {
    it('should create weekly progress summary', async () => {
      // Add some data
      await supabase.from('habit_entries').insert({
        habit_id: testHabitId,
        user_id: testUserId,
        value: 1,
        date: new Date().toISOString().split('T')[0]
      });

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const summary = await crossModuleService.createProgressSummary(
        testUserId,
        'weekly',
        startDate,
        endDate,
        'Test Weekly Summary'
      );
      
      expect(summary).toBeDefined();
      expect(summary.user_id).toBe(testUserId);
      expect(summary.summary_type).toBe('weekly');
      expect(summary.title).toBe('Test Weekly Summary');
      expect(summary.data).toBeDefined();
      expect(summary.data.habits).toBeDefined();
      expect(summary.data.tasks).toBeDefined();
    });
  });
});