// src/lib/content/EnrichedSerializdProcessor.ts
import type { ContentEntry } from '../../types/content';

export interface EnrichedReviewData {
  Title: string;
  Season_Episode?: string;
  Rating: string; // Format like "188/5"
  Review_Text?: string;
  Watch_Date: string;
  Review_ID?: number;
  TMDB_ID: number;
  TMDB_Title: string;
  Original_Title?: string;
  Genres: string;
  Overview: string;
  First_Air_Date?: string;
  Last_Air_Date?: string;
  Status?: string;
  Number_of_Seasons?: number;
  Number_of_Episodes?: number;
  Episode_Runtime?: number[];
  Average_Runtime?: number;
  Networks?: string;
  Production_Countries?: string;
  Languages?: string;
  Original_Language?: string;
  Popularity?: number;
  Vote_Average?: number;
  Vote_Count?: number;
  Adult?: boolean;
  Homepage?: string;
  IMDB_ID?: string;
  Created_By?: string;
  Keywords?: string;
  Cast?: string;
  Crew?: string;
}

export interface EnrichedWatchedShowData {
  Title: string;
  Status: string;
  Rating?: number | null;
  Seasons?: number | null;
  Page?: number;
  TMDB_ID: number;
  TMDB_Title: string;
  Original_Title: string;
  Genres: string;
  Overview: string;
  First_Air_Date: string;
  Last_Air_Date: string;
  Number_of_Seasons: number;
  Number_of_Episodes: number;
  Episode_Runtime: number[];
  Average_Runtime: number;
  Networks: string;
  Production_Countries: string;
  Languages: string;
  Original_Language: string;
  Popularity: number;
  Vote_Average: number;
  Vote_Count: number;
  Adult: boolean;
  Homepage: string;
  IMDB_ID: string;
  Created_By: string;
  Keywords: string;
  Cast: string;
  Crew: string;
}

export class EnrichedSerializdProcessor {
  
  /**
   * Process enriched Serializd data file
   */
  static async processFile(file: File): Promise<{
    success: boolean;
    message: string;
    content: ContentEntry[];
    errors: string[];
  }> {
    try {
      const fileContent = await file.text();
      
      // Try to parse as JSON first
      let data: any[];
      try {
        data = JSON.parse(fileContent);
      } catch (jsonError) {
        return {
          success: false,
          message: 'Invalid JSON format. Please ensure your file is valid JSON.',
          content: [],
          errors: [`JSON parsing error: ${jsonError.message}`]
        };
      }

      if (!Array.isArray(data)) {
        return {
          success: false,
          message: 'Expected JSON array format',
          content: [],
          errors: ['Data is not an array']
        };
      }

      console.log(`🎬 Processing ${data.length} enriched Serializd entries`);

      const processedEntries: ContentEntry[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i];
          const contentEntry = this.convertToContentEntry(item, i);
          
          if (contentEntry) {
            processedEntries.push(contentEntry);
          }
        } catch (error: any) {
          errors.push(`Entry ${i + 1}: ${error.message}`);
        }
      }

