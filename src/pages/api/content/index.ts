// src/pages/api/content/index.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { requireAuth } from '../../../lib/auth/serverAuth';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    // Simple auth check
    const user = requireAuth(cookies);
    console.log('✅ User authenticated:', user.email);

    const supabase = createServerClient(cookies);
    
    // Parse query parameters
    const searchParams = url.searchParams;
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'content')
      .order('recorded_at', { ascending: false });

    if (type) {
      query = query.eq('metadata->>content_type', type);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: content, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch content data'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Also get total count
    const { count, error: countError } = await supabase
      .from('metrics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'content');

    return new Response(JSON.stringify({
      success: true,
      content: content || [],
      total: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Content API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch content'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
