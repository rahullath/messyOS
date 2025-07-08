// src/pages/api/ai/daily-briefing.ts
import type { APIRoute } from 'astro';
import { MessyOSAIAgent } from '../../../lib/intelligence/meshos-ai-agent';
import { createServerClient } from '../../../lib/supabase/server';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Get user from session
    const supabase = createServerClient(cookies);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize AI agent
    const agent = new MessyOSAIAgent(cookies);
    
    // Generate daily briefing
    const briefing = await agent.generateDailyBriefing(session.user.id);

    return new Response(JSON.stringify({
      success: true,
      ...briefing,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
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