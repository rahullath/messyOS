// src/pages/api/content/import/serializd.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../lib/auth/simple-multi-user';
import { EnrichedSerializdProcessor } from '../../../../lib/content/EnrichedSerializdProcessor';
import type { ContentEntry } from '../../../../types/content';
import type { Tables } from '../../../../types/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    

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

    console.log(`📁 Processing enriched Serializd file: ${file.name} (${file.size} bytes)`);

    // Process the enriched data using the new processor
    const { success: processSuccess, message, content: processedEntries, errors: processingErrors } = 
      await EnrichedSerializdProcessor.processFile(file);

    if (!processSuccess) {
      return new Response(JSON.stringify({
        success: false,
        error: message,
        details: processingErrors
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (processedEntries.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid entries found in file after processing',
        details: processingErrors
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Successfully processed ${processedEntries.length} entries`);

    // Check for existing entries to avoid duplicates
    const existingEntries = new Set<string>();
    const { data: existingMetrics } = await supabase
      .from('metrics')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('type', 'content');

    if (existingMetrics) {
      existingMetrics.forEach((metric: Tables<'metrics'>) => {
        if ((metric.metadata as any)?.tmdb_id) {
          existingEntries.add((metric.metadata as any).tmdb_id);
        }
      });
    }

    // Filter out duplicates based on TMDB_ID
    const newEntries = processedEntries.filter(entry => {
      const tmdbId = entry.metadata.tmdb_id;
      return tmdbId && !existingEntries.has(tmdbId);
    });

    console.log(`📊 Found ${processedEntries.length} total entries, ${newEntries.length} new entries (${processedEntries.length - newEntries.length} duplicates)`);

    // Convert ContentEntry objects to metrics table schema
    const metricsEntries = newEntries.map(entry => {
      const metadata = entry.metadata as any;
      return {
      user_id: user.id,
      type: 'content',
      value: entry.rating || 0,
      unit: 'rating',
      recorded_at: entry.recorded_at.toISOString(),
      metadata: {
        // Core content fields
        id: entry.id,
        content_type: entry.type,
        title: entry.title,
        status: entry.status,
        rating: entry.rating,
        genres: entry.genre, // Array of genres
        language: entry.language,
        runtime_minutes: entry.runtime_minutes,
        pages: entry.pages,
        release_year: entry.release_year,
        completed_at: entry.completed_at?.toISOString(),
        started_at: entry.started_at?.toISOString(),
        platform: entry.platform,
        notes: entry.notes,

        // Enhanced metadata from enriched Serializd
        tmdb_id: metadata.tmdb_id,
        tmdb_title: entry.title, // Store TMDB title
        original_title: metadata.original_title,
        overview: metadata.overview,
        cast: Array.isArray(metadata.cast) ? metadata.cast.join(', ') : metadata.cast,
        crew: metadata.crew,
        imdb_id: metadata.imdb_id,
        popularity: metadata.popularity,
        vote_average: metadata.vote_average,
        vote_count: metadata.vote_count,
        adult: metadata.adult,
        homepage: metadata.homepage,
        created_by: metadata.created_by,
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords,

        // TV Show specific fields
        season_episode: metadata.season_episode,
        seasons: metadata.seasons,
        is_episode: metadata.is_episode,
        is_season: metadata.is_season,

        // Import tracking
        serializd_id: metadata.serializd_id,
        source: metadata.source,
        watched_date: metadata.watched_date,
        review_text: metadata.review_text,
        imported_at: metadata.imported_at
      }
    }});

    // Batch insert with error handling
    let imported = 0;
    const errors: string[] = [...processingErrors];
    const batchSize = 100;

    for (let i = 0; i < metricsEntries.length; i += batchSize) {
      const batch = metricsEntries.slice(i, i + batchSize);
      
      try {
        const { error: insertError } = await supabase
          .from('metrics')
          .insert(batch);

        if (insertError) {
          console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} insert error:`, insertError);
          errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${insertError.message}`);
          continue;
        }
        
        imported += batch.length;
        console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}: ${batch.length} entries`);
      } catch (batchError: any) {
        console.error('Batch processing error:', batchError);
        errors.push(`Batch ${Math.floor(i/batchSize) + 1}: Processing failed - ${batchError.message}`);
      }
    }

    // Generate comprehensive import statistics
    const stats = generateImportStats(processedEntries, newEntries, imported, errors);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully imported ${imported} new content entries from enriched Serializd data!`,
      stats,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Enriched Serializd import error:', error);
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

function generateImportStats(processedEntries: ContentEntry[], newEntries: ContentEntry[], imported: number, errors: string[]) {
  const importedEntries = processedEntries.filter(entry => 
    newEntries.some(ne => ne.id === entry.id)
  );

  // Content type breakdown
  const movies = importedEntries.filter(e => e.type === 'movie').length;
  const tvShows = importedEntries.filter(e => e.type === 'tv_show').length;
  const books = importedEntries.filter(e => e.type === 'book').length;

  // Rating analysis
  const ratedEntries = importedEntries.filter(e => e.rating && e.rating > 0);
  const avgRating = ratedEntries.length > 0 
    ? ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length 
    : 0;

  // Genre analysis
  const genreCounts: { [key: string]: number } = {};
  importedEntries.forEach(entry => {
    entry.genre.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  const topGenres = Object.entries(genreCounts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Date range analysis
  const dates = importedEntries
    .map(e => e.completed_at)
    .filter(d => d)
    .map(d => d!.toISOString())
    .sort();

  let dateRange = 'No dates available';
  if (dates.length > 0) {
    const firstDate = new Date(dates[0]).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
    const lastDate = new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
    dateRange = firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`;
  }

  // Platform analysis
  const platformCounts: { [key: string]: number } = {};
  importedEntries.forEach(entry => {
    if (entry.platform) {
      platformCounts[entry.platform] = (platformCounts[entry.platform] || 0) + 1;
    }
  });

  const topPlatforms = Object.entries(platformCounts)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    total_processed: processedEntries.length,
    imported,
    duplicates: processedEntries.length - newEntries.length,
    errors: errors.length,
    
    // Content breakdown
    movies,
    tv_shows: tvShows,
    books,
    
    // Quality metrics
    rated_entries: ratedEntries.length,
    avg_rating: Math.round(avgRating * 10) / 10,
    
    // Content insights
    top_genres: topGenres,
    date_range: dateRange,
    top_platforms: topPlatforms,
    
    // Technical details
    import_timestamp: new Date().toISOString(),
    file_format: 'enriched_serializd_json'
  };
}
