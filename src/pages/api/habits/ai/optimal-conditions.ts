// src/pages/api/habits/ai/optimal-conditions.ts - Analyze optimal conditions for habit success
import type { APIRoute } from 'astro';
import { authClient } from '../../../../lib/auth/config';
import { aiInsightsService } from '../../../../lib/habits/ai-insights';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { habitId } = await request.json();

    if (!habitId) {
      return new Response(JSON.stringify({ error: 'Habit ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Analyze optimal conditions
    const conditions = await aiInsightsService.analyzeOptimalConditions(user.id, habitId);

    return new Response(JSON.stringify({ 
      success: true, 
      conditions,
      tokenCost: aiInsightsService.getTokenCosts().optimal_conditions
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error analyzing optimal conditions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze optimal conditions';
    const statusCode = errorMessage.includes('Insufficient tokens') ? 402 : 500;

    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};