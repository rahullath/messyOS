// src/lib/content/poster-matcher.ts
export class ContentPosterMatcher {
  private tmdbApiKey: string;

  constructor() {
    this.tmdbApiKey = import.meta.env.TMDB_API_KEY || process.env.TMDB_API_KEY || '';
  }

  async getContentPoster(title: string, year?: number, type: 'movie' | 'tv' = 'tv'): Promise<string> {
    // Clean title for better matching
    const cleanTitle = this.cleanTitle(title);
    
    try {
      // Try TMDB search first
      const tmdbPoster = await this.searchTMDB(cleanTitle, year, type);
      if (tmdbPoster) return tmdbPoster;

      // Fallback to OMDB
      const omdbPoster = await this.searchOMDB(cleanTitle, year);
      if (omdbPoster) return omdbPoster;

      // Generate placeholder
      return this.generatePlaceholder(title);
    } catch (error) {
      console.error('Poster fetch error:', error);
      return this.generatePlaceholder(title);
    }
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\([^)]*\)/g, '') // Remove parentheses
      .replace(/\s+/g, ' ')      // Normalize spaces
      .trim()
      .toLowerCase();
  }

  private async searchTMDB(title: string, year?: number, type: 'movie' | 'tv' = 'tv'): Promise<string | null> {
    if (!this.tmdbApiKey) return null;

    const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const posterPath = result.poster_path;
      
      if (posterPath) {
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
      }
    }

    return null;
  }

  private async searchOMDB(title: string, year?: number): Promise<string | null> {
    const omdbKey = import.meta.env.OMDB_API_KEY || process.env.OMDB_API_KEY;
    if (!omdbKey) return null;

    const searchUrl = `http://www.omdbapi.com/?apikey=${omdbKey}&t=${encodeURIComponent(title)}${year ? `&y=${year}` : ''}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.Poster && data.Poster !== 'N/A') {
      return data.Poster;
    }

    return null;
  }

  private generatePlaceholder(title: string): string {
    // Generate a deterministic color based on title
    const hash = this.hashCode(title);
    const hue = Math.abs(hash) % 360;
    
    const svg = `
      <svg width="500" height="750" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsl(${hue}, 70%, 60%);stop-opacity:1" />
            <stop offset="100%" style="stop-color:hsl(${hue + 60}, 70%, 40%);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="40%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24" font-weight="bold">
          <tspan x="50%" dy="0">${this.truncateTitle(title, 20)}</tspan>
        </text>
        <text x="50%" y="60%" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">
          No Poster Available
        </text>
      </svg>
    `.trim();

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private truncateTitle(title: string, maxLength: number): string {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  }
}

// src/lib/content/import-deduplicator.ts
export class ContentImportDeduplicator {
  
  async importSerializdData(userId: string, data: any[], supabase: any): Promise<{imported: number, skipped: number, errors: string[]}> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    const posterMatcher = new ContentPosterMatcher();

    for (const item of data) {
      try {
        // Check for duplicates
        const existing = await this.findExistingContent(userId, item, supabase);
        
        if (existing) {
          skipped++;
          continue;
        }

        // Get poster with fallback
        const posterUrl = await posterMatcher.getContentPoster(
          item.title || item.Title,
          item.year || item.Year,
          item.type || 'tv'
        );

        // Prepare content entry
        const contentEntry = {
          user_id: userId,
          title: item.title || item.Title,
          type: item.type || 'tv_show',
          rating: this.parseRating(item.rating || item.Rating),
          status: this.mapStatus(item.status || item.Status || 'completed'),
          genre: this.parseGenres(item.genres || item.Genre),
          completed_at: this.parseDate(item.watch_date || item.Date_Watched),
          source: 'serializd',
          metadata: {
            tmdb_id: item.tmdb_id || item.TMDB_ID,
            poster_url: posterUrl,
            overview: item.overview || item.Plot,
            runtime: item.runtime || item.Runtime,
            cast: item.cast || item.Actors,
            director: item.director || item.Director,
            review_text: item.review_text || item.Review,
            seasons: item.seasons || item.Seasons,
            episodes: item.episodes || item.Episodes,
            original_title: item.original_title || item.Original_Title
          }
        };

        // Insert into database
        const { error } = await supabase
          .from('content_entries')
          .insert([contentEntry]);

        if (error) {
          errors.push(`Error importing "${contentEntry.title}": ${error.message}`);
        } else {
          imported++;
        }

      } catch (error) {
        errors.push(`Error processing item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, skipped, errors };
  }

  private async findExistingContent(userId: string, item: any, supabase: any): Promise<boolean> {
    const title = item.title || item.Title;
    if (!title) return false;

    // Check for exact title match
    const { data: exactMatch } = await supabase
      .from('content_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('title', title)
      .single();

    if (exactMatch) return true;

    // Check for TMDB ID match
    const tmdbId = item.tmdb_id || item.TMDB_ID;
    if (tmdbId) {
      const { data: tmdbMatch } = await supabase
        .from('content_entries')
        .select('id')
        .eq('user_id', userId)
        .eq('metadata->tmdb_id', tmdbId)
        .single();

      if (tmdbMatch) return true;
    }

    // Check for fuzzy title match (handles slight variations)
    const normalizedTitle = this.normalizeTitle(title);
    const { data: similarTitles } = await supabase
      .from('content_entries')
      .select('title')
      .eq('user_id', userId);

    if (similarTitles) {
      for (const existing of similarTitles) {
        if (this.calculateSimilarity(normalizedTitle, this.normalizeTitle(existing.title)) > 0.9) {
          return true;
        }
      }
    }

    return false;
  }

  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private parseRating(rating: any): number | null {
    if (!rating || rating === 'N/A') return null;
    const num = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(num) ? null : Math.max(1, Math.min(10, Math.round(num)));
  }

  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'watched': 'completed',
      'completed': 'completed',
      'watching': 'watching',
      'currently watching': 'watching',
      'plan to watch': 'planned',
      'planned': 'planned',
      'on hold': 'paused',
      'paused': 'paused',
      'dropped': 'dropped'
    };
    
    return statusMap[status.toLowerCase()] || 'completed';
  }

  private parseGenres(genres: any): string[] {
    if (!genres) return [];
    if (Array.isArray(genres)) return genres;
    if (typeof genres === 'string') {
      return genres.split(',').map(g => g.trim()).filter(g => g.length > 0);
    }
    return [];
  }

  private parseDate(dateStr: any): string | null {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }
}

// API endpoint for improved content import
// src/pages/api/content/import/serializd.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import { ContentImportDeduplicator } from '../../../../lib/content/import-deduplicator';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { data, format = 'json' } = body;

    if (!data || !Array.isArray(data)) {
      return new Response(JSON.stringify({ error: 'Invalid data format' }), { status: 400 });
    }

    const deduplicator = new ContentImportDeduplicator();
    const result = await deduplicator.importSerializdData(user.id, data, supabase);

    return new Response(JSON.stringify({
      success: true,
      message: `Import completed: ${result.imported} new items, ${result.skipped} duplicates skipped`,
      stats: result,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Import failed' 
    }), { status: 500 });
  }
};