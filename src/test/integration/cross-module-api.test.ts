// API endpoint tests for cross-module integration
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

describe('Cross-Module API Endpoints', () => {
  let testUserId: string;
  let testAuthToken: string;
  let testHabitId: string;

  beforeEach(async () => {
    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      email_confirm: true
    });
    
    testUserId = authData.user!.id;
    testAuthToken = authData.session!.access_token;

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
      await supabase.from('progress_summaries').delete().eq('user_id', testUserId);
    }
  });

  describe('Life Score API', () => {
    it('should get current life score', async () => {
      const response = await fetch('/api/cross-module/life-score', {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`
        }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.user_id).toBe(testUserId);
      expect(data.data.overall_score).toBeGreaterThanOrEqual(0);
    });

    it('should get life score history', async () => {
      const response = await fetch('/api/cross-module/life-score?history=true&days=7', {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`
        }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should recalculate life score', async () => {
      const response = await fetch('/api/cross-module/life-score', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0]
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.user_id).toBe(testUserId);
    });

    it('should require authentication', async () => {
      const response = await fetch('/api/cross-module/life-score');
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Achievements API', () => {
    it('should get user achievements', async () => {
      const response = await fetch('/api/cross-module/achievements', {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`
        }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should get available achievements', async () => {
      const response = await fetch('/api/cross-module/achievements?type=available', {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`
        }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('should check for new achievements', async () => {
      // Complete a habit first
      await supabase.from('habit_entries').insert({
        habit_id: testHabitId,
        user_id: testUserId,
        value: 1,
        date: new Date().toISOString().split('T')[0]
      });

      const response = await fetch('/api/cross-module/achievements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'check' })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.new_achievements)).toBe(true);
      expect(data.user_stats).toBeDefined();
    });
  });

  describe('Correlations API', () => {
    it('should get existing correlations', async () => {
      const response = await fetch('/api/cross-module/correlations', {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`
        }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should calculate new correlations', async () => {
      const response = await fetch('/api/cross-module/correlations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(Array.isArray(data.correlations)).toBe(true);
      expect(Array.isArray(data.insights)).toBe(true);
    });
  });

  describe('Stats API', () => {
    it('should get module statistics', async () => {
      const response = await fetch('/api/cross-module/stats', {
        headers: {
          'Authorization': `Bearer ${testAuthToken}`
        }
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.habits).toBeDefined();
      expect(data.data.tasks).toBeDefined();
      expect(data.data.health).toBeDefined();
      expect(data.data.productivity).toBeDefined();
      expect(data.data.content).toBeDefined();
    });
  });

  describe('Export API', () => {
    it('should export data as JSON', async () => {
      const response = await fetch('/api/cross-module/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: 'json',
          modules: ['habits', 'tasks'],
          date_range: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          },
          include_insights: true,
          include_achievements: true,
          include_correlations: true
        })
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      
      const data = await response.json();
      expect(data.user_id).toBe(testUserId);
      expect(data.modules).toBeDefined();
    });

    it('should export data as CSV', async () => {
      const response = await fetch('/api/cross-module/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          format: 'csv',
          modules: ['habits', 'tasks'],
          date_range: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
          },
          include_insights: false,
          include_achievements: false,
          include_correlations: false
        })
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('text/csv');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      
      const csvData = await response.text();
      expect(csvData).toContain('Module,Type,Date,Name,Value,Details');
    });
  });

  describe('Share API', () => {
    it('should create progress summary', async () => {
      const response = await fetch('/api/cross-module/share', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'weekly',
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          title: 'Test Weekly Summary',
          make_public: false
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary.user_id).toBe(testUserId);
      expect(data.data.summary.summary_type).toBe('weekly');
    });

    it('should create public shareable summary', async () => {
      const response = await fetch('/api/cross-module/share', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'weekly',
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          title: 'Public Test Summary',
          make_public: true
        })
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.share_url).toBeDefined();
      expect(data.data.share_token).toBeDefined();
      
      // Test retrieving the public summary
      const shareResponse = await fetch(`/api/cross-module/share?token=${data.data.share_token}`);
      expect(shareResponse.ok).toBe(true);
      
      const shareData = await shareResponse.json();
      expect(shareData.success).toBe(true);
      expect(shareData.data.user_display_name).toBeDefined();
      expect(shareData.data.user_id).toBeUndefined(); // Should be removed for privacy
    });
  });
});