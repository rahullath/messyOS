// src/pages/api/content/dashboard.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Get all content metrics with enriched data
    const { data: contentMetrics, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'content')
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    if (!contentMetrics || contentMetrics.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        content: [],
        stats: {
          total: 0,
          movies: 0,
          tv_shows: 0,
          books: 0,
          avgRating: 0,
          topGenres: [],
          recentlyWatched: [],
          monthlyProgress: [],
          upcomingEpisodes: []
        },
        recommendations: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process enriched Serializd data
    const content = contentMetrics.map(metric => {
      const metadata = metric.metadata || {};
      
      // Handle enriched data structure from Serializd import
      return {
        id: metric.id,
        user_id: metric.user_id,
        
        // Extract enriched fields that might be at the root of metadata
        Title: metadata.title || metadata.Title,
        TMDB_Title: metadata.tmdb_title || metadata.TMDB_Title,
        Original_Title: metadata.original_title || metadata.Original_Title,
        
        // Handle rating formats (both "188/5" string format and numeric)
        Rating: metadata.rating || metadata.Rating,
        
        // Handle genres (can be string or array)
        Genres: metadata.genres || metadata.Genres,
        
        // TMDB data
        TMDB_ID: metadata.tmdb_id || metadata.TMDB_ID,
        Overview: metadata.overview || metadata.Overview,
        Cast: metadata.cast || metadata.Cast,
        Crew: metadata.crew || metadata.Crew,
        Networks: metadata.networks || metadata.Networks,
        
        // Episode/Season info
        Season_Episode: metadata.season_episode || metadata.Season_Episode,
        Number_of_Seasons: metadata.number_of_seasons || metadata.Number_of_Seasons,
        Number_of_Episodes: metadata.number_of_episodes || metadata.Number_of_Episodes,
        
        // Dates
        Watch_Date: metadata.watch_date || metadata.Watch_Date || metadata.completed_at,
        First_Air_Date: metadata.first_air_date || metadata.First_Air_Date,
        Last_Air_Date: metadata.last_air_date || metadata.Last_Air_Date,
        
        // Status and type
        Status: metadata.status || metadata.Status,
        content_type: metadata.content_type,
        
        // Additional metadata
        Keywords: metadata.keywords || metadata.Keywords,
        Languages: metadata.languages || metadata.Languages,
        Original_Language: metadata.original_language || metadata.Original_Language,
        Production_Countries: metadata.production_countries || metadata.Production_Countries,
        Vote_Average: metadata.vote_average || metadata.Vote_Average,
        Vote_Count: metadata.vote_count || metadata.Vote_Count,
        Popularity: metadata.popularity || metadata.Popularity,
        IMDB_ID: metadata.imdb_id || metadata.IMDB_ID,
        Homepage: metadata.homepage || metadata.Homepage,
        Adult: metadata.adult || metadata.Adult,
        
        // Runtime info
        Episode_Runtime: metadata.episode_runtime || metadata.Episode_Runtime,
        Average_Runtime: metadata.average_runtime || metadata.Average_Runtime,
        
        // Review data
        Review_Text: metadata.review_text || metadata.Review_Text,
        Review_ID: metadata.review_id || metadata.Review_ID,
        
        // Original fields for backward compatibility
        platform: metadata.platform,
        runtime_minutes: metadata.runtime_minutes,
        pages: metadata.pages,
        notes: metadata.notes,
        language: metadata.language,
        release_year: metadata.release_year,
        
        // Timestamps
        recorded_at: metric.recorded_at,
        imported_at: metadata.imported_at
      };
    });

    // Calculate comprehensive stats
    const stats = calculateContentStats(content);
    
    // Generate AI recommendations (placeholder for now)
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

function calculateContentStats(content: any[]) {
  const currentYear = new Date().getFullYear();
  
  // Determine content types
  const movies = content.filter(item => {
    const hasSeasons = item.Number_of_Seasons || item.Season_Episode;
    const isReturning = item.Status === 'Returning Series';
    return !hasSeasons && !isReturning;
  });
  
  const tvShows = content.filter(item => {
    const hasSeasons = item.Number_of_Seasons || item.Season_Episode;
    const isReturning = item.Status === 'Returning Series';
    return hasSeasons || isReturning;
  });
  
  const books = content.filter(item => item.content_type === 'book');

  // Parse ratings (handle "188/5" format)
  const ratedContent = content.filter(item => {
    if (!item.Rating) return false;
    
    if (typeof item.Rating === 'string' && item.Rating.includes('/')) {
      const rating = parseInt(item.Rating.split('/')[0]);
      return !isNaN(rating) && rating > 0;
    }
    
    return typeof item.Rating === 'number' && item.Rating > 0;
  });

  const avgRating = ratedContent.length > 0 ? 
    ratedContent.reduce((sum, item) => {
      let rating = 0;
      if (typeof item.Rating === 'string' && item.Rating.includes('/')) {
        rating = parseInt(item.Rating.split('/')[0]) / 20; // Convert "188/5" to 1-10 scale
      } else if (typeof item.Rating === 'number') {
        rating = item.Rating;
      }
      return sum + rating;
    }, 0) / ratedContent.length : 0;

  // Genre analysis
  const genreCount = new Map<string, number>();
  content.forEach(item => {
    let genres: string[] = [];
    
    if (typeof item.Genres === 'string') {
      genres = item.Genres.split(',').map(g => g.trim()).filter(g => g);
    } else if (Array.isArray(item.Genres)) {
      genres = item.Genres;
    }
    
    genres.forEach(genre => {
      genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
    });
  });

  const topGenres = Array.from(genreCount.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Monthly progress (last 12 months)
  const monthlyProgress = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
    
    const count = content.filter(item => {
      const watchDate = item.Watch_Date || item.recorded_at;
      return watchDate && watchDate.startsWith(monthKey);
    }).length;

    monthlyProgress.push({
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      count
    });
  }

  // Get upcoming episodes for returning series
  const upcomingEpisodes = tvShows
    .filter(show => show.Status === 'Returning Series')
    .slice(0, 8)
    .map(show => ({
      title: show.TMDB_Title || show.Title,
      season_episode: 'Next Episode',
      air_date: 'TBA',
      network: show.Networks || 'Unknown',
      poster_url: show.TMDB_ID ? `https://image.tmdb.org/t/p/w300${show.poster_path || ''}` : undefined
    }));

  // Recent activity (last 10 items)
  const recentlyWatched = content
    .filter(item => item.Watch_Date)
    .sort((a, b) => new Date(b.Watch_Date).getTime() - new Date(a.Watch_Date).getTime())
    .slice(0, 10);

  return {
    total: content.length,
    movies: movies.length,
    tv_shows: tvShows.length,
    books: books.length,
    avgRating: Math.round(avgRating * 10) / 10,
    topGenres,
    recentlyWatched,
    monthlyProgress,
    upcomingEpisodes,
    
    // Additional insights
    thisYearCount: content.filter(item => {
      const watchDate = item.Watch_Date || item.recorded_at;
      return watchDate && new Date(watchDate).getFullYear() === currentYear;
    }).length,
    
    // Language diversity
    languages: getLanguageStats(content),
    
    // Rating distribution
    ratingDistribution: getRatingDistribution(content),
    
    // Network/Platform stats
    topPlatforms: getPlatformStats(content)
  };
}

function getLanguageStats(content: any[]) {
  const languageCount = new Map<string, number>();
  
  content.forEach(item => {
    const lang = item.Original_Language || item.Languages || 'en';
    languageCount.set(lang, (languageCount.get(lang) || 0) + 1);
  });
  
  return Array.from(languageCount.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getRatingDistribution(content: any[]) {
  const distribution = [0, 0, 0, 0, 0]; // [1-2, 3-4, 5-6, 7-8, 9-10]
  
  content.forEach(item => {
    let rating = 0;
    if (typeof item.Rating === 'string' && item.Rating.includes('/')) {
      rating = parseInt(item.Rating.split('/')[0]) / 20; // Convert to 1-10 scale
    } else if (typeof item.Rating === 'number') {
      rating = item.Rating;
    }
    
    if (rating > 0) {
      const index = Math.min(Math.floor((rating - 1) / 2), 4);
      distribution[index]++;
    }
  });
  
  return distribution.map((count, index) => ({
    range: `${index * 2 + 1}-${index * 2 + 2}`,
    count
  }));
}

function getPlatformStats(content: any[]) {
  const platformCount = new Map<string, number>();
  
  content.forEach(item => {
    const platform = item.Networks || item.platform || 'Unknown';
    if (platform && platform !== 'Unknown') {
      // Handle multiple networks/platforms
      const platforms = platform.split(',').map((p: string) => p.trim());
      platforms.forEach((p: string) => {
        platformCount.set(p, (platformCount.get(p) || 0) + 1);
      });
    }
  });
  
  return Array.from(platformCount.entries())
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

async function generateRecommendations(content: any[]) {
  // Placeholder for AI-powered recommendations
  // This would integrate with your Gemini AI or other recommendation engine
  
  const genres = new Set<string>();
  const languages = new Set<string>();
  
  content.forEach(item => {
    // Collect genres
    if (typeof item.Genres === 'string') {
      item.Genres.split(',').forEach((g: string) => genres.add(g.trim()));
    } else if (Array.isArray(item.Genres)) {
      item.Genres.forEach((g: string) => genres.add(g));
    }
    
    // Collect languages
    const lang = item.Original_Language || item.Languages;
    if (lang && lang !== 'en') {
      languages.add(lang);
    }
  });

  return {
    genres_to_explore: Array.from(genres).slice(0, 5),
    languages_to_explore: Array.from(languages).slice(0, 3),
    suggested_content: [
      // This would be populated by AI recommendations
      {
        title: "Based on your viewing history...",
        reason: "Expand your genre diversity",
        type: "suggestion"
      }
    ],
    content_goals: {
      "2025_movie_goal": 100,
      "2025_show_goal": 24,
      "2025_book_goal": 12,
      "current_progress": {
        movies: content.filter(item => !item.Number_of_Seasons && !item.Season_Episode).length,
        shows: content.filter(item => item.Number_of_Seasons || item.Season_Episode).length,
        books: content.filter(item => item.content_type === 'book').length
      }
    }
  };
}