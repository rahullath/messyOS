import type { APIRoute } from 'astro';
import { createServerClient } from 'lib/supabase/server';
import { calculateContentStats, generateRecommendations } from 'lib/content/contentHelpers';

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Get all content metrics
    const { data: contentMetrics, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'content')
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    const content = (contentMetrics || []).map(metric => ({
      id: metric.id,
      user_id: metric.user_id, // Add user_id
      type: metric.metadata?.content_type || 'movie',
      title: metric.metadata?.title || 'Unknown',
      status: metric.metadata?.status || 'completed',
      rating: metric.metadata?.rating,
      genre: metric.metadata?.genre || [],
      language: metric.metadata?.language || 'English',
      runtime_minutes: metric.metadata?.runtime_minutes,
      pages: metric.metadata?.pages,
      release_year: metric.metadata?.release_year, // Add release_year
      completed_at: metric.metadata?.completed_at ? new Date(metric.metadata.completed_at) : undefined, // Convert to Date object
      started_at: metric.metadata?.started_at ? new Date(metric.metadata.started_at) : undefined, // Add started_at and convert to Date object
      platform: metric.metadata?.platform,
      notes: metric.metadata?.notes,
      metadata: metric.metadata,
      recorded_at: new Date(metric.recorded_at) // Convert to Date object
    }));

    // Calculate stats
    const stats = calculateContentStats(content);
    
    // Generate recommendations
    const recommendations = await generateRecommendations(content);

    return new Response(JSON.stringify({
      success: true,
      content,
      stats,
      recommendations
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Content dashboard error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
