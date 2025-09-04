// src/test/integration/ai-api-endpoints.test.ts - AI API Endpoints Integration Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the auth client and AI service
vi.mock('../../lib/auth/config', () => ({
  authClient: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              or: vi.fn(() => ({
                then: vi.fn().mockResolvedValue({ data: [], error: null })
              }))
            }))
          }))
        })),
        insert: vi.fn(() => ({
          then: vi.fn().mockResolvedValue({ error: null })
        }))
      }))
    }))
  }
}));

vi.mock('../../lib/habits/ai-insights', () => ({
  aiInsightsService: {
    generateHabitInsights: vi.fn(),
    parseNaturalLanguageLog: vi.fn(),
    generatePersonalizedRecommendations: vi.fn(),
    analyzeOptimalConditions: vi.fn(),
    getTokenCosts: vi.fn(() => ({
      pattern_analysis: 25,
      natural_language_parsing: 15,
      personalized_recommendations: 30,
      optimal_conditions: 20
    }))
  }
}));

describe('AI API Endpoints', () => {
  const mockUser = {
    id: 'test-user-id',
    session: { access_token: 'test-token' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/habits/ai/insights', () => {
    it('should require authentication', async () => {
      const request = new Request('http://localhost/api/habits/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: 'test-habit' })
      });

      // Mock the API route handler
      const { POST } = await import('../../pages/api/habits/ai/insights');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authorization required');
    });

    it('should generate insights with valid authentication', async () => {
      const mockInsights = [
        {
          type: 'pattern',
          title: 'Test Insight',
          description: 'Test description',
          confidence: 0.8,
          actionable: true,
          tokenCost: 25
        }
      ];

      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      // Mock insights generation
      const mockAIService = await import('../../lib/habits/ai-insights');
      vi.mocked(mockAIService.aiInsightsService.generateHabitInsights).mockResolvedValue(mockInsights);

      const request = new Request('http://localhost/api/habits/ai/insights', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ habitId: 'test-habit' })
      });

      const { POST } = await import('../../pages/api/habits/ai/insights');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.insights).toEqual(mockInsights);
      expect(mockAIService.aiInsightsService.generateHabitInsights).toHaveBeenCalledWith(
        mockUser.id,
        'test-habit'
      );
    });

    it('should handle insufficient tokens error', async () => {
      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      // Mock insufficient tokens error
      const mockAIService = await import('../../lib/habits/ai-insights');
      vi.mocked(mockAIService.aiInsightsService.generateHabitInsights).mockRejectedValue(
        new Error('Insufficient tokens for pattern analysis')
      );

      const request = new Request('http://localhost/api/habits/ai/insights', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ habitId: 'test-habit' })
      });

      const { POST } = await import('../../pages/api/habits/ai/insights');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient tokens for pattern analysis');
    });
  });

  describe('POST /api/habits/ai/natural-language', () => {
    it('should require input text', async () => {
      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const request = new Request('http://localhost/api/habits/ai/natural-language', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({})
      });

      const { POST } = await import('../../pages/api/habits/ai/natural-language');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Input text is required');
    });

    it('should parse natural language input', async () => {
      const mockParsedLogs = [
        {
          habitName: 'Exercise',
          habitId: 'habit-1',
          value: 30,
          confidence: 0.9,
          date: '2024-01-01',
          notes: 'Parsed from natural language'
        }
      ];

      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      // Mock NLP parsing
      const mockAIService = await import('../../lib/habits/ai-insights');
      vi.mocked(mockAIService.aiInsightsService.parseNaturalLanguageLog).mockResolvedValue(mockParsedLogs);

      // Mock database insert
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        insert: vi.fn(() => ({
          then: vi.fn().mockResolvedValue({ error: null })
        }))
      } as any);

      const request = new Request('http://localhost/api/habits/ai/natural-language', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ input: 'I exercised for 30 minutes' })
      });

      const { POST } = await import('../../pages/api/habits/ai/natural-language');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.parsedLogs).toEqual(mockParsedLogs);
      expect(data.tokenCost).toBe(15);
      expect(mockAIService.aiInsightsService.parseNaturalLanguageLog).toHaveBeenCalledWith(
        mockUser.id,
        'I exercised for 30 minutes'
      );
    });
  });

  describe('POST /api/habits/ai/recommendations', () => {
    it('should generate personalized recommendations', async () => {
      const mockRecommendations = [
        {
          type: 'timing',
          title: 'Optimal Time for Exercise',
          description: 'You perform best in the morning',
          confidence: 0.8,
          actionable: true,
          habitId: 'habit-1',
          tokenCost: 30
        }
      ];

      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      // Mock recommendations generation
      const mockAIService = await import('../../lib/habits/ai-insights');
      vi.mocked(mockAIService.aiInsightsService.generatePersonalizedRecommendations).mockResolvedValue(mockRecommendations);

      const request = new Request('http://localhost/api/habits/ai/recommendations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });

      const { POST } = await import('../../pages/api/habits/ai/recommendations');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.recommendations).toEqual(mockRecommendations);
      expect(data.tokenCost).toBe(30);
      expect(mockAIService.aiInsightsService.generatePersonalizedRecommendations).toHaveBeenCalledWith(
        mockUser.id
      );
    });
  });

  describe('POST /api/habits/ai/optimal-conditions', () => {
    it('should require habit ID', async () => {
      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      const request = new Request('http://localhost/api/habits/ai/optimal-conditions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({})
      });

      const { POST } = await import('../../pages/api/habits/ai/optimal-conditions');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Habit ID is required');
    });

    it('should analyze optimal conditions', async () => {
      const mockConditions = {
        bestMood: 4,
        bestEnergyLevel: 5,
        optimalLocations: ['Gym', 'Home'],
        favorableWeather: ['Sunny', 'Cloudy'],
        successfulContextTags: ['morning', 'energetic'],
        bestTimeOfDay: '08:00',
        bestDaysOfWeek: ['Monday', 'Wednesday', 'Friday']
      };

      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      // Mock conditions analysis
      const mockAIService = await import('../../lib/habits/ai-insights');
      vi.mocked(mockAIService.aiInsightsService.analyzeOptimalConditions).mockResolvedValue(mockConditions);

      const request = new Request('http://localhost/api/habits/ai/optimal-conditions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({ habitId: 'test-habit' })
      });

      const { POST } = await import('../../pages/api/habits/ai/optimal-conditions');
      const response = await POST({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.conditions).toEqual(mockConditions);
      expect(data.tokenCost).toBe(20);
      expect(mockAIService.aiInsightsService.analyzeOptimalConditions).toHaveBeenCalledWith(
        mockUser.id,
        'test-habit'
      );
    });
  });

  describe('GET /api/habits/ai/insights', () => {
    it('should fetch stored insights', async () => {
      const mockStoredInsights = [
        {
          id: '1',
          user_id: mockUser.id,
          habit_id: 'habit-1',
          insight_type: 'pattern',
          title: 'Stored Insight',
          description: 'This is a stored insight',
          confidence: 0.8,
          is_actionable: true,
          created_at: new Date().toISOString()
        }
      ];

      // Mock auth success
      const mockAuthClient = await import('../../lib/auth/config');
      vi.mocked(mockAuthClient.authClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any);

      // Mock database query
      vi.mocked(mockAuthClient.authClient.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                or: vi.fn(() => ({
                  then: vi.fn().mockResolvedValue({ data: mockStoredInsights, error: null })
                }))
              }))
            }))
          }))
        }))
      } as any);

      const request = new Request('http://localhost/api/habits/ai/insights?limit=10', {
        method: 'GET',
        headers: { 
          'Authorization': 'Bearer test-token'
        }
      });

      const { GET } = await import('../../pages/api/habits/ai/insights');
      const response = await GET({ request, url: new URL(request.url) } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.insights).toEqual(mockStoredInsights);
    });
  });
});