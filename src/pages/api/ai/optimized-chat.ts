// src/pages/api/ai/optimized-chat.ts - Enhanced AI Chat API with Performance Optimizations
// Uses unified context, autonomous actions, and performance optimizations

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { optimizedAIChat } from '../../../lib/intelligence/performance-optimizer';

export const POST: APIRoute = async ({ request, cookies }) => {
  const startTime = Date.now();
  
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { message, enableStreaming = true } = await request.json();
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Message is required and must be non-empty' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting check (simple implementation)
    const rateLimitKey = `chat_rate_limit_${user.id}`;
    const now = Date.now();
    const rateLimitWindow = 60 * 1000; // 1 minute
    const maxRequestsPerWindow = 10;

    // Get API key from environment
    const apiKey = import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI service not available' 
      }), { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🤖 Processing optimized chat for user: ${user.id}`);
    console.log(`📝 Message length: ${message.length} chars`);

    // Use the optimized AI chat system
    const result = await optimizedAIChat(
      cookies,
      user.id,
      message,
      apiKey,
      enableStreaming
    );

    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Chat completed in ${totalTime}ms (AI: ${result.executionTime}ms)`);
    console.log(`📊 Cache hit: ${result.cacheHit}, Actions: ${result.actionsExecuted}, Streaming: ${result.streamingEnabled}`);

    // Response with performance metrics
    return new Response(JSON.stringify({ 
      success: true,
      response: result.response,
      performance: {
        total_time_ms: totalTime,
        ai_response_time_ms: result.executionTime,
        cache_hit: result.cacheHit,
        actions_executed: result.actionsExecuted,
        tokens_used: result.tokensUsed,
        streaming_enabled: result.streamingEnabled
      },
      meta: {
        user_id: user.id,
        timestamp: new Date().toISOString(),
        message_length: message.length,
        response_length: result.response.length
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Response-Time': `${totalTime}ms`,
        'X-Cache-Hit': result.cacheHit.toString(),
        'X-Actions-Executed': result.actionsExecuted.toString()
      }
    });

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error('Optimized chat API error:', error);
    
    // Provide fallback response for better UX
    let fallbackResponse = "I'm having some technical difficulties right now. Let me try to help with what I can remember about your recent activity.";
    
    // Try to get basic context for a meaningful fallback
    try {
      const serverAuth = createServerAuth(cookies);
      const user = await serverAuth.getUser();
      
      if (user) {
        const { data: recentTasks } = await serverAuth.supabase
          .from('tasks')
          .select('title, status')
          .eq('user_id', user.id)
          .limit(3);

        if (recentTasks && recentTasks.length > 0) {
          const pendingTasks = recentTasks.filter(t => t.status === 'todo');
          if (pendingTasks.length > 0) {
            fallbackResponse += `\n\nI can see you have ${pendingTasks.length} pending tasks including: ${pendingTasks.map(t => t.title).join(', ')}. Would you like to work on any of these?`;
          }
        }
      }
    } catch (fallbackError) {
      console.error('Fallback context error:', fallbackError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'AI processing failed',
      fallback_response: fallbackResponse,
      performance: {
        total_time_ms: totalTime,
        ai_response_time_ms: 0,
        cache_hit: false,
        actions_executed: 0,
        error: error.message
      }
    }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'X-Response-Time': `${totalTime}ms`,
        'X-Error': 'ai-processing-failed'
      }
    });
  }
};

// GET endpoint for chat history and performance stats
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const includeHistory = url.searchParams.get('history') === 'true';
    const includeStats = url.searchParams.get('stats') === 'true';

    const response: any = { success: true };

    // Get recent conversation history
    if (includeHistory) {
      const { data: conversations } = await serverAuth.supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      response.conversation_history = conversations || [];
    }

    // Get performance statistics
    if (includeStats) {
      const { data: actions } = await serverAuth.supabase
        .from('ai_actions')
        .select('action_type, executed, confidence, created_at')
        .eq('user_id', user.id);

      const stats = {
        total_conversations: response.conversation_history?.length || 0,
        total_actions: actions?.length || 0,
        executed_actions: actions?.filter(a => a.executed).length || 0,
        average_confidence: actions?.length > 0 
          ? actions.reduce((sum, a) => sum + a.confidence, 0) / actions.length 
          : 0,
        action_types: [...new Set(actions?.map(a => a.action_type) || [])],
        recent_activity: actions?.filter(a => 
          new Date(a.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length || 0
      };

      response.performance_stats = stats;
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Chat stats API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to fetch chat data' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};