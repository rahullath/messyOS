export interface ContentEntry {
  id: string;
  user_id: string;
  type: 'movie' | 'tv_show' | 'book' | 'article' | 'podcast' | 'game';
  title: string;
  status: 'completed' | 'watching' | 'reading' | 'planned' | 'dropped' | 'paused';
  rating?: number; // 1-10 scale
  genre: string[];
  language: string;
  runtime_minutes?: number;
  pages?: number;
  release_year?: number;
  completed_at?: Date;
  started_at?: Date;
  platform?: string; // Netflix, Amazon Prime, Physical, etc.
  notes?: string;
  metadata: {
    tmdb_id?: string; // For movies/TV
    isbn?: string; // For books
    serializd_id?: string; // Your Serializd integration
    imdb_rating?: number;
    personal_tags?: string[];
    rewatch_count?: number;
    source?: 'serializd' | 'manual' | 'import';
    seasons?: string; // For TV shows (e.g., "Season 1, Episode 5")
    page?: number; // For pagination/tracking
    imported_at?: string; // When imported

    // Additional fields from Serializd export / TMDB that are useful
    original_title?: string;
    overview?: string;
    cast?: string[];
    imdb_id?: string; // IMDB ID from TMDB data
    popularity?: number;
    production_countries?: string[];
    is_episode?: boolean; // True if this entry represents a specific episode
    is_season?: boolean; // True if this entry represents a specific season
    created_at?: string; // Original creation timestamp from source
    vote_average?: number; // TMDB vote average
    vote_count?: number; // TMDB vote count
    adult?: boolean;
    homepage?: string;
    created_by?: string; // For TV shows, the creator
    keywords?: string[]; // Keywords/tags from TMDB

    // Fields that are top-level in ContentEntry but might be duplicated in metadata for metrics table compatibility
    watched_date?: string; // ISO string of completed_at, for metrics table compatibility
    season_episode?: string; // Duplicate of seasons, for metrics table compatibility
    review_text?: string; // Duplicate of notes, for metrics table compatibility
  };
  recorded_at: Date;
}
