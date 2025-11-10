// src/test/integration/ai-insights.test.ts - AI Insights Integration Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiInsightsService } from '../../lib/habits/ai-insights';
import { tokenService } from '../../lib/tokens/service';

// Mock the auth client
vi.mock('../../lib/auth/config', () => ({
  authClient: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn()
          })),
          not: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn()
            }))
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn()
            }))
          }))
        })),
        insert: vi.fn()
      }))
    }))
  }
}));

// Mock the token service
vi.mock('../../lib/tokens/service', () => ({
  tokenService: {
    getTokenBalance: vi.fn(),
    deductTokens: vi.fn()
  }
}));

describe('AI Insights Service', () => {
  const mockUserId = 'test-user-id';
  const mockHabitId = 'test-habit-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateHabitInsights', () => {
    it('should check token balance before generating insights', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);
      vi.mocked(tokenService.deductTokens).mockResolvedValue({ success: false, error: 'No data', current_balance: 100 });

      try {
        await aiInsightsService.generateHabitInsights(mockUserId, mockHabitId);
      } catch (error) {
        // Expected to fail due to mocked data
      }

      expect(tokenService.getTokenBalance).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error for insufficient tokens', async () => {
      const mockBalance = { balance: 10, total_earned: 10, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);

      await expect(
        aiInsightsService.generateHabitInsights(mockUserId, mockHabitId)
      ).rejects.toThrow('Insufficient tokens for pattern analysis');
    });

    it('should return not enough data insight for empty dataset', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);
      vi.mocked(tokenService.deductTokens).mockResolvedValue({ 
        success: true, 
        tokens_deducted: 25, 
        new_balance: 75,
        current_balance: 75
      });

      // Mock empty data response
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(() => ({
                then: vi.fn().mockResolvedValue({ data: [], error: null })
              }))
            }))
          }))
        })),
        insert: vi.fn()
      } as any);

      const insights = await aiInsightsService.generateHabitInsights(mockUserId, mockHabitId);

      expect(insights).toHaveLength(1);
      expect(insights[0].title).toBe('Not Enough Data');
      expect(insights[0].tokenCost).toBe(0);
    });
  });

  describe('parseNaturalLanguageLog', () => {
    it('should check token balance before parsing', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);
      vi.mocked(tokenService.deductTokens).mockResolvedValue({ 
        success: true, 
        tokens_deducted: 15, 
        new_balance: 85,
        current_balance: 85
      });

      // Mock habits data
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ 
              data: [
                { id: '1', name: 'Exercise', type: 'build', measurement_type: 'duration' }
              ], 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({
          then: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const result = await aiInsightsService.parseNaturalLanguageLog(mockUserId, 'I exercised for 30 minutes');

      expect(tokenService.getTokenBalance).toHaveBeenCalledWith(mockUserId);
      expect(tokenService.deductTokens).toHaveBeenCalledWith(
        mockUserId,
        15,
        'Natural Language Habit Parsing',
        'habit_nlp'
      );
    });

    it('should parse exercise duration correctly', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);
      vi.mocked(tokenService.deductTokens).mockResolvedValue({ 
        success: true, 
        tokens_deducted: 15, 
        new_balance: 85,
        current_balance: 85
      });

      // Mock habits data
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ 
              data: [
                { id: '1', name: 'Exercise', type: 'build', measurement_type: 'duration' }
              ], 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({
          then: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const result = await aiInsightsService.parseNaturalLanguageLog(mockUserId, 'I exercised for 45 minutes');

      expect(result).toHaveLength(1);
      expect(result[0].habitName).toBe('Exercise');
      expect(result[0].value).toBe(45);
      expect(result[0].confidence).toBeGreaterThan(0.8);
    });

    it('should handle boolean habits correctly', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);
      vi.mocked(tokenService.deductTokens).mockResolvedValue({ 
        success: true, 
        tokens_deducted: 15, 
        new_balance: 85,
        current_balance: 85
      });

      // Mock habits data
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ 
              data: [
                { id: '2', name: 'Meditation', type: 'build', measurement_type: 'boolean' }
              ], 
              error: null 
            })
          }))
        })),
        insert: vi.fn(() => ({
          then: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const result = await aiInsightsService.parseNaturalLanguageLog(mockUserId, 'I meditated today');

      expect(result).toHaveLength(1);
      expect(result[0].habitName).toBe('Meditation');
      expect(result[0].value).toBe(1);
    });
  });

  describe('generatePersonalizedRecommendations', () => {
    it('should check token balance before generating recommendations', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);
      vi.mocked(tokenService.deductTokens).mockResolvedValue({ 
        success: true, 
        tokens_deducted: 30, 
        new_balance: 70,
        current_balance: 70
      });

      // Mock comprehensive data
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            then: vi.fn().mockResolvedValue({ 
              data: [
                { id: '1', name: 'Exercise', type: 'build', measurement_type: 'duration' }
              ], 
              error: null 
            })
          }))
        }))
      } as any);

      const result = await aiInsightsService.generatePersonalizedRecommendations(mockUserId);

      expect(tokenService.getTokenBalance).toHaveBeenCalledWith(mockUserId);
      expect(tokenService.deductTokens).toHaveBeenCalledWith(
        mockUserId,
        30,
        'Personalized Habit Recommendations',
        'habit_recommendations'
      );
    });
  });

  describe('analyzeOptimalConditions', () => {
    it('should require sufficient context data', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);

      // Mock insufficient data
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  then: vi.fn().mockResolvedValue({ data: [], error: null })
                }))
              }))
            }))
          }))
        }))
      } as any);

      await expect(
        aiInsightsService.analyzeOptimalConditions(mockUserId, mockHabitId)
      ).rejects.toThrow('Not enough context data for optimal conditions analysis');
    });

    it('should analyze conditions with sufficient data', async () => {
      const mockBalance = { balance: 100, total_earned: 100, total_spent: 0, created_at: '', updated_at: '' };
      vi.mocked(tokenService.getTokenBalance).mockResolvedValue(mockBalance);
      vi.mocked(tokenService.deductTokens).mockResolvedValue({ 
        success: true, 
        tokens_deducted: 20, 
        new_balance: 80,
        current_balance: 80
      });

      // Mock sufficient context data
      const mockEntries = [
        { value: 1, mood: 4, energy_level: 5, location: 'Gym', weather: 'Sunny', context_tags: ['morning'], completion_time: '08:00', logged_at: new Date().toISOString() },
        { value: 1, mood: 5, energy_level: 4, location: 'Home', weather: 'Cloudy', context_tags: ['evening'], completion_time: '18:00', logged_at: new Date().toISOString() },
        { value: 1, mood: 4, energy_level: 5, location: 'Gym', weather: 'Sunny', context_tags: ['morning'], completion_time: '08:30', logged_at: new Date().toISOString() },
        { value: 1, mood: 3, energy_level: 3, location: 'Park', weather: 'Rainy', context_tags: ['afternoon'], completion_time: '14:00', logged_at: new Date().toISOString() },
        { value: 1, mood: 5, energy_level: 5, location: 'Gym', weather: 'Sunny', context_tags: ['morning'], completion_time: '08:15', logged_at: new Date().toISOString() }
      ];

      const mockAuthClient = await import('../../lib/auth/config');
      const mockQuery = {
        select: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        not: vi.fn(() => mockQuery),
        order: vi.fn(() => mockQuery),
        limit: vi.fn(() => Promise.resolve({ data: mockEntries, error: null }))
      };
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue(mockQuery as any);

      const result = await aiInsightsService.analyzeOptimalConditions(mockUserId, mockHabitId);

      expect(result.bestMood).toBe(4); // Average of successful entries
      expect(result.bestEnergyLevel).toBe(4);
      expect(result.optimalLocations).toContain('Gym');
      expect(result.favorableWeather).toContain('Sunny');
      expect(result.successfulContextTags).toContain('morning');
    });
  });

  describe('Token Cost Management', () => {
    it('should return correct token costs', () => {
      const costs = aiInsightsService.getTokenCosts();
      
      expect(costs.pattern_analysis).toBe(25);
      expect(costs.natural_language_parsing).toBe(15);
      expect(costs.personalized_recommendations).toBe(30);
      expect(costs.optimal_conditions).toBe(20);
      expect(costs.habit_correlation).toBe(35);
    });
  });
});