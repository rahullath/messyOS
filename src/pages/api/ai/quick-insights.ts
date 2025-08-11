// src/pages/api/ai/quick-insights.ts
import type { APIRoute } from 'astro';
import { SimpleLifeAgent } from '../../../lib/intelligence/simple-life-agent';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Initialize the simple life agent
    const agent = new SimpleLifeAgent(cookies, user.id);
    
    // Get quick optimization suggestions
    const optimizations = await agent.getQuickOptimizations();

    return new Response(JSON.stringify({
      success: true,
      optimizations,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Quick insights error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      optimizations: [
        'Review your task priorities',
        'Complete your most important task first',
        'Maintain consistency in your habits'
      ]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};