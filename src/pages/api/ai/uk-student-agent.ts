import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { UKStudentAIAgent } from '../../../lib/intelligence/uk-student-ai-agent';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    
    const { message, action } = await request.json();

    // Get Gemini API key from environment
    const geminiApiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Initialize the UK Student AI Agent
    const agent = new UKStudentAIAgent(cookies, user.id, geminiApiKey);
    
    let response: any;

    // Handle different action types
    if (action === 'chat') {
      response = await agent.chat(message);
    } else if (action === 'generate_daily_plan') {
      const { wakeTime, sleepTime, energyLevel, weather, specialConsiderations } = await request.json();
      response = await agent.generateHolisticDailyPlan({
        wakeTime,
        sleepTime,
        energyLevel,
        weather,
        specialConsiderations
      });
    } else if (action === 'cross_module_insights') {
      response = await agent.generateCrossModuleInsights();
    } else {
      // Default to chat
      response = await agent.chat(message);
    }

    return new Response(JSON.stringify({ response }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('UK Student AI Agent error:', error);
    
    const fallbackMessage = error.message.includes('API key') 
      ? "I need to be configured with a Gemini API key to provide intelligent responses. For now, I can help with basic task and habit management."
      : "I'm having some trouble with my advanced AI right now, but I'm still here to help! Try asking about your tasks, habits, academic deadlines, budget, or daily optimization.";
      
    return new Response(JSON.stringify({ 
      error: error.message,
      response: fallbackMessage
    }), { 
      status: error.message.includes('API key') ? 503 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
