import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { ContentAnalytics } from '../../../lib/content/ContentAnalytics';

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Fetch all content metrics for the user
    const { data: contentMetrics, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'content')
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    // Convert metrics to content entries
    const content = (contentMetrics || []).map(metric => ({
      id: metric.id,
      user_id: metric.user_id,
      type: metric.metadata?.content_type || 'movie',
      title: metric.metadata?.title || 'Unknown',
      status: metric.metadata?.status || 'completed',
      rating: metric.metadata?.rating,
      genre: metric.metadata?.genre || [],
      language: metric.metadata?.language || 'English',
      runtime_minutes: metric.metadata?.runtime_minutes,
      pages: metric.metadata?.pages,
      completed_at: metric.metadata?.completed_at ? new Date(metric.metadata.completed_at) : undefined,
      started_at: metric.metadata?.started_at ? new Date(metric.metadata.started_at) : undefined,
      platform: metric.metadata?.platform,
      notes: metric.metadata?.notes,
      metadata: metric.metadata,
      recorded_at: new Date(metric.recorded_at)
    }));

    // Use ContentAnalytics to generate insights
    const contentAnalytics = new ContentAnalytics();
    const insights = await contentAnalytics.generateContentInsights(content);

    return new Response(JSON.stringify({
      success: true,
      analytics: {
        goalProgress: insights.goals.yearlyGoals,
        genreAnalysis: insights.genrePreferences,
        ratingAnalysis: {
          averageRating: insights.watchingPatterns.averageRating,
          totalWatchTime: insights.watchingPatterns.totalWatchTime
        },
        insights: [
          `Your most active month is ${insights.watchingPatterns.mostActiveMonth}`,
          `You've watched content from ${insights.genrePreferences.topGenres.length} different genres`
        ],
        recommendations: insights.recommendations.movies
          .slice(0, 3)
          .map(movie => `Consider watching "${movie.title}" (${movie.year}) - ${movie.genre.join(', ')}`)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Content insights error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
