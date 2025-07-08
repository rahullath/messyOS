import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

class ContentAnalytics {
  async generateContentInsights(content) {
    const insights = {
      watchingPatterns: this.analyzeWatchingPatterns(content),
      genrePreferences: this.analyzeGenrePreferences(content),
      consumptionStats: this.calculateConsumptionStats(content),
      recommendations: await this.generateRecommendations(content),
      goals: this.calculateContentGoals(content)
    };
    return insights;
  }
  analyzeWatchingPatterns(content) {
    const moviesByMonth = /* @__PURE__ */ new Map();
    const showsByMonth = /* @__PURE__ */ new Map();
    const booksRead = content.filter((c) => c.type === "book" && c.status === "completed");
    content.filter((c) => c.completed_at).forEach((item) => {
      const monthKey = item.completed_at.toISOString().substring(0, 7);
      if (item.type === "movie") {
        moviesByMonth.set(monthKey, (moviesByMonth.get(monthKey) || 0) + 1);
      } else if (item.type === "tv_show") {
        showsByMonth.set(monthKey, (showsByMonth.get(monthKey) || 0) + 1);
      }
    });
    return {
      moviesPerMonth: Object.fromEntries(moviesByMonth),
      showsPerMonth: Object.fromEntries(showsByMonth),
      booksPerYear: booksRead.length,
      averageRating: this.calculateAverageRating(content),
      totalWatchTime: this.calculateTotalWatchTime(content),
      mostActiveMonth: this.findMostActiveMonth(moviesByMonth, showsByMonth)
    };
  }
  analyzeGenrePreferences(content) {
    const genreCount = /* @__PURE__ */ new Map();
    const genreRatings = /* @__PURE__ */ new Map();
    content.forEach((item) => {
      item.genre.forEach((genre) => {
        genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
        if (item.rating) {
          if (!genreRatings.has(genre)) genreRatings.set(genre, []);
          genreRatings.get(genre).push(item.rating);
        }
      });
    });
    const preferences = Array.from(genreCount.entries()).map(([genre, count]) => ({
      genre,
      count,
      percentage: count / content.length * 100,
      averageRating: genreRatings.has(genre) ? genreRatings.get(genre).reduce((a, b) => a + b, 0) / genreRatings.get(genre).length : null
    })).sort((a, b) => b.count - a.count);
    return {
      topGenres: preferences.slice(0, 10),
      genreDistribution: preferences,
      favoriteGenre: preferences[0]?.genre,
      leastLikedGenre: preferences.find((p) => p.averageRating && p.averageRating < 5)?.genre
    };
  }
  calculateConsumptionStats(content) {
    const thisYear = (/* @__PURE__ */ new Date()).getFullYear();
    const thisYearContent = content.filter(
      (c) => c.completed_at && c.completed_at.getFullYear() === thisYear
    );
    return {
      totalMovies: content.filter((c) => c.type === "movie" && c.status === "completed").length,
      totalShows: content.filter((c) => c.type === "tv_show" && c.status === "completed").length,
      totalBooks: content.filter((c) => c.type === "book" && c.status === "completed").length,
      thisYearMovies: thisYearContent.filter((c) => c.type === "movie").length,
      thisYearShows: thisYearContent.filter((c) => c.type === "tv_show").length,
      thisYearBooks: thisYearContent.filter((c) => c.type === "book").length,
      averageMonthlyContent: thisYearContent.length / ((/* @__PURE__ */ new Date()).getMonth() + 1),
      longestMovie: this.findLongestContent(content.filter((c) => c.type === "movie")),
      shortestBook: this.findShortestContent(content.filter((c) => c.type === "book")),
      mostRewatched: this.findMostRewatched(content)
    };
  }
  async generateRecommendations(content) {
    const preferences = this.analyzeGenrePreferences(content);
    return {
      movies: await this.recommendMovies(preferences, content),
      books: await this.recommendBooks(preferences, content),
      shows: await this.recommendShows(preferences, content),
      diversityRecommendations: this.generateDiversityRecommendations(content),
      languageRecommendations: this.generateLanguageRecommendations(content)
    };
  }
  async recommendMovies(preferences, content) {
    const topGenres = preferences.topGenres.slice(0, 3).map((g) => g.genre);
    const watchedMovies = content.filter((c) => c.type === "movie").map((c) => c.title.toLowerCase());
    const recommendationDatabase = {
      "Drama": [
        { title: "The Father", year: 2020, language: "English", genre: ["Drama"], reason: "Critically acclaimed drama" },
        { title: "Parasite", year: 2019, language: "Korean", genre: ["Drama", "Thriller"], reason: "Oscar-winning masterpiece" },
        { title: "Nomadland", year: 2020, language: "English", genre: ["Drama"], reason: "Contemplative character study" }
      ],
      "Action": [
        { title: "Mad Max: Fury Road", year: 2015, language: "English", genre: ["Action"], reason: "Visual spectacle" },
        { title: "John Wick", year: 2014, language: "English", genre: ["Action"], reason: "Stylized action choreography" }
      ]
    };
    const recommendations = [];
    for (const genre of topGenres) {
      if (recommendationDatabase[genre]) {
        recommendations.push(...recommendationDatabase[genre]);
      }
    }
    recommendations.push(
      { title: "Spirited Away", year: 2001, language: "Japanese", genre: ["Animation"], reason: "Studio Ghibli masterpiece" },
      { title: "Amélie", year: 2001, language: "French", genre: ["Comedy", "Romance"], reason: "Charming French cinema" }
    );
    return recommendations.filter((movie) => !watchedMovies.includes(movie.title.toLowerCase())).slice(0, 12);
  }
  async recommendBooks(preferences, content) {
    const readBooks = content.filter((c) => c.type === "book").map((c) => c.title.toLowerCase());
    const bookRecommendations = [
      { title: "Atomic Habits", author: "James Clear", year: 2018, genre: ["Self-Help"], reason: "Popular productivity book" },
      { title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid", year: 2017, genre: ["Fiction"], reason: "Character-driven narrative" },
      { title: "Educated", author: "Tara Westover", year: 2018, genre: ["Memoir"], reason: "Powerful memoir" }
    ];
    return bookRecommendations.filter((book) => !readBooks.includes(book.title.toLowerCase())).slice(0, 8);
  }
  async recommendShows(preferences, content) {
    const watchedShows = content.filter((c) => c.type === "tv_show").map((c) => c.title.toLowerCase());
    const showRecommendations = [
      { title: "The Bear", year: 2022, genre: ["Drama", "Comedy"], reason: "Critically acclaimed culinary drama" },
      { title: "Succession", year: 2018, genre: ["Drama"], reason: "Intense family power dynamics" }
    ];
    return showRecommendations.filter((show) => !watchedShows.includes(show.title.toLowerCase())).slice(0, 8);
  }
  generateDiversityRecommendations(content) {
    const watchedLanguages = new Set(content.map((c) => c.language));
    const unexploredLanguages = ["Japanese", "French", "Spanish", "Korean", "German", "Italian", "Russian", "Portuguese"].filter((lang) => !watchedLanguages.has(lang));
    return {
      languages: unexploredLanguages,
      suggestion: "Explore world cinema to broaden your cultural perspective"
    };
  }
  generateLanguageRecommendations(content) {
    const languageMovies = {
      "Japanese": ["Seven Samurai", "Your Name", "Spirited Away"],
      "French": ["Amélie", "The Intouchables", "Blue Is the Warmest Color"],
      "Korean": ["Parasite", "Oldboy", "Burning"],
      "Spanish": ["Pan's Labyrinth", "The Secret in Their Eyes", "Roma"]
    };
    return languageMovies;
  }
  calculateContentGoals(content) {
    const thisYear = (/* @__PURE__ */ new Date()).getFullYear();
    const thisYearContent = content.filter(
      (c) => c.completed_at && c.completed_at.getFullYear() === thisYear
    );
    return {
      yearlyGoals: {
        movies: { target: 100, current: thisYearContent.filter((c) => c.type === "movie").length },
        books: { target: 24, current: thisYearContent.filter((c) => c.type === "book").length },
        shows: { target: 12, current: thisYearContent.filter((c) => c.type === "tv_show").length }
      },
      challenges: {
        languageDiversity: this.calculateLanguageDiversityChallenge(content),
        genreDiversity: this.calculateGenreDiversityChallenge(content),
        classicsChallenge: this.calculateClassicsChallenge(content),
        currentYearProgress: this.calculateYearProgress(thisYearContent)
      }
    };
  }
  calculateLanguageDiversityChallenge(content) {
    const languages = new Set(content.map((c) => c.language));
    return {
      total: languages.size,
      target: 5,
      progress: Math.min(languages.size, 5)
    };
  }
  calculateGenreDiversityChallenge(content) {
    const genres = new Set(content.flatMap((c) => c.genre));
    return {
      total: genres.size,
      target: 10,
      progress: Math.min(genres.size, 10)
    };
  }
  calculateClassicsChallenge(content) {
    const classicMovies = content.filter(
      (c) => c.type === "movie" && c.completed_at && c.completed_at.getFullYear() < 1980
    );
    return {
      total: classicMovies.length,
      target: 12,
      progress: Math.min(classicMovies.length, 12)
    };
  }
  calculateYearProgress(thisYearContent) {
    const totalGoal = 136;
    const currentProgress = thisYearContent.length;
    return {
      total: currentProgress,
      target: totalGoal,
      percentage: Math.min(currentProgress / totalGoal * 100, 100)
    };
  }
  findLongestContent(content) {
    if (content.length === 0) return null;
    return content.reduce((longest, current) => {
      const longestRuntime = longest.runtime_minutes ?? 0;
      const currentRuntime = current.runtime_minutes ?? 0;
      return currentRuntime > longestRuntime ? current : longest;
    });
  }
  findShortestContent(content) {
    if (content.length === 0) return null;
    return content.reduce((shortest, current) => {
      const shortestRuntime = shortest.runtime_minutes ?? Infinity;
      const currentRuntime = current.runtime_minutes ?? Infinity;
      return currentRuntime < shortestRuntime ? current : shortest;
    });
  }
  findMostRewatched(content) {
    if (content.length === 0) return null;
    return content.reduce((mostRewatched, current) => {
      const currentRewatch = current.metadata?.rewatch_count ?? 0;
      const mostRewatchedCount = mostRewatched.metadata?.rewatch_count ?? 0;
      return currentRewatch > mostRewatchedCount ? current : mostRewatched;
    });
  }
  calculateAverageRating(content) {
    const ratedContent = content.filter((c) => c.rating);
    if (ratedContent.length === 0) return 0;
    return ratedContent.reduce((sum, c) => sum + c.rating, 0) / ratedContent.length;
  }
  calculateTotalWatchTime(content) {
    return content.filter((c) => c.runtime_minutes && c.status === "completed").reduce((total, c) => total + c.runtime_minutes, 0);
  }
  findMostActiveMonth(movies, shows) {
    const combined = /* @__PURE__ */ new Map();
    for (const [month, count] of movies) {
      combined.set(month, (combined.get(month) || 0) + count);
    }
    for (const [month, count] of shows) {
      combined.set(month, (combined.get(month) || 0) + count);
    }
    return Array.from(combined.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] || "";
  }
}

const GET = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { data: contentMetrics, error } = await supabase.from("metrics").select("*").eq("user_id", user.id).eq("type", "content").order("recorded_at", { ascending: false });
    if (error) throw error;
    const content = (contentMetrics || []).map((metric) => ({
      id: metric.id,
      user_id: metric.user_id,
      type: metric.metadata?.content_type || "movie",
      title: metric.metadata?.title || "Unknown",
      status: metric.metadata?.status || "completed",
      rating: metric.metadata?.rating,
      genre: metric.metadata?.genre || [],
      language: metric.metadata?.language || "English",
      runtime_minutes: metric.metadata?.runtime_minutes,
      pages: metric.metadata?.pages,
      completed_at: metric.metadata?.completed_at ? new Date(metric.metadata.completed_at) : void 0,
      started_at: metric.metadata?.started_at ? new Date(metric.metadata.started_at) : void 0,
      platform: metric.metadata?.platform,
      notes: metric.metadata?.notes,
      metadata: metric.metadata,
      recorded_at: new Date(metric.recorded_at)
    }));
    const contentAnalytics = new ContentAnalytics();
    const insights = await contentAnalytics.generateContentInsights(content);
    return new Response(JSON.stringify({
      success: true,
      analytics: {
        goalProgress: insights.goals.yearlyGoals,
        genreAnalysis: insights.genrePreferences,
        ratingAnalysis: {
          averageRating: insights.watchingPatterns.averageRating,
          totalWatchTime: insights.watchingPatterns.totalWatchTime
        },
        insights: [
          `Your most active month is ${insights.watchingPatterns.mostActiveMonth}`,
          `You've watched content from ${insights.genrePreferences.topGenres.length} different genres`
        ],
        recommendations: insights.recommendations.movies.slice(0, 3).map((movie) => `Consider watching "${movie.title}" (${movie.year}) - ${movie.genre.join(", ")}`)
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Content insights error:", errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
