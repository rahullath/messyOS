import type { ContentEntry } from '../../types/content';
import type { SupabaseClient } from '@supabase/supabase-js';

// HELPER FUNCTIONS FOR CONTENT API ENDPOINTS

export function calculateContentStats(content: ContentEntry[]) {
  const thisYear = new Date().getFullYear();
  const thisYearContent = content.filter(c => 
    c.completed_at && new Date(c.completed_at).getFullYear() === thisYear
  );

  const movies = content.filter(c => c.type === 'movie');
  const shows = content.filter(c => c.type === 'tv_show');
  const books = content.filter(c => c.type === 'book');

  const thisYearMovies = thisYearContent.filter(c => c.type === 'movie');
  const thisYearShows = thisYearContent.filter(c => c.type === 'tv_show');
  const thisYearBooks = thisYearContent.filter(c => c.type === 'book');

  // Calculate average rating
  const ratedContent = content.filter(c => c.rating);
  const averageRating = ratedContent.length > 0 
    ? ratedContent.reduce((sum, c) => sum + c.rating!, 0) / ratedContent.length 
    : 0;

  // Calculate total watch time
  const totalWatchTime = content
    .filter(c => c.runtime_minutes)
    .reduce((total, c) => total + c.runtime_minutes!, 0);

  // Genre analysis
  const genreCount = new Map<string, number>();
  content.forEach(item => {
    if (item.genre && Array.isArray(item.genre)) {
      item.genre.forEach(genre => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
      });
    }
  });

  const topGenres = Array.from(genreCount.entries())
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: (count / content.length) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalMovies: movies.length,
    totalShows: shows.length,
    totalBooks: books.length,
    thisYearMovies: thisYearMovies.length,
    thisYearShows: thisYearShows.length,
    thisYearBooks: thisYearBooks.length,
    averageRating,
    totalWatchTime,
    topGenres
  };
}

export async function generateRecommendations(content: ContentEntry[]) {
  // Analyze user preferences
  const genreCount = new Map<string, number>();
  const languageCount = new Map<string, number>();
  
  content.forEach(item => {
    if (item.genre && Array.isArray(item.genre)) {
      item.genre.forEach(genre => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
      });
    }
    
    if (item.language) {
      languageCount.set(item.language, (languageCount.get(item.language) || 0) + 1);
    }
  });

  const topGenres = Array.from(genreCount.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([genre]) => genre);

  const watchedTitles = new Set(content.map(c => c.title.toLowerCase()));

  // Generate movie recommendations
  const movieRecommendations = await getMovieRecommendations(topGenres, watchedTitles);
  
  // Generate book recommendations
  const bookRecommendations = await getBookRecommendations(topGenres, watchedTitles);

  return {
    movies: movieRecommendations,
    books: bookRecommendations,
    diversityRecommendations: generateDiversityRecommendations(content),
    languageRecommendations: generateLanguageRecommendations(content)
  };
}

async function getMovieRecommendations(topGenres: string[], watchedTitles: Set<string>) {
  // This would integrate with TMDB API in production
  // For now, return curated recommendations based on genres
  
  const recommendationDatabase: { [key: string]: { title: string; year: number; language: string; genre: string[]; reason: string; }[] } = {
    'Drama': [
      { title: 'The Father', year: 2020, language: 'English', genre: ['Drama'], reason: 'Critically acclaimed drama' },
      { title: 'Parasite', year: 2019, language: 'Korean', genre: ['Drama', 'Thriller'], reason: 'Oscar-winning masterpiece' },
      { title: 'Nomadland', year: 2020, language: 'English', genre: ['Drama'], reason: 'Contemplative character study' }
    ],
    'Action': [
      { title: 'Mad Max: Fury Road', year: 2015, language: 'English', genre: ['Action'], reason: 'Visual spectacle' },
      { title: 'John Wick', year: 2014, language: 'English', genre: ['Action'], reason: 'Stylized action choreography' }
    ],
    'Comedy': [
      { title: 'The Grand Budapest Hotel', year: 2014, language: 'English', genre: ['Comedy'], reason: 'Wes Anderson\'s whimsical style' },
      { title: 'Hunt for the Wilderpeople', year: 2016, language: 'English', genre: ['Comedy'], reason: 'Heartwarming adventure' }
    ],
    'Sci-Fi': [
      { title: 'Arrival', year: 2016, language: 'English', genre: ['Sci-Fi'], reason: 'Thoughtful sci-fi concept' },
      { title: 'Ex Machina', year: 2014, language: 'English', genre: ['Sci-Fi'], reason: 'AI thriller' }
    ]
  };

  const recommendations = [];
  
  for (const genre of topGenres) {
    if (recommendationDatabase[genre]) {
      recommendations.push(...recommendationDatabase[genre]);
    }
  }

  // Add some diverse recommendations
  recommendations.push(
    { title: 'Spirited Away', year: 2001, language: 'Japanese', genre: ['Animation'], reason: 'Studio Ghibli masterpiece' },
    { title: 'Amélie', year: 2001, language: 'French', genre: ['Comedy', 'Romance'], reason: 'Charming French cinema' },
    { title: 'City of God', year: 2002, language: 'Portuguese', genre: ['Drama'], reason: 'Brazilian cinema classic' }
  );

  return recommendations
    .filter(movie => !watchedTitles.has(movie.title.toLowerCase()))
    .slice(0, 12);
}

