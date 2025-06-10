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
  };
  recorded_at: Date;
}
