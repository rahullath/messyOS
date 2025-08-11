// src/pages/api/ai/daily-briefing.ts
import type { APIRoute } from 'astro';
import { GeminiLifeAgent } from '../../../lib/intelligence/gemini-life-agent';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Get Gemini API key from environment
    const geminiApiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Initialize the advanced Gemini life agent
    const agent = new GeminiLifeAgent(cookies, user.id, geminiApiKey);
    
    // Generate comprehensive daily briefing with AI
    const briefing = await agent.generateDailyBriefing();

    return new Response(JSON.stringify({
      success: true,
      briefing,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('Daily briefing error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to generate daily briefing',
      details: error instanceof Error ? error.message : 'Unknown error',
      briefing: {
        greeting: 'Good day! I\'m preparing your personalized briefing.',
        todaysFocus: 'Focus on your top priority tasks today',
        priorities: ['Check your task list', 'Complete high-priority items', 'Maintain consistency'],
        insights: [],
        warnings: [],
        energyRecommendations: ['Match task difficulty to your current energy level'],
        timelineAlerts: [],
        contextualGuidance: 'Your AI agent is analyzing your patterns to provide better recommendations.'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
