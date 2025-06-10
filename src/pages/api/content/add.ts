import type { APIRoute } from 'astro';
import { createServerClient } from 'lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const contentData = await request.json();
    
    // Validate required fields
    if (!contentData.title || !contentData.type) {
      return new Response(JSON.stringify({ 
        error: 'Title and type are required' 
      }), { status: 400 });
    }

    // Create content metric
    const contentMetric = {
      user_id: user.id,
      type: 'content',
      value: contentData.rating || 0,
      unit: 'rating',
      metadata: {
        title: contentData.title,
        content_type: contentData.type,
        status: contentData.status || 'completed',
        rating: contentData.rating,
        genre: contentData.genre || [],
        language: contentData.language || 'English',
        completed_at: contentData.completed_at || new Date().toISOString(),
        platform: contentData.platform,
        notes: contentData.notes,
        runtime_minutes: contentData.runtime_minutes,
        pages: contentData.pages,
        source: 'manual'
      },
      recorded_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('metrics')
      .insert([contentMetric]);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: 'Content added successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Add content error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
