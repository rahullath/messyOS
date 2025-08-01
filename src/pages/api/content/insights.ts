import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { ContentAnalytics } from '../../../lib/content/ContentAnalytics';
import type { Tables } from '../../../types/supabase';

// Define a type for the metadata for content metrics
interface ContentMetadata {
  content_type?: string;
  title?: string;
  status?: string;
  rating?: number;
  genre?: string[];
  language?: string;
  runtime_minutes?: number;
  pages?: number;
  completed_at?: string;
  started_at?: string;
  platform?: string;
  notes?: string;
}

export const GET: APIRoute = async ({ cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    

    // Fetch all content metrics for the user
    const { data: contentMetrics, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'content')
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    // Convert metrics to content entries
    const content = (contentMetrics || []).map((metric: Tables<'metrics'>) => {
      const metadata = metric.metadata as ContentMetadata | null;
      return {
        id: metric.id,
        user_id: metric.user_id,
        type: metadata?.content_type || 'movie',
        title: metadata?.title || 'Unknown',
        status: metadata?.status || 'completed',
        rating: metadata?.rating,
        genre: metadata?.genre || [],
        language: metadata?.language || 'English',
        runtime_minutes: metadata?.runtime_minutes,
        pages: metadata?.pages,
        completed_at: metadata?.completed_at ? new Date(metadata.completed_at) : undefined,
        started_at: metadata?.started_at ? new Date(metadata.started_at) : undefined,
        platform: metadata?.platform,
        notes: metadata?.notes,
        metadata: metadata,
        recorded_at: metric.recorded_at ? new Date(metric.recorded_at) : new Date()
      };
    });

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

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
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
