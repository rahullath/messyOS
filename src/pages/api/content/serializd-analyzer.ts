// Serializd Content Analysis - Understanding Rahul's taste from 400+ reviews and 490+ shows
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

interface ContentAnalysis {
  taste_profile: {
    preferred_genres: string[];
    preferred_languages: string[];
    preferred_decades: string[];
    content_types: Record<string, number>;
    rating_patterns: {
      average_rating: number;
      rating_distribution: Record<string, number>;
      harsh_critic: boolean;
    };
  };
  viewing_patterns: {
    completion_rate: number;
    binge_tendency: string; // "high", "medium", "low"
    seasonal_preferences: Record<string, string[]>;
    mood_based_viewing: Record<string, string[]>;
  };
  recommendations: {
    immediate_watchlist: Array<{
      title: string;
      type: string;
      genre: string[];
      reason: string;
      confidence: number;
    }>;
    long_term_goals: Array<{
      category: string;
      description: string;
      examples: string[];
    }>;
  };
  insights: {
    unique_traits: string[];
    blind_spots: string[];
    evolution_over_time: string;
  };
}

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  temperature: 0.2,
  apiKey: process.env.GEMINI_API_KEY,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { serializd_data, analysis_type } = await request.json();
    
    // Get authenticated user
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { status: 401 });
    }

    console.log('🎬 Analyzing Serializd data for content recommendations...');

    let analysis: ContentAnalysis;

    switch (analysis_type) {
      case 'full_analysis':
        analysis = await performFullContentAnalysis(serializd_data);
        break;
      case 'taste_profile':
        analysis = await analyzeTasteProfile(serializd_data);
        break;
      case 'recommendations':
        analysis = await generateRecommendations(serializd_data);
        break;
      default:
        analysis = await performFullContentAnalysis(serializd_data);
    }

    // Store analysis results
    await storeContentAnalysis(supabase, user.id, analysis);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Serializd analyzer error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Content analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Perform comprehensive content analysis
async function performFullContentAnalysis(serializdData: string): Promise<ContentAnalysis> {
  const prompt = `
  You are analyzing Rahul's complete Serializd data (400+ reviews, 490+ shows) to understand his content consumption patterns and preferences.

  SERIALIZD DATA:
  ${serializdData}

  Perform a comprehensive analysis to understand:

  1. TASTE PROFILE:
  - What genres does he genuinely enjoy vs. what he watches out of obligation?
  - Language preferences (English, Hindi, Korean, Japanese, etc.)
  - Time period preferences (90s, 2000s, modern, etc.)
  - Content type distribution (movies vs series vs anime vs documentaries)
  - Rating patterns (is he a harsh critic? What gets high ratings?)

  2. VIEWING PATTERNS:
  - Does he complete what he starts?
  - Binge-watching tendency
  - Seasonal viewing preferences
  - Mood-based content choices

  3. UNIQUE INSIGHTS:
  - What makes his taste unique?
  - What are his blind spots?
  - How has his taste evolved?
  - What does he watch when stressed vs. relaxed?

  4. SMART RECOMMENDATIONS:
  - Immediate watchlist (5-10 items he'd definitely enjoy)
  - Long-term content goals (exploring new genres, languages, etc.)
  - Hidden gems he might have missed

  IMPORTANT CONTEXT:
  - If "Friends" is listed, it's likely because he watched it, not because he loved it
  - Look for patterns in his reviews to understand what he actually enjoys
  - Consider his cultural background and current life situation (student, developer, etc.)
  - Be smart about distinguishing between "watched" and "enjoyed"

  Return detailed JSON analysis in this format:
  {
    "taste_profile": {
      "preferred_genres": ["genre1", "genre2"],
      "preferred_languages": ["English", "Hindi"],
      "preferred_decades": ["2000s", "2010s"],
      "content_types": {"movies": 60, "series": 30, "anime": 10},
      "rating_patterns": {
        "average_rating": 7.2,
        "rating_distribution": {"1-3": 5, "4-6": 25, "7-8": 50, "9-10": 20},
        "harsh_critic": false
      }
    },
    "viewing_patterns": {
      "completion_rate": 85,
      "binge_tendency": "high",
      "seasonal_preferences": {"winter": ["drama", "thriller"], "summer": ["comedy", "action"]},
      "mood_based_viewing": {"stressed": ["comedy", "sitcoms"], "relaxed": ["drama", "documentaries"]}
    },
    "recommendations": {
      "immediate_watchlist": [
        {
          "title": "Show Name",
          "type": "series",
          "genre": ["drama", "thriller"],
          "reason": "Matches your preference for complex narratives",
          "confidence": 0.9
        }
      ],
      "long_term_goals": [
        {
          "category": "Explore Korean Cinema",
          "description": "Dive deeper into Korean films beyond mainstream",
          "examples": ["Burning", "Poetry", "Right Now, Wrong Then"]
        }
      ]
    },
    "insights": {
      "unique_traits": ["Appreciates slow-burn narratives", "Values character development"],
      "blind_spots": ["Limited exposure to European cinema", "Rarely watches documentaries"],
      "evolution_over_time": "Started with mainstream, gradually moved to more niche content"
    }
  }

  Be thorough and insightful. This analysis will drive his content recommendations for months.
  `;

  const response = await llm.invoke(prompt);
  
  try {
    return JSON.parse(response.content as string);
  } catch (error) {
    console.error('Failed to parse content analysis:', error);
    // Return a basic structure if parsing fails
    return {
      taste_profile: {
        preferred_genres: [],
        preferred_languages: [],
        preferred_decades: [],
        content_types: {},
        rating_patterns: {
          average_rating: 0,
          rating_distribution: {},
          harsh_critic: false
        }
      },
      viewing_patterns: {
        completion_rate: 0,
        binge_tendency: "medium",
        seasonal_preferences: {},
        mood_based_viewing: {}
      },
      recommendations: {
        immediate_watchlist: [],
        long_term_goals: []
      },
      insights: {
        unique_traits: [],
        blind_spots: [],
        evolution_over_time: ""
      }
    };
  }
}

