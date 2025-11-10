// src/pages/api/habits/ai/insights.ts - Generate AI-powered habit insights
import type { APIRoute } from 'astro';
import { authClient } from '../../../../lib/auth/config';
import { aiInsightsService } from '../../../../lib/habits/ai-insights';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { habitId } = await request.json();

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

    // Generate insights
    const insights = await aiInsightsService.generateHabitInsights(user.id, habitId);

    return new Response(JSON.stringify({ 
      success: true, 
      insights,
      tokenCosts: aiInsightsService.getTokenCosts()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate insights';
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

export const GET: APIRoute = async ({ request, url }) => {
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

    const habitId = url.searchParams.get('habitId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Get stored insights from database
    let query = authClient
      .from('habit_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (habitId) {
      query = query.eq('habit_id', habitId);
    }

    // Only get non-expired insights
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

    const { data: insights, error } = await query;

    if (error) {
      throw new Error('Failed to fetch insights');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      insights: insights || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching insights:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch insights',
      success: false 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};