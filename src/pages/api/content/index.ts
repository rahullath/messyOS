// src/pages/api/content/index.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const GET: APIRoute = async ({ url, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in /api/content:', authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log('User ID in /api/content:', user.id);

    // Parse query parameters
    const searchParams = url.searchParams;
    const type = searchParams.get('type'); // 'movie', 'tv_show', 'book'
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'content')
      .order('recorded_at', { ascending: false });

    // Add type filter if specified
    if (type) {
      query = query.eq('metadata->>content_type', type);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);
    console.log('Supabase query for /api/content:', query.toString());

    const { data: content, error } = await query;

    if (error) {
      console.error('Database error in /api/content:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch content data'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Also get total count for pagination
    const { count, error: countError } = await supabase
      .from('metrics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'content');

    if (countError) {
      console.error('Count error:', countError);
    }
    console.log('Fetched content data from Supabase:', content);

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

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { title, content_type, rating, status, notes, genres, platform } = body;

    if (!title || !content_type) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Title and content_type are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentEntry = {
      user_id: user.id,
      type: 'content',
      value: rating || 0,
      unit: 'rating',
      metadata: {
        title,
        content_type,
        status: status || 'completed',
        rating: rating || null,
        notes: notes || null,
        genres: genres || [],
        platform: platform || null,
        watched_date: new Date().toISOString(),
        source: 'manual',
        created_at: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('metrics')
      .insert([contentEntry])
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create content entry'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      content: data,
      message: 'Content entry created successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Content creation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to create content entry'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