async function getBookRecommendations(topGenres: string[], watchedTitles: Set<string>) {
  const bookRecommendations = [
    { title: 'Atomic Habits', author: 'James Clear', year: 2018, genre: ['Self-Help'], reason: 'Popular productivity book' },
    { title: 'The Seven Husbands of Evelyn Hugo', author: 'Taylor Jenkins Reid', year: 2017, genre: ['Fiction'], reason: 'Character-driven narrative' },
    { title: 'Educated', author: 'Tara Westover', year: 2018, genre: ['Memoir'], reason: 'Powerful memoir' },
    { title: 'The Midnight Library', author: 'Matt Haig', year: 2020, genre: ['Fiction'], reason: 'Philosophical fiction' },
    { title: 'Sapiens', author: 'Yuval Noah Harari', year: 2014, genre: ['Non-Fiction'], reason: 'Thought-provoking history' },
    { title: 'The Silent Patient', author: 'Alex Michaelides', year: 2019, genre: ['Thriller'], reason: 'Psychological thriller' }
  ];

  return bookRecommendations
    .filter(book => !watchedTitles.has(book.title.toLowerCase()))
    .slice(0, 8);
}

function generateDiversityRecommendations(content: ContentEntry[]) {
  const watchedLanguages = new Set(content.map(c => c.language));
  const unexploredLanguages = ['Japanese', 'French', 'Spanish', 'Korean', 'German', 'Italian', 'Russian', 'Portuguese']
    .filter(lang => !watchedLanguages.has(lang));

  return {
    languages: unexploredLanguages,
    suggestion: 'Explore world cinema to broaden your cultural perspective'
  };
}

function generateLanguageRecommendations(content: ContentEntry[]) {
  const languageMovies: { [key: string]: string[] } = {
    'Japanese': ['Seven Samurai', 'Your Name', 'Spirited Away'],
    'French': ['Amélie', 'The Intouchables', 'Blue Is the Warmest Color'],
    'Korean': ['Parasite', 'Oldboy', 'Burning'],
    'Spanish': ['Pan\'s Labyrinth', 'The Secret in Their Eyes', 'Roma']
  };

  return languageMovies;
}

export async function importSerializdData(fileContent: string, userId: string, supabase: SupabaseClient) {
  try {
    let data;
    
    // Try to parse as JSON first
    try {
      data = JSON.parse(fileContent);
    } catch {
      // If JSON fails, try CSV parsing
      data = parseSerializdCSV(fileContent);
    }

    if (!Array.isArray(data)) {
      throw new Error('Invalid file format. Expected JSON array or CSV.');
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const item of data) {
      try {
        const contentEntry: ContentEntry = {
          id: crypto.randomUUID(),
          user_id: userId,
          type: item.type || 'movie', // Default to movie if not specified
          title: item.title || item.name || 'Unknown Title',
          status: item.status || 'completed',
          rating: parseFloat(item.rating) || undefined,
          genre: item.genres ? item.genres.split(',').map((g: string) => g.trim()).filter(Boolean) : [],
          language: item.language || 'English',
          runtime_minutes: parseInt(item.runtime) || undefined,
          pages: parseInt(item.pages) || undefined,
          release_year: parseInt(item.year) || undefined,
          completed_at: item.watched_date ? new Date(item.watched_date) : undefined,
          started_at: item.started_date ? new Date(item.started_date) : undefined,
          platform: item.platform,
          notes: item.review || item.notes,
          metadata: {
            serializd_id: item.id,
            tmdb_id: item.tmdb_id,
            imdb_rating: parseFloat(item.imdb_rating),
            personal_tags: item.tags ? item.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
            rewatch_count: parseInt(item.rewatch_count) || 0,
            source: 'serializd'
          },
          recorded_at: new Date()
        };

        // Check for duplicates before inserting
        const { data: existingContent, error: fetchError } = await supabase
          .from('metrics') // Assuming content is stored in 'metrics' table
          .select('id')
          .eq('user_id', userId)
          .eq('metadata->>title', contentEntry.title)
          .eq('metadata->>content_type', contentEntry.type)
          .limit(1);

        if (fetchError) throw fetchError;

        if (existingContent && existingContent.length > 0) {
          skipped++;
          continue;
        }

        // Insert into metrics table
        const { error: insertError } = await supabase.from('metrics').insert([
          {
            user_id: contentEntry.user_id,
            type: 'content', // Use 'content' type for all content entries
            value: contentEntry.rating || 0, // Store rating as value
            unit: 'rating',
            metadata: {
              title: contentEntry.title,
              content_type: contentEntry.type,
              status: contentEntry.status,
              rating: contentEntry.rating,
              genre: contentEntry.genre,
              language: contentEntry.language,
              completed_at: contentEntry.completed_at?.toISOString(),
              platform: contentEntry.platform,
              notes: contentEntry.notes,
              runtime_minutes: contentEntry.runtime_minutes,
              pages: contentEntry.pages,
              release_year: contentEntry.release_year,
              source: contentEntry.metadata.source,
              serializd_id: contentEntry.metadata.serializd_id,
              tmdb_id: contentEntry.metadata.tmdb_id,
              imdb_rating: contentEntry.metadata.imdb_rating,
              personal_tags: contentEntry.metadata.personal_tags,
              rewatch_count: contentEntry.metadata.rewatch_count,
            },
            recorded_at: contentEntry.recorded_at.toISOString(),
          }
        ]);

        if (insertError) throw insertError;
        imported++;

      } catch (itemError: any) {
        errors.push(`Error importing "${item.title || item.name || 'Unknown'}": ${itemError.message}`);
      }
    }

    return { success: errors.length === 0, imported, skipped, errors };

  } catch (mainError: any) {
    console.error('Serializd import failed:', mainError);
    return { success: false, imported: 0, skipped: 0, errors: [mainError.message] };
  }
}

function parseSerializdCSV(csvData: string): any[] {
  const lines = csvData.split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const entries: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length !== headers.length) continue;

    const entry: { [key: string]: string } = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      entry[header] = values[j]?.trim() || '';
    }
    entries.push(entry);
  }
  return entries;
}
