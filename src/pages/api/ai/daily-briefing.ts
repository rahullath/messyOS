// src/pages/api/ai/daily-briefing.ts
import type { APIRoute } from 'astro';
import { MessyOSAIAgent } from '../../../lib/intelligence/meshos-ai-agent';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    

    // Initialize AI agent
    const agent = new MessyOSAIAgent(cookies);
    
    // Generate daily briefing
    const briefing = await agent.generateDailyBriefing(user.id);

    return new Response(JSON.stringify({
      success: true,
      ...briefing,
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
    
    console.error('API Error:', error);
    console.error('Daily briefing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate daily briefing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
