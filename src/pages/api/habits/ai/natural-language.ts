// src/pages/api/habits/ai/natural-language.ts - Natural language habit logging
import type { APIRoute } from 'astro';
import { authClient } from '../../../../lib/auth/config';
import { aiInsightsService } from '../../../../lib/habits/ai-insights';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { input } = await request.json();

    if (!input || typeof input !== 'string') {
      return new Response(JSON.stringify({ error: 'Input text is required' }), {
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

    // Parse natural language input
    const parsedLogs = await aiInsightsService.parseNaturalLanguageLog(user.id, input);

    // Log the NLP usage
    await authClient
      .from('habit_nlp_logs')
      .insert({
        user_id: user.id,
        original_input: input,
        parsed_results: parsedLogs,
        confidence_score: parsedLogs.length > 0 ? parsedLogs[0].confidence : 0,
        tokens_used: aiInsightsService.getTokenCosts().natural_language_parsing
      });

    return new Response(JSON.stringify({ 
      success: true, 
      parsedLogs,
      tokenCost: aiInsightsService.getTokenCosts().natural_language_parsing
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error parsing natural language:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse input';
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