// Analyze taste profile specifically
async function analyzeTasteProfile(serializdData: string): Promise<ContentAnalysis> {
  const prompt = `
  Focus specifically on understanding Rahul's taste profile from his Serializd data.

  DATA: ${serializdData}

  Analyze:
  1. What genres does he consistently rate highly?
  2. What are his language preferences?
  3. What time periods does he prefer?
  4. Is he a harsh critic or generous with ratings?
  5. What content types does he prefer?

  Return focused analysis on taste profile only.
  `;

  const response = await llm.invoke(prompt);
  
  try {
    const tasteData = JSON.parse(response.content as string);
    return {
      taste_profile: tasteData,
      viewing_patterns: {
        completion_rate: 0,
        binge_tendency: "medium",
        seasonal_preferences: {},
        mood_based_viewing: {}
      },
      recommendations: {
        immediate_watchlist: [],
        long_term_goals: []
      },
      insights: {
        unique_traits: [],
        blind_spots: [],
        evolution_over_time: ""
      }
    };
  } catch (error) {
    console.error('Failed to parse taste profile:', error);
    return await performFullContentAnalysis(serializdData);
  }
}

// Generate recommendations based on existing data
async function generateRecommendations(serializdData: string): Promise<ContentAnalysis> {
  const prompt = `
  Based on Rahul's Serializd data, generate specific content recommendations.

  DATA: ${serializdData}

  Generate:
  1. 10 immediate recommendations he'd definitely enjoy
  2. Long-term content exploration goals
  3. Hidden gems he might have missed
  4. Content that would expand his horizons

  Consider:
  - His current preferences
  - What's trending that matches his taste
  - Underrated content in his preferred genres
  - Content that would challenge him positively

  Focus on actionable recommendations with clear reasoning.
  `;

  const response = await llm.invoke(prompt);
  
  try {
    const recData = JSON.parse(response.content as string);
    return {
      taste_profile: {
        preferred_genres: [],
        preferred_languages: [],
        preferred_decades: [],
        content_types: {},
        rating_patterns: {
          average_rating: 0,
          rating_distribution: {},
          harsh_critic: false
        }
      },
      viewing_patterns: {
        completion_rate: 0,
        binge_tendency: "medium",
        seasonal_preferences: {},
        mood_based_viewing: {}
      },
      recommendations: recData,
      insights: {
        unique_traits: [],
        blind_spots: [],
        evolution_over_time: ""
      }
    };
  } catch (error) {
    console.error('Failed to parse recommendations:', error);
    return await performFullContentAnalysis(serializdData);
  }
}

