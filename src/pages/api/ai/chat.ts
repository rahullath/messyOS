// src/pages/api/ai/chat.ts
import type { APIRoute } from 'astro';
import { GeminiLifeAgent } from '../../../lib/intelligence/gemini-life-agent';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    

    console.log(`💬 Chat initiated with user ${user.id}`);

    // Initialize AI agent
    const agent = new GeminiLifeAgent(cookies, user.id, process.env.GOOGLE_API_KEY!);
    
    // Get chat response
    const result = await agent.chat(message);

    return new Response(JSON.stringify({
      success: true,
      ai_response: result
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
