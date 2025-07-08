import { createServerClient } from '../../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../../renderers.mjs';

class EnrichedSerializdProcessor {
  /**
   * Process enriched Serializd data file
   */
  static async processFile(file) {
    try {
      const fileContent = await file.text();
      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (jsonError) {
        return {
          success: false,
          message: "Invalid JSON format. Please ensure your file is valid JSON.",
          content: [],
          errors: [`JSON parsing error: ${jsonError.message}`]
        };
      }
      if (!Array.isArray(data)) {
        return {
          success: false,
          message: "Expected JSON array format",
          content: [],
          errors: ["Data is not an array"]
        };
      }
      console.log(`🎬 Processing ${data.length} enriched Serializd entries`);
      const processedEntries = [];
      const errors = [];
      for (let i = 0; i < data.length; i++) {
        try {
          const item = data[i];
          const contentEntry = this.convertToContentEntry(item, i);
          if (contentEntry) {
            processedEntries.push(contentEntry);
          }
        } catch (error) {
          errors.push(`Entry ${i + 1}: ${error.message}`);
        }
      }
      return {
        success: true,
        message: `Successfully processed ${processedEntries.length} entries`,
        content: processedEntries,
        errors
      };
    } catch (error) {
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
  static convertToContentEntry(item, index) {
    if (!item.Title && !item.TMDB_Title) {
      throw new Error("Missing title");
    }
    if (!item.TMDB_ID) {
      throw new Error("Missing TMDB_ID");
    }
    const type = this.determineContentType(item);
    const rating = this.parseRating(item.Rating);
    const genres = this.parseGenres(item.Genres);
    const watchDate = this.parseWatchDate(item.Watch_Date);
    const id = `${item.TMDB_ID}-${item.Review_ID || index}`;
    const contentEntry = {
      id,
      user_id: "",
      // Will be set by the API
      type,
      title: item.TMDB_Title || item.Title,
      status: this.mapStatus(item.Status),
      rating,
      genre: genres,
      language: item.Original_Language || "en",
      runtime_minutes: this.parseRuntime(item),
      pages: void 0,
      // Not applicable for movies/TV
      release_year: this.parseYear(item.First_Air_Date),
      completed_at: watchDate,
      started_at: void 0,
      platform: this.parsePlatform(item.Networks),
      notes: this.cleanReviewText(item.Review_Text),
      metadata: {
        tmdb_id: String(item.TMDB_ID),
        serializd_id: String(item.Review_ID || ""),
        source: "serializd",
        // Original enriched data
        original_title: item.Original_Title,
        overview: item.Overview,
        cast: typeof item.Cast === "string" ? item.Cast.split(", ") : [],
        imdb_id: item.IMDB_ID,
        popularity: item.Popularity,
        vote_average: item.Vote_Average,
        vote_count: item.Vote_Count,
        adult: item.Adult,
        homepage: item.Homepage,
        created_by: item.Created_By,
        keywords: typeof item.Keywords === "string" ? item.Keywords.split(", ") : [],
        // TV Show specific data
        seasons: item.Season_Episode,
        season_episode: item.Season_Episode,
        is_episode: Boolean(item.Season_Episode),
        is_season: Boolean(item.Number_of_Seasons),
        // Additional metadata for compatibility
        watched_date: watchDate?.toISOString(),
        review_text: this.cleanReviewText(item.Review_Text),
        imported_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      recorded_at: /* @__PURE__ */ new Date()
    };
    return contentEntry;
  }
  /**
   * Determine content type from enriched data
   */
  static determineContentType(item) {
    if (item.Number_of_Seasons || item.Status === "Returning Series" || item.Season_Episode || item.Episode_Runtime) {
      return "tv_show";
    }
    return "movie";
  }
  /**
   * Parse rating from various formats
   */
  static parseRating(rating) {
    if (!rating) return void 0;
    if (typeof rating === "number") {
      return Math.min(Math.max(rating, 0), 10);
    }
    if (typeof rating === "string") {
      if (rating.includes("/")) {
        const [numerator, denominator] = rating.split("/").map((n) => parseInt(n.trim()));
        if (!isNaN(numerator) && !isNaN(denominator) && denominator > 0) {
          return Math.min(Math.max(numerator / denominator * 2, 0), 10);
        }
      }
      const parsed = parseFloat(rating);
      if (!isNaN(parsed)) {
        return Math.min(Math.max(parsed, 0), 10);
      }
    }
    return void 0;
  }
  /**
   * Parse genres from string or array
   */
  static parseGenres(genres) {
    if (!genres) return [];
    if (Array.isArray(genres)) {
      return genres.filter((g) => typeof g === "string" && g.trim());
    }
    if (typeof genres === "string") {
      return genres.split(",").map((g) => g.trim()).filter((g) => g);
    }
    return [];
  }
  /**
   * Parse watch date
   */
  static parseWatchDate(dateStr) {
    if (!dateStr) return void 0;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? void 0 : date;
    } catch {
      return void 0;
    }
  }
  /**
   * Map status to our format
   */
  static mapStatus(status) {
    if (!status) return "completed";
    const statusStr = String(status).toLowerCase();
    if (statusStr.includes("returning") || statusStr.includes("ongoing")) {
      return "watching";
    }
    if (statusStr.includes("planned") || statusStr.includes("want")) {
      return "planned";
    }
    if (statusStr.includes("dropped")) {
      return "dropped";
    }
    if (statusStr.includes("paused") || statusStr.includes("hold")) {
      return "paused";
    }
    return "completed";
  }
  /**
   * Parse runtime from enriched data
   */
  static parseRuntime(item) {
    if (item.Average_Runtime && typeof item.Average_Runtime === "number") {
      return item.Average_Runtime;
    }
    if (item.Episode_Runtime && Array.isArray(item.Episode_Runtime) && item.Episode_Runtime.length > 0) {
      const avg = item.Episode_Runtime.reduce((sum, runtime) => sum + runtime, 0) / item.Episode_Runtime.length;
      return Math.round(avg);
    }
    return void 0;
  }
  /**
   * Parse platform/network
   */
  static parsePlatform(networks) {
    if (!networks) return void 0;
    if (typeof networks === "string") {
      return networks.split(",")[0].trim();
    }
    return void 0;
  }
  /**
   * Parse year from date string
   */
  static parseYear(dateStr) {
    if (!dateStr) return void 0;
    try {
      const year = new Date(dateStr).getFullYear();
      return isNaN(year) ? void 0 : year;
    } catch {
      return void 0;
    }
  }
  /**
   * Clean up review text (remove UI elements from scraping)
   */
  static cleanReviewText(reviewText) {
    if (!reviewText || typeof reviewText !== "string") return void 0;
    const cleaned = reviewText.replace(/\d+\s*reviews?\s*/gi, "").replace(/Sort by:[\s\S]*?Grid view/gi, "").replace(/⭐+/g, "").replace(/½/g, "").replace(/When Watched.*?first/gi, "").replace(/Rating\s*Any/gi, "").replace(/Include\.\.\./gi, "").replace(/Shows only|Seasons only|Episodes only/gi, "").trim();
    return cleaned.length > 10 ? cleaned : void 0;
  }
}

const POST = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: "Authentication required"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const formData = await request.formData();
    const file = formData.get("serializd_data");
    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: "No file provided"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log(`📁 Processing enriched Serializd file: ${file.name} (${file.size} bytes)`);
    const { success: processSuccess, message, content: processedEntries, errors: processingErrors } = await EnrichedSerializdProcessor.processFile(file);
    if (!processSuccess) {
      return new Response(JSON.stringify({
        success: false,
        error: message,
        details: processingErrors
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (processedEntries.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No valid entries found in file after processing",
        details: processingErrors
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log(`✅ Successfully processed ${processedEntries.length} entries`);
    const existingEntries = /* @__PURE__ */ new Set();
    const { data: existingMetrics } = await supabase.from("metrics").select("metadata").eq("user_id", user.id).eq("type", "content");
    if (existingMetrics) {
      existingMetrics.forEach((metric) => {
        if (metric.metadata?.tmdb_id) {
          existingEntries.add(metric.metadata.tmdb_id);
        }
      });
    }
    const newEntries = processedEntries.filter((entry) => {
      const tmdbId = entry.metadata.tmdb_id;
      return tmdbId && !existingEntries.has(tmdbId);
    });
    console.log(`📊 Found ${processedEntries.length} total entries, ${newEntries.length} new entries (${processedEntries.length - newEntries.length} duplicates)`);
    const metricsEntries = newEntries.map((entry) => ({
      user_id: user.id,
      type: "content",
      value: entry.rating || 0,
      unit: "rating",
      recorded_at: entry.recorded_at.toISOString(),
      metadata: {
        // Core content fields
        id: entry.id,
        content_type: entry.type,
        title: entry.title,
        status: entry.status,
        rating: entry.rating,
        genres: entry.genre,
        // Array of genres
        language: entry.language,
        runtime_minutes: entry.runtime_minutes,
        pages: entry.pages,
        release_year: entry.release_year,
        completed_at: entry.completed_at?.toISOString(),
        started_at: entry.started_at?.toISOString(),
        platform: entry.platform,
        notes: entry.notes,
        // Enhanced metadata from enriched Serializd
        tmdb_id: entry.metadata.tmdb_id,
        tmdb_title: entry.title,
        // Store TMDB title
        original_title: entry.metadata.original_title,
        overview: entry.metadata.overview,
        cast: Array.isArray(entry.metadata.cast) ? entry.metadata.cast.join(", ") : entry.metadata.cast,
        crew: entry.metadata.crew,
        imdb_id: entry.metadata.imdb_id,
        popularity: entry.metadata.popularity,
        vote_average: entry.metadata.vote_average,
        vote_count: entry.metadata.vote_count,
        adult: entry.metadata.adult,
        homepage: entry.metadata.homepage,
        created_by: entry.metadata.created_by,
        keywords: Array.isArray(entry.metadata.keywords) ? entry.metadata.keywords.join(", ") : entry.metadata.keywords,
        // TV Show specific fields
        season_episode: entry.metadata.season_episode,
        seasons: entry.metadata.seasons,
        is_episode: entry.metadata.is_episode,
        is_season: entry.metadata.is_season,
        // Import tracking
        serializd_id: entry.metadata.serializd_id,
        source: entry.metadata.source,
        watched_date: entry.metadata.watched_date,
        review_text: entry.metadata.review_text,
        imported_at: entry.metadata.imported_at
      }
    }));
    let imported = 0;
    const errors = [...processingErrors];
    const batchSize = 100;
    for (let i = 0; i < metricsEntries.length; i += batchSize) {
      const batch = metricsEntries.slice(i, i + batchSize);
      try {
        const { error: insertError } = await supabase.from("metrics").insert(batch);
        if (insertError) {
          console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} insert error:`, insertError);
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
          continue;
        }
        imported += batch.length;
        console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`);
      } catch (batchError) {
        console.error("Batch processing error:", batchError);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: Processing failed - ${batchError.message}`);
      }
    }
    const stats = generateImportStats(processedEntries, newEntries, imported, errors);
    return new Response(JSON.stringify({
      success: true,
      message: `Successfully imported ${imported} new content entries from enriched Serializd data!`,
      stats,
      errors: errors.length > 0 ? errors : void 0
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("💥 Enriched Serializd import error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Import failed",
      details: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
function generateImportStats(processedEntries, newEntries, imported, errors) {
  const importedEntries = processedEntries.filter(
    (entry) => newEntries.some((ne) => ne.id === entry.id)
  );
  const movies = importedEntries.filter((e) => e.type === "movie").length;
  const tvShows = importedEntries.filter((e) => e.type === "tv_show").length;
  const books = importedEntries.filter((e) => e.type === "book").length;
  const ratedEntries = importedEntries.filter((e) => e.rating && e.rating > 0);
  const avgRating = ratedEntries.length > 0 ? ratedEntries.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEntries.length : 0;
  const genreCounts = {};
  importedEntries.forEach((entry) => {
    entry.genre.forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts).map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  const dates = importedEntries.map((e) => e.completed_at).filter((d) => d).map((d) => d.toISOString()).sort();
  let dateRange = "No dates available";
  if (dates.length > 0) {
    const firstDate = new Date(dates[0]).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const lastDate = new Date(dates[dates.length - 1]).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    dateRange = firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`;
  }
  const platformCounts = {};
  importedEntries.forEach((entry) => {
    if (entry.platform) {
      platformCounts[entry.platform] = (platformCounts[entry.platform] || 0) + 1;
    }
  });
  const topPlatforms = Object.entries(platformCounts).map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count).slice(0, 3);
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
    import_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    file_format: "enriched_serializd_json"
  };
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