// Store content analysis in Supabase
async function storeContentAnalysis(supabase: any, userId: string, analysis: ContentAnalysis) {
  // Store the complete analysis
  await supabase
    .from('content_analysis')
    .upsert({
      user_id: userId,
      analysis_data: analysis,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  // Store individual recommendations as content entries
  for (const rec of analysis.recommendations.immediate_watchlist) {
    await supabase
      .from('content_entries')
      .insert({
        user_id: userId,
        title: rec.title,
        type: rec.type,
        genre: rec.genre,
        status: 'planned',
        metadata: {
          recommendation_reason: rec.reason,
          confidence: rec.confidence,
          source: 'serializd_analysis'
        },
        created_at: new Date().toISOString()
      });
  }

  // Store taste profile as user preferences
  await supabase
    .from('profiles')
    .update({
      settings: {
        content_preferences: {
          preferred_genres: analysis.taste_profile.preferred_genres,
          preferred_languages: analysis.taste_profile.preferred_languages,
          preferred_decades: analysis.taste_profile.preferred_decades,
          rating_patterns: analysis.taste_profile.rating_patterns
        }
      }
    })
    .eq('id', userId);
}

// GET endpoint for retrieving content analysis
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'analysis';
    
    // Get authenticated user
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { status: 401 });
    }

    switch (action) {
      case 'analysis':
        const { data: analysis } = await supabase
          .from('content_analysis')
          .select('*')
          .eq('user_id', user.id)
          .single();

        return new Response(JSON.stringify({
          success: true,
          analysis: analysis?.analysis_data || null,
          last_updated: analysis?.updated_at || null
        }), { status: 200 });

      case 'recommendations':
        const { data: recommendations } = await supabase
          .from('content_entries')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'planned')
          .not('metadata->source', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        return new Response(JSON.stringify({
          success: true,
          recommendations: recommendations || []
        }), { status: 200 });

      case 'taste_profile':
        const { data: profile } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single();

        return new Response(JSON.stringify({
          success: true,
          taste_profile: profile?.settings?.content_preferences || null
        }), { status: 200 });

      case 'stats':
        const { data: contentStats } = await supabase
          .from('content_entries')
          .select('type, status, rating, genre')
          .eq('user_id', user.id);

        const stats = analyzeContentStats(contentStats || []);

        return new Response(JSON.stringify({
          success: true,
          stats
        }), { status: 200 });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), { status: 400 });
    }

  } catch (error) {
    console.error('Content analysis GET error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch content analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Analyze content statistics
function analyzeContentStats(contentData: any[]) {
  const stats = {
    total_entries: contentData.length,
    by_type: {} as Record<string, number>,
    by_status: {} as Record<string, number>,
    rating_distribution: {} as Record<string, number>,
    top_genres: {} as Record<string, number>
  };

  contentData.forEach(item => {
    // Count by type
    stats.by_type[item.type] = (stats.by_type[item.type] || 0) + 1;
    
    // Count by status
    stats.by_status[item.status] = (stats.by_status[item.status] || 0) + 1;
    
    // Count ratings
    if (item.rating) {
      const ratingRange = `${Math.floor(item.rating)}-${Math.floor(item.rating) + 1}`;
      stats.rating_distribution[ratingRange] = (stats.rating_distribution[ratingRange] || 0) + 1;
    }
    
    // Count genres
    if (item.genre && Array.isArray(item.genre)) {
      item.genre.forEach((genre: string) => {
        stats.top_genres[genre] = (stats.top_genres[genre] || 0) + 1;
      });
    }
  });

  return stats;
}