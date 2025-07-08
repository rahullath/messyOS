// src/pages/api/ai/chat.ts
import type { APIRoute } from 'astro';
import { MessyOSAIAgent } from '../../../lib/intelligence/meshos-ai-agent';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    
    // Get chat response
    const result = await agent.chat(
      session.user.id,
      message,
      conversationHistory || []
    );

    return new Response(JSON.stringify({
      success: true,
      ...result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};