      return {
        success: true,
        message: `Successfully processed ${processedEntries.length} entries`,
        content: processedEntries,
        errors
      };

    } catch (error: any) {
      return {
        success: false,
        message: `File processing failed: ${error.message}`,
        content: [],
        errors: [error.message]
      };
    }
  }

  /**
   * Convert enriched item to ContentEntry
   */
  private static convertToContentEntry(item: any, index: number): ContentEntry | null {
    // Validate required fields
    if (!item.Title && !item.TMDB_Title) {
      throw new Error('Missing title');
    }

    if (!item.TMDB_ID) {
      throw new Error('Missing TMDB_ID');
    }

    // Determine content type
    const type = this.determineContentType(item);

    // Parse rating
    const rating = this.parseRating(item.Rating);

    // Parse genres
    const genres = this.parseGenres(item.Genres);

    // Parse watch date
    const watchDate = this.parseWatchDate(item.Watch_Date);

    // Generate unique ID
    const id = `${item.TMDB_ID}-${item.Review_ID || index}`;

    const contentEntry: ContentEntry = {
      id,
      user_id: '', // Will be set by the API
      type,
      title: item.TMDB_Title || item.Title,
      status: this.mapStatus(item.Status),
      rating,
      genre: genres,
      language: item.Original_Language || 'en',
      runtime_minutes: this.parseRuntime(item),
      pages: undefined, // Not applicable for movies/TV
      release_year: this.parseYear(item.First_Air_Date),
      completed_at: watchDate,
      started_at: undefined,
      platform: this.parsePlatform(item.Networks),
      notes: this.cleanReviewText(item.Review_Text),
      metadata: {
        tmdb_id: String(item.TMDB_ID),
        serializd_id: String(item.Review_ID || ''),
        source: 'serializd',
        
        // Original enriched data
        original_title: item.Original_Title,
        overview: item.Overview,
        cast: typeof item.Cast === 'string' ? item.Cast.split(', ') : [],
        imdb_id: item.IMDB_ID,
        popularity: item.Popularity,
        vote_average: item.Vote_Average,
        vote_count: item.Vote_Count,
        adult: item.Adult,
        homepage: item.Homepage,
        created_by: item.Created_By,
        keywords: typeof item.Keywords === 'string' ? item.Keywords.split(', ') : [],
        
        // TV Show specific data
        seasons: item.Season_Episode,
        season_episode: item.Season_Episode,
        is_episode: Boolean(item.Season_Episode),
        is_season: Boolean(item.Number_of_Seasons),
        
        // Additional metadata for compatibility
        watched_date: watchDate?.toISOString(),
        review_text: this.cleanReviewText(item.Review_Text),
        imported_at: new Date().toISOString()
      },
      recorded_at: new Date()
    };

    return contentEntry;
  }

  /**
   * Determine content type from enriched data
   */
  private static determineContentType(item: any): 'movie' | 'tv_show' | 'book' {
    // Check for TV show indicators
    if (item.Number_of_Seasons || 
        item.Status === 'Returning Series' || 
        item.Season_Episode ||
        item.Episode_Runtime) {
      return 'tv_show';
    }

    // Default to movie
    return 'movie';
  }

  /**
   * Parse rating from various formats
   */
  private static parseRating(rating: any): number | undefined {
    if (!rating) return undefined;

    if (typeof rating === 'number') {
      return Math.min(Math.max(rating, 0), 10); // Clamp to 0-10
    }

    if (typeof rating === 'string') {
      // Handle "188/5" format from Serializd
      if (rating.includes('/')) {
        const [numerator, denominator] = rating.split('/').map(n => parseInt(n.trim()));
        if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
          // Convert to 1-10 scale
          return Math.min(Math.max((numerator / denominator) * 2, 0), 10);
        }
      }

      // Try direct parsing
      const parsed = parseFloat(rating);
      if (!isNaN(parsed)) {
        return Math.min(Math.max(parsed, 0), 10);
      }
    }

    return undefined;
  }

  /**
   * Parse genres from string or array
   */
  private static parseGenres(genres: any): string[] {
    if (!genres) return [];

    if (Array.isArray(genres)) {
      return genres.filter(g => typeof g === 'string' && g.trim());
    }

    if (typeof genres === 'string') {
      return genres.split(',')
        .map(g => g.trim())
        .filter(g => g);
    }

    return [];
  }

  /**
   * Parse watch date
   */
  private static parseWatchDate(dateStr: any): Date | undefined {
    if (!dateStr) return undefined;

    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Map status to our format
   */
  private static mapStatus(status: any): 'completed' | 'watching' | 'planned' | 'dropped' | 'paused' {
    if (!status) return 'completed';

    const statusStr = String(status).toLowerCase();
    
    if (statusStr.includes('returning') || statusStr.includes('ongoing')) {
      return 'watching';
    }
    
    if (statusStr.includes('planned') || statusStr.includes('want')) {
      return 'planned';
    }
    
    if (statusStr.includes('dropped')) {
      return 'dropped';
    }
    
    if (statusStr.includes('paused') || statusStr.includes('hold')) {
      return 'paused';
    }

    return 'completed';
  }

  /**
   * Parse runtime from enriched data
   */
  private static parseRuntime(item: any): number | undefined {
    if (item.Average_Runtime && typeof item.Average_Runtime === 'number') {
      return item.Average_Runtime;
    }

    if (item.Episode_Runtime && Array.isArray(item.Episode_Runtime) && item.Episode_Runtime.length > 0) {
      const avg = item.Episode_Runtime.reduce((sum: number, runtime: number) => sum + runtime, 0) / item.Episode_Runtime.length;
      return Math.round(avg);
    }

    return undefined;
  }

  /**
   * Parse platform/network
   */
  private static parsePlatform(networks: any): string | undefined {
    if (!networks) return undefined;

    if (typeof networks === 'string') {
      return networks.split(',')[0].trim(); // Take first network
    }

    return undefined;
  }

  /**
   * Parse year from date string
   */
  private static parseYear(dateStr: any): number | undefined {
    if (!dateStr) return undefined;

    try {
      const year = new Date(dateStr).getFullYear();
      return isNaN(year) ? undefined : year;
    } catch {
      return undefined;
    }
  }

  /**
   * Clean up review text (remove UI elements from scraping)
   */
  private static cleanReviewText(reviewText: any): string | undefined {
    if (!reviewText || typeof reviewText !== 'string') return undefined;

    // Remove common UI elements that appear in scraped data
    const cleaned = reviewText
      .replace(/\d+\s*reviews?\s*/gi, '') // Remove "394 reviews"
      .replace(/Sort by:[\s\S]*?Grid view/gi, '') // Remove sort options
      .replace(/⭐+/g, '') // Remove star ratings
      .replace(/½/g, '') // Remove half stars
      .replace(/When Watched.*?first/gi, '') // Remove sort options
      .replace(/Rating\s*Any/gi, '') // Remove rating filters
      .replace(/Include\.\.\./gi, '') // Remove include options
      .replace(/Shows only|Seasons only|Episodes only/gi, '') // Remove filters
      .trim();

    return cleaned.length > 10 ? cleaned : undefined; // Only keep if meaningful content
  }
}