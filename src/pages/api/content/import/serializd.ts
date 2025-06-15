// src/pages/api/content/import/serializd.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import { processSerializdData } from '../../../../lib/content/SerializdImporter'; // Import the new importer
import type { ContentEntry } from '../../../../types/content'; // Import ContentEntry type

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('serializd_data') as File;
    
    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📁 Processing ${file.name} (${file.size} bytes) with SerializdImporter`);

    // Use the new SerializdImporter to process the file
    const { success: importSuccess, message, content: processedEntries, errors: importErrors } = await processSerializdData(file);

    if (!importSuccess) {
      return new Response(JSON.stringify({
        success: false,
        error: message,
        details: importErrors
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (processedEntries.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid entries found in file after processing'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Map ContentEntry objects to the metrics table schema
    const metricsEntries = processedEntries.map(entry => ({
      user_id: user.id,
      type: 'content', // General type for the metrics table
      value: entry.rating || 0, // Use the processed rating
      unit: 'rating',
      recorded_at: entry.recorded_at.toISOString(),
      metadata: {
        // All top-level fields from ContentEntry
        id: entry.id,
        content_type: entry.type, // Map ContentEntry.type to metadata.content_type
        title: entry.title,
        status: entry.status,
        rating: entry.rating,
        genres: entry.genre, // Map ContentEntry.genre to metadata.genres
        language: entry.language,
        runtime_minutes: entry.runtime_minutes,
        pages: entry.pages,
        release_year: entry.release_year,
        completed_at: entry.completed_at?.toISOString(),
        started_at: entry.started_at?.toISOString(),
        platform: entry.platform,
        notes: entry.notes, // Map ContentEntry.notes to metadata.review_text

        // All fields from ContentEntry.metadata
        tmdb_id: entry.metadata.tmdb_id,
        isbn: entry.metadata.isbn,
        serializd_id: entry.metadata.serializd_id,
        imdb_rating: entry.metadata.imdb_rating,
        personal_tags: entry.metadata.personal_tags,
        rewatch_count: entry.metadata.rewatch_count,
        source: entry.metadata.source,
        seasons: entry.metadata.seasons,
        page: entry.metadata.page,
        imported_at: entry.metadata.imported_at,
        original_title: entry.metadata.original_title,
        overview: entry.metadata.overview,
        cast: entry.metadata.cast,
        imdb_id: entry.metadata.imdb_id,
        popularity: entry.metadata.popularity,
        production_countries: entry.metadata.production_countries,
        is_episode: entry.metadata.is_episode,
        is_season: entry.metadata.is_season,
        created_at: entry.metadata.created_at,
        vote_average: entry.metadata.vote_average,
        vote_count: entry.metadata.vote_count,
        adult: entry.metadata.adult,
        homepage: entry.metadata.homepage,
        created_by: entry.metadata.created_by,
        keywords: entry.metadata.keywords,
        watched_date: entry.metadata.watched_date, // Ensure this is mapped from ContentEntry.metadata
        season_episode: entry.metadata.season_episode, // Ensure this is mapped from ContentEntry.metadata
        review_text: entry.metadata.review_text, // Ensure this is mapped from ContentEntry.metadata
      }
    }));

    console.log(`🔄 Converted ${metricsEntries.length} entries to Supabase metrics format`);

    // Check for existing entries to prevent duplicates
    const existingTitles = new Set();
    const { data: existingContent } = await supabase
      .from('metrics')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('type', 'content');

    if (existingContent) {
      existingContent.forEach(item => {
        if (item.metadata?.title) {
          existingTitles.add(item.metadata.title.toLowerCase());
        }
      });
    }

    console.log(`📋 Found ${existingTitles.size} existing entries in database`);

    // Filter out duplicates (by title + season/episode if applicable)
    const newEntries = metricsEntries.filter(entry => {
      const titleKey = entry.metadata.title.toLowerCase();
      const seasonEpisodeKey = entry.metadata.season_episode ? 
        `${titleKey}-${entry.metadata.season_episode.toLowerCase()}` : titleKey;
      
      return !existingTitles.has(titleKey) && !existingTitles.has(seasonEpisodeKey);
    });

    console.log(`✨ ${newEntries.length} new entries to import`);

    if (newEntries.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'All entries already exist in your library',
        stats: {
          total: processedEntries.length,
          duplicates: processedEntries.length,
          imported: 0
        }
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert in batches to avoid potential timeouts
    const batchSize = 50;
    let imported = 0;
    let errors: string[] = [];
    
    for (let i = 0; i < newEntries.length; i += batchSize) {
      const batch = newEntries.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('metrics')
          .insert(batch);
        
        if (error) {
          console.error('Batch insert error:', error);
          errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
          continue;
        }
        
        imported += batch.length;
        console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${batch.length} entries`);
      } catch (batchError) {
        console.error('Batch processing error:', batchError);
        errors.push(`Batch ${Math.floor(i/batchSize) + 1}: Processing failed`);
      } // Corrected: Added this closing brace for the catch block
    } // This now correctly closes the for loop

    // Generate stats and insights based on the *newly imported* entries
    const importedContentEntries = processedEntries.filter(entry => 
      newEntries.some(ne => ne.metadata.id === entry.id) // Filter to only include actually imported ones
    );

    const stats = {
      total: processedEntries.length, // Total entries in the uploaded file
      imported,
      duplicates: processedEntries.length - newEntries.length,
      errors: importErrors.length + errors.length, // Combine errors from processing and insertion
      
      // Content type breakdown for imported entries
      movies: importedContentEntries.filter(e => e.type === 'movie').length,
      tv_shows: importedContentEntries.filter(e => e.type === 'tv_show').length,
      books: importedContentEntries.filter(e => e.type === 'book').length, // Added books
      
      // Rating stats for imported entries
      rated_entries: importedContentEntries.filter(e => e.rating && e.rating > 0).length,
      avg_rating: importedContentEntries
        .filter(e => e.rating && e.rating > 0)
        .reduce((sum, e) => sum + (e.rating || 0), 0) / 
        Math.max(1, importedContentEntries.filter(e => e.rating && e.rating > 0).length),
      
      // Top genres for imported entries
      top_genres: getTopGenresFromContentEntries(importedContentEntries),
      
      // Date range for imported entries
      date_range: getDateRangeFromContentEntries(importedContentEntries)
    };

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully imported ${imported} new content entries!`,
      stats,
      errors: (importErrors.length > 0 || errors.length > 0) ? [...importErrors, ...errors] : undefined
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Import error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Import failed',
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper functions adapted for ContentEntry type
function getTopGenresFromContentEntries(entries: ContentEntry[]): { genre: string; count: number }[] {
  const genreCounts: { [key: string]: number } = {};
  
  entries.forEach(entry => {
    if (entry.genre) { // Use top-level genre
      entry.genre.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    }
  });
  
  return Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getDateRangeFromContentEntries(entries: ContentEntry[]): string {
  const dates = entries
    .map(e => e.completed_at) // Use completed_at
    .filter(d => d)
    .map(d => d!.toISOString()) // Convert Date objects to ISO strings for sorting
    .sort();
  
  if (dates.length === 0) return 'No dates available';
  
  const firstDate = new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const lastDate = new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`;
}
