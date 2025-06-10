interface ContentItem {
  id?: any;
  user_id?: any;
  type: string;
  title: string;
  status?: string;
  rating?: number;
  genre?: string[];
  language?: string;
  runtime_minutes?: number;
  pages?: number;
  release_year?: number;
  completed_at?: string | Date;
  started_at?: string | Date;
  platform?: string;
  notes?: string;
  metadata?: any;
  recorded_at?: string | Date;
}

interface ContentStats {
  totalItems: number;
  totalMovies: number;
  totalShows: number;
  totalBooks: number;
  totalPodcasts: number;
  thisYearMovies: number;
  thisYearShows: number;
  thisYearBooks: number;
  averageRating: number;
  totalWatchTime: number;
  totalPages: number;
  uniqueLanguages: number;
  topGenres: Array<{ genre: string; count: number; percentage: number }>;
  monthlyActivity: Array<{ month: string; count: number }>;
}

export function calculateContentStats(content: ContentItem[]): ContentStats {
  const thisYear = new Date().getFullYear();
  const thisYearContent = content.filter(item => {
    const completedDate = item.completed_at instanceof Date 
      ? item.completed_at 
      : item.completed_at 
        ? new Date(item.completed_at) 
        : null;
    return completedDate && completedDate.getFullYear() === thisYear;
  });

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
      percentage: content.length > 0 ? (count / content.length) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Monthly activity
  const monthlyCount = new Map<string, number>();
  content.forEach(item => {
    const completedDate = item.completed_at instanceof Date 
      ? item.completed_at 
      : item.completed_at 
        ? new Date(item.completed_at) 
        : null;
    
    if (completedDate) {
      const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyCount.set(monthKey, (monthlyCount.get(monthKey) || 0) + 1);
    }
  });

  const monthlyActivity = Array.from(monthlyCount.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12); // Last 12 months

  // Language diversity
  const languages = new Set(content.map(item => item.language).filter(Boolean));

  return {
    totalItems: content.length,
    totalMovies: content.filter(item => item.type === 'movie').length,
    totalShows: content.filter(item => item.type === 'tv_show').length,
    totalBooks: content.filter(item => item.type === 'book').length,
    totalPodcasts: content.filter(item => item.type === 'podcast').length,
    thisYearMovies: thisYearContent.filter(item => item.type === 'movie').length,
    thisYearShows: thisYearContent.filter(item => item.type === 'tv_show').length,
    thisYearBooks: thisYearContent.filter(item => item.type === 'book').length,
    averageRating: content.filter(item => item.rating).reduce((sum, item) => sum + (item.rating || 0), 0) / Math.max(content.filter(item => item.rating).length, 1),
    totalWatchTime: content.filter(item => item.runtime_minutes).reduce((sum, item) => sum + (item.runtime_minutes || 0), 0),
    totalPages: content.filter(item => item.pages).reduce((sum, item) => sum + (item.pages || 0), 0),
    uniqueLanguages: languages.size,
    topGenres,
    monthlyActivity
  };
}

interface Recommendation {
  title: string;
  type: string;
  reason: string;
  genre: string[];
  language?: string;
  year?: number;
  confidence: number;
}

export async function generateRecommendations(content: ContentItem[]): Promise<Recommendation[]> {
  if (content.length === 0) {
    return getDefaultRecommendations();
  }

  const stats = calculateContentStats(content);
  const recommendations: Recommendation[] = [];

  // Genre-based recommendations
  const favoriteGenres = stats.topGenres.slice(0, 3);
  
  // Language diversity recommendations
  const languages = new Set(content.map(item => item.language));
  const hasInternationalContent = languages.has('Japanese') || languages.has('Korean') || languages.has('French');

  // Movie recommendations
  if (favoriteGenres.some(g => ['Action', 'Sci-Fi', 'Thriller'].includes(g.genre))) {
    recommendations.push({
      title: "Blade Runner 2049",
      type: "movie",
      reason: "Based on your love for sci-fi and visually stunning films",
      genre: ["Sci-Fi", "Drama"],
      year: 2017,
      confidence: 0.9
    });
  }

  if (favoriteGenres.some(g => ['Animation', 'Family'].includes(g.genre))) {
    recommendations.push({
      title: "Your Name",
      type: "movie",
      reason: "Beautiful Japanese animation with emotional depth",
      genre: ["Animation", "Romance"],
      language: "Japanese",
      year: 2016,
      confidence: 0.85
    });
  }

  // International cinema recommendations
  if (!hasInternationalContent) {
    recommendations.push({
      title: "Oldboy",
      type: "movie",
      reason: "Expand your horizons with acclaimed Korean cinema",
      genre: ["Thriller", "Mystery"],
      language: "Korean",
      year: 2003,
      confidence: 0.8
    });
  }

  // Book recommendations based on movie preferences
  if (content.some(item => item.type === 'movie' && item.genre?.includes('Sci-Fi'))) {
    recommendations.push({
      title: "Dune",
      type: "book",
      reason: "Epic sci-fi that influenced countless films you've enjoyed",
      genre: ["Sci-Fi", "Epic"],
      confidence: 0.75
    });
  }

  // TV show recommendations
  if (stats.totalShows < stats.totalMovies) {
    recommendations.push({
      title: "The Bear",
      type: "tv_show",
      reason: "Critically acclaimed series perfect for expanding your TV watching",
      genre: ["Comedy", "Drama"],
      confidence: 0.8
    });
  }

  return recommendations.slice(0, 8); // Return top 8 recommendations
}

function getDefaultRecommendations(): Recommendation[] {
  return [
    {
      title: "The Shawshank Redemption",
      type: "movie",
      reason: "Timeless classic perfect for starting your movie journey",
      genre: ["Drama"],
      year: 1994,
      confidence: 0.95
    },
    {
      title: "Spirited Away",
      type: "movie",
      reason: "Beautiful introduction to Japanese animation",
      genre: ["Animation", "Family"],
      language: "Japanese",
      year: 2001,
      confidence: 0.9
    },
    {
      title: "Breaking Bad",
      type: "tv_show",
      reason: "Masterpiece of television storytelling",
      genre: ["Crime", "Drama"],
      confidence: 0.95
    },
    {
      title: "Atomic Habits",
      type: "book",
      reason: "Life-changing book for personal development",
      genre: ["Self-Help", "Productivity"],
      confidence: 0.85
    }
  ];
}
