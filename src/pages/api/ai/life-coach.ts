import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { GeminiLifeAgent } from '../../../lib/intelligence/gemini-life-agent';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    
    const { message } = await request.json();

    // Get Gemini API key from environment
    const geminiApiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Initialize the advanced Gemini life agent
    const agent = new GeminiLifeAgent(cookies, user.id, geminiApiKey);
    
    // Get intelligent AI response
    const response = await agent.chat(message);

    return new Response(JSON.stringify({ response }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Life coach error:', error);
    
    // Enhanced fallback with more helpful information
    const fallbackMessage = error.message.includes('API key') 
      ? "I need to be configured with a Gemini API key to provide intelligent responses. For now, I can help with basic task and habit management."
      : "I'm having some trouble with my advanced AI right now, but I'm still here to help! Try asking about your tasks, habits, UK move planning, or energy management.";
      
    return new Response(JSON.stringify({ 
      error: error.message,
      response: fallbackMessage
    }), { 
      status: error.message.includes('API key') ? 503 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 