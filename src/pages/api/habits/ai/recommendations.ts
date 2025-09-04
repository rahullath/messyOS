// src/pages/api/habits/ai/recommendations.ts - Generate personalized recommendations
import type { APIRoute } from 'astro';
import { authClient } from '../../../../lib/auth/config';
import { aiInsightsService } from '../../../../lib/habits/ai-insights';

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // Generate personalized recommendations
    const recommendations = await aiInsightsService.generatePersonalizedRecommendations(user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      recommendations,
      tokenCost: aiInsightsService.getTokenCosts().personalized_recommendations
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate recommendations';
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