// src/pages/api/content/poster/[tmdbid].ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params }) => {
  const { tmdbid } = params;
  
  if (!tmdbid) {
    return new Response(JSON.stringify({ error: 'TMDB ID required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Use the environment variable
    const apiKey = import.meta.env.TMDB_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'TMDB API key not configured' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Try movie first, then TV if movie fails
    let posterPath = null;
    
    // Try as movie
    try {
      const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${tmdbid}?api_key=${apiKey}`);
      if (movieResponse.ok) {
        const movieData = await movieResponse.json();
        posterPath = movieData.poster_path;
      }
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
      console.log('Not a movie, trying TV...');
    }
    
    // If no movie poster, try as TV show
    if (!posterPath) {
      try {
        const tvResponse = await fetch(`https://api.themoviedb.org/3/tv/${tmdbid}?api_key=${apiKey}`);
        if (tvResponse.ok) {
          const tvData = await tvResponse.json();
          posterPath = tvData.poster_path;
        }
      } catch (error) {
        console.log('Not a TV show either');
      }
    }

    if (posterPath) {
      const fullPosterUrl = `https://image.tmdb.org/t/p/w300${posterPath}`;
      return new Response(JSON.stringify({ 
        success: true, 
        posterUrl: fullPosterUrl,
        posterPath 
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
        }
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'No poster found' 
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('TMDB poster fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
