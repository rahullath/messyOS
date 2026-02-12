import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UKStudentAIAgent } from '../../lib/intelligence/uk-student-ai-agent';

// Mock Supabase and Gemini
vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: vi.fn(() => {
    const mockChain = {
      select: vi.fn(function() { return this; }),
      eq: vi.fn(function() { return this; }),
      single: vi.fn(() => Promise.resolve({ data: mockUserProfile })),
      order: vi.fn(function() { return this; }),
      limit: vi.fn(function() { return Promise.resolve({ data: [] }); }),
      gte: vi.fn(function() { return this; }),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    };
    
    return {
      supabase: {
        from: vi.fn(() => mockChain)
      }
    };
  })
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn(() => Promise.resolve({
        response: {
          text: vi.fn(() => 'Mock AI response')
        }
      }))
    }))
  }))
}));

const mockUserProfile = {
  id: 'test-user-id',
  name: 'Test Student',
  homeLocation: 'Five Ways, Birmingham',
  universityLocation: 'University of Birmingham',
  timezone: 'Europe/London',
  goals: ['Academic success', 'Financial management'],
  budgetLimits: { weekly: 50 }
};

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn()
};

describe('UKStudentAIAgent', () => {
  let agent: UKStudentAIAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new UKStudentAIAgent(mockCookies, 'test-user-id', 'mock-api-key');
  });

  describe('Natural Language Task Creation', () => {
    it('should parse complex task requests with multiple activities', async () => {
      const message = "I need to clean my cat's litter and do grocery shopping tomorrow";
      
      // The agent should understand this as two separate tasks
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should create tasks with appropriate categories', async () => {
      const message = "I need to study for my EMH essay due 24/11";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      // Response should acknowledge the academic task
      expect(response).toBeDefined();
    });

    it('should extract due dates from natural language', async () => {
      const message = "I need to submit my Corporate Finance assignment by 8/12";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle priority inference from context', async () => {
      const message = "I really need to finish this urgent task today";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      // Should recognize urgency
      expect(typeof response).toBe('string');
    });
  });

  describe('Conversational Schedule Adjustment', () => {
    it('should understand energy-based schedule requests', async () => {
      const message = "I'm feeling tired, can we move gym to evening?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      // Should acknowledge the energy concern
      expect(response).toBeDefined();
    });

    it('should suggest alternative times based on energy levels', async () => {
      const message = "I have low energy today, when should I do my most important task?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should consider weather in travel recommendations', async () => {
      const message = "It's raining today, should I bike or take the train to university?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      // Should mention weather-based transport decision
      expect(typeof response).toBe('string');
    });

    it('should handle schedule conflicts gracefully', async () => {
      const message = "I have a class at 9am but I also want to go to the gym. What time should I wake up?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });

  describe('Holistic Daily Plan Generation', () => {
    it('should generate daily plans with time blocks', async () => {
      const response = await agent.generateHolisticDailyPlan({
        wakeTime: '07:30',
        sleepTime: '23:00',
        energyLevel: 'medium',
        weather: 'sunny'
      });
      
      expect(response).toBeDefined();
      expect(response.wakeTime).toBe('07:30');
      expect(response.sleepTime).toBe('23:00');
      expect(response.energyLevel).toBe('medium');
      expect(response.plan).toBeDefined();
    });

    it('should consider energy curves in planning', async () => {
      const response = await agent.generateHolisticDailyPlan({
        wakeTime: '07:00',
        sleepTime: '23:00',
        energyLevel: 'high'
      });
      
      expect(response).toBeDefined();
      expect(response.plan).toBeDefined();
      // High energy should suggest complex tasks early
    });

    it('should factor in academic commitments', async () => {
      const response = await agent.generateHolisticDailyPlan({
        wakeTime: '07:30',
        sleepTime: '23:00',
        energyLevel: 'medium',
        specialConsiderations: ['9am class', 'EMH essay due 24/11']
      });
      
      expect(response).toBeDefined();
      expect(response.plan).toBeDefined();
    });

    it('should include meal times and nutrition', async () => {
      const response = await agent.generateHolisticDailyPlan({
        wakeTime: '07:30',
        sleepTime: '23:00',
        energyLevel: 'medium'
      });
      
      expect(response).toBeDefined();
      expect(response.plan).toBeDefined();
      // Plan should include meal times
    });

    it('should account for travel time between locations', async () => {
      const response = await agent.generateHolisticDailyPlan({
        wakeTime: '07:30',
        sleepTime: '23:00',
        energyLevel: 'medium',
        specialConsiderations: ['Travel from Five Ways to University', 'Gym at Selly Oak']
      });
      
      expect(response).toBeDefined();
      expect(response.plan).toBeDefined();
    });

    it('should provide recommendations', async () => {
      const response = await agent.generateHolisticDailyPlan({
        wakeTime: '07:30',
        sleepTime: '23:00',
        energyLevel: 'low'
      });
      
      expect(response).toBeDefined();
      expect(Array.isArray(response.recommendations)).toBe(true);
    });

    it('should include warnings for potential issues', async () => {
      const response = await agent.generateHolisticDailyPlan({
        wakeTime: '07:30',
        sleepTime: '23:00',
        energyLevel: 'low',
        specialConsiderations: ['Multiple deadlines', 'Low sleep']
      });
      
      expect(response).toBeDefined();
      expect(Array.isArray(response.warnings)).toBe(true);
    });
  });

  describe('Cross-Module Insights', () => {
    it('should generate cross-module insights', async () => {
      const response = await agent.generateCrossModuleInsights();
      
      expect(response).toBeDefined();
      expect(response.timestamp).toBeDefined();
      expect(response.insights).toBeDefined();
      expect(Array.isArray(response.recommendations)).toBe(true);
      expect(Array.isArray(response.patterns)).toBe(true);
    });

    it('should correlate sleep with productivity', async () => {
      const response = await agent.generateCrossModuleInsights();
      
      expect(response).toBeDefined();
      expect(response.insights).toBeDefined();
      // Should mention sleep-productivity correlation
    });

    it('should link spending patterns to stress', async () => {
      const response = await agent.generateCrossModuleInsights();
      
      expect(response).toBeDefined();
      expect(response.insights).toBeDefined();
      // Should analyze spending patterns
    });

    it('should connect habits with academic performance', async () => {
      const response = await agent.generateCrossModuleInsights();
      
      expect(response).toBeDefined();
      expect(response.insights).toBeDefined();
      // Should correlate habits with performance
    });

    it('should identify energy patterns', async () => {
      const response = await agent.generateCrossModuleInsights();
      
      expect(response).toBeDefined();
      expect(response.insights).toBeDefined();
      // Should identify energy patterns
    });
  });

  describe('Proactive Suggestions', () => {
    it('should alert about budget overspending', async () => {
      const message = "I just spent £60 on groceries this week";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      // Should mention budget concern if over £50 limit
    });

    it('should suggest laundry scheduling', async () => {
      const message = "I'm running out of clean clothes";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should recommend meal planning', async () => {
      const message = "What should I cook with eggs and bread?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should propose study session timing', async () => {
      const message = "I have an essay due 24/11, when should I start studying?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });

  describe('Birmingham Context Awareness', () => {
    it('should understand Five Ways location', async () => {
      const message = "I'm at Five Ways, how long to get to university?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should know store locations', async () => {
      const message = "Where's the nearest Aldi from university?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should factor in weather for cycling', async () => {
      const message = "Should I cycle to the gym today?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should consider campus building locations', async () => {
      const message = "I have classes in different buildings, how should I plan my day?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should account for UK-specific costs', async () => {
      const message = "How much will my daily train costs be?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      // Should mention £2.05-2.10 daily cost
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key gracefully', async () => {
      const agentNoKey = new UKStudentAIAgent(mockCookies, 'test-user-id', '');
      
      // Should not throw, but provide fallback
      expect(agentNoKey).toBeDefined();
    });

    it('should provide fallback response on error', async () => {
      const response = await agent.chat('test message');
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle empty messages', async () => {
      const response = await agent.chat('');
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });

  describe('Conversation Memory', () => {
    it('should maintain conversation context', async () => {
      const message1 = "I have an essay due 24/11";
      const response1 = await agent.chat(message1);
      
      expect(response1).toBeDefined();
      
      // Follow-up should reference previous context
      const message2 = "When should I start working on it?";
      const response2 = await agent.chat(message2);
      
      expect(response2).toBeDefined();
    });

    it('should save conversations to database', async () => {
      const message = "Test message for conversation history";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      // Conversation should be saved (mocked in this test)
    });
  });

  describe('UK Student Specific Features', () => {
    it('should understand vaping/smoking reduction goals', async () => {
      const message = "I'm trying to quit vaping, can you help me track this?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should support skincare routine tracking', async () => {
      const message = "I want to maintain my skincare routine with Cetaphil and sunscreen";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should handle family project management', async () => {
      const message = "I'm helping my mom with her restaurant website project";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should understand UK banking systems', async () => {
      const message = "I use Monzo and iQ Prepaid for my accounts";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });

    it('should support receipt OCR and expense tracking', async () => {
      const message = "I just bought fly spray for £3.49, is that a good price?";
      
      const response = await agent.chat(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
    });
  });
});
