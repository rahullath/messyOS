import type { ContentEntry } from '../../types/content';

export async function processSerializdData(file: File): Promise<{ success: boolean; message: string; content: ContentEntry[]; errors: string[] }> {
  const errors: string[] = [];
  const importedContent: ContentEntry[] = [];

  try {
    const fileContent = await file.text();
    let parsedData: any[] = [];

    if (file.type === 'application/json') {
      parsedData = JSON.parse(fileContent);
    } else if (file.type === 'text/csv') {
      // Basic CSV parsing - a more robust solution might use a library like 'papaparse'
      const lines = fileContent.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) {
        return { success: false, message: 'CSV file is empty', content: [], errors: [] };
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      parsedData = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      });
    } else {
      return { success: false, message: 'Unsupported file type', content: [], errors: [] };
    }

    for (const item of parsedData) {
      try {
        // Assuming Serializd rating is out of 5, convert to 0-10 scale
        let rating = parseFloat(item.rating) || 0;
        if (rating > 0 && rating <= 5) { // Assuming 0-5 scale
          rating = rating * 2; // Convert to 0-10
        } else if (rating > 5 && rating <= 100) { // Assuming percentage
          rating = rating / 10; // Convert to 0-10
        } else if (rating > 10) { // If it's already a large number, assume it's a raw value that needs scaling
          rating = Math.min(10, Math.max(0, rating / 10)); // Example: if 376, becomes 37.6, then capped at 10
          errors.push(`Rating for "${item.title}" (${item.rating}) was outside 0-10 range and scaled.`);
        }
        
        // Clean up review text
        let cleanedReviewText = item.review_text || '';
        // Remove common Serializd UI text from review_text
        cleanedReviewText = cleanedReviewText.replace(/(\d+ reviews\s*Sort by:.*Rating\s*Any\s*.*Grid view)/s, '').trim();
        cleanedReviewText = cleanedReviewText.replace(/(\n\s*)+/g, '\n').trim(); // Remove excessive newlines

        const entry: ContentEntry = {
          id: item.id || crypto.randomUUID(),
          user_id: '', // This will be filled by the API route
          type: item.content_type || (item.is_episode || item.season_episode ? 'tv_show' : 'movie'), // Map to top-level type
          title: item.title || item.original_title || 'Untitled',
          status: item.status || 'completed', // Assuming default status
          rating: rating > 0 ? rating : undefined, // Use undefined for optional if 0
          genre: item.genres ? (Array.isArray(item.genres) ? item.genres : item.genres.split(',').map((g: string) => g.trim())) : [],
          language: item.language || 'en', // Default language
          runtime_minutes: item.runtime_minutes ? parseInt(item.runtime_minutes) : undefined,
          pages: item.pages ? parseInt(item.pages) : undefined,
          release_year: item.release_year ? parseInt(item.release_year) : undefined,
          completed_at: item.watched_date ? new Date(item.watched_date) : undefined, // Convert to Date object
          started_at: undefined, // Assuming no start date from Serializd
          platform: item.platform || 'Serializd', // Default platform
          notes: cleanedReviewText || undefined, // Map to notes
          metadata: {
            tmdb_id: item.TMDB_ID ? String(item.TMDB_ID) : undefined, // Use item.TMDB_ID
            isbn: item.ISBN || undefined, // Assuming ISBN might be present
            serializd_id: item.Review_ID ? String(item.Review_ID) : item.id || undefined, // Use Review_ID as serializd_id
            imdb_rating: item.Vote_Average ? parseFloat(item.Vote_Average) : undefined, // Use item.Vote_Average for imdb_rating
            personal_tags: undefined, // Not available from Serializd export
            rewatch_count: undefined, // Not available
            source: 'serializd',
            seasons: item.Season_Episode || undefined, // Map Season_Episode to seasons
            page: undefined, // Not applicable
            imported_at: new Date().toISOString(), // When imported

            // Additional fields from Serializd export / TMDB that are useful
            original_title: item.Original_Title || undefined,
            overview: item.Overview || undefined,
            cast: item.Cast ? (Array.isArray(item.Cast) ? item.Cast : item.Cast.split(',').map((c: string) => c.trim())) : undefined,
            imdb_id: item.IMDB_ID || undefined,
            popularity: item.Popularity ? parseFloat(item.Popularity) : undefined,
            production_countries: item.Production_Countries ? (Array.isArray(item.Production_Countries) ? item.Production_Countries : item.Production_Countries.split(',').map((c: string) => c.trim())) : undefined,
            is_episode: item.is_episode === 'true' || item.is_episode === true || (item.Season_Episode && item.Season_Episode.includes('Episode')),
            is_season: item.is_season === 'true' || item.is_season === true || (item.Season_Episode && item.Season_Episode.includes('Season') && !item.Season_Episode.includes('Episode')),
            created_at: item.created_at || new Date().toISOString(), // Use item.created_at or current date
            vote_average: item.Vote_Average ? parseFloat(item.Vote_Average) : undefined,
            vote_count: item.Vote_Count ? parseInt(item.Vote_Count) : undefined,
            adult: item.Adult === 'true' || item.Adult === true,
            homepage: item.Homepage || undefined,
            created_by: item.Created_By || undefined,
            keywords: item.Keywords ? (Array.isArray(item.Keywords) ? item.Keywords : item.Keywords.split(',').map((k: string) => k.trim())) : undefined,

            // Fields duplicated for metrics table compatibility (if needed by the metrics table schema directly)
            watched_date: item.Watch_Date ? new Date(item.Watch_Date).toISOString() : undefined, // Use item.Watch_Date
            season_episode: item.Season_Episode || undefined, // Use item.Season_Episode
            review_text: cleanedReviewText || undefined, // Use cleanedReviewText
          },
          recorded_at: item.recorded_at ? new Date(item.recorded_at) : new Date(),
        };
        importedContent.push(entry);
      } catch (itemError: any) {
        errors.push(`Error processing item "${item.title || 'Unknown'}": ${itemError.message}`);
        console.error(`Error processing Serializd item:`, item, itemError);
      }
    }

    return {
      success: true,
      message: `Successfully processed ${importedContent.length} entries.`,
      content: importedContent,
      errors: errors,
    };

  } catch (parseError: any) {
    console.error('Error parsing Serializd file:', parseError);
    return {
      success: false,
      message: `Failed to parse file: ${parseError.message}`,
      content: [],
      errors: [parseError.message],
    };
  }
}
