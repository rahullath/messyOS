// src/pages/api/ai/actions.ts - AI Actions API Endpoint
// Provides access to AI action logs with filtering and feedback capabilities

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const type = url.searchParams.get('type');
    const executed = url.searchParams.get('executed');
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
    const offset = (page - 1) * limit;

    // Build query
    let query = serverAuth.supabase
      .from('ai_actions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (type && type !== 'all') {
      query = query.eq('action_type', type);
    }

    if (executed === 'true') {
      query = query.eq('executed', true);
    } else if (executed === 'false') {
      query = query.eq('executed', false);
    }

    const { data: actions, error, count } = await query;

    if (error) {
      console.error('Database error fetching actions:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch actions' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get statistics
    const { data: stats } = await serverAuth.supabase
      .from('ai_actions')
      .select('action_type, executed, user_feedback')
      .eq('user_id', user.id);

    const statistics = {
      total_actions: stats?.length || 0,
      executed_actions: stats?.filter(a => a.executed).length || 0,
      pending_actions: stats?.filter(a => !a.executed).length || 0,
      approved_actions: stats?.filter(a => a.user_feedback === 'approved').length || 0,
      rejected_actions: stats?.filter(a => a.user_feedback === 'rejected').length || 0,
      action_types: [...new Set(stats?.map(a => a.action_type) || [])],
      execution_rate: stats?.length > 0 
        ? Math.round((stats.filter(a => a.executed).length / stats.length) * 100) 
        : 0
    };

    return new Response(JSON.stringify({ 
      success: true, 
      actions: actions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        has_more: (count || 0) > offset + limit
      },
      statistics
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Actions API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};