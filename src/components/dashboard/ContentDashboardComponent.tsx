// src/components/dashboard/ContentDashboard.tsx
import React, { useState, useEffect } from 'react';
import type { ContentEntry } from '../../types/content';

interface ContentStats {
  total: number;
  movies: number;
  tv_shows: number;
  books: number;
  avgRating: number;
  topGenres: { genre: string; count: number }[];
  recentlyWatched: ContentEntry[];
  monthlyProgress: { month: string; count: number }[];
}

export default function ContentDashboardComponent() {
  const [content, setContent] = useState<ContentEntry[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv_show' | 'book'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'title'>('date');

  useEffect(() => {
    fetchContentData();
  }, []);

  const fetchContentData = async () => {
    try {
      const response = await fetch('/api/content');
      const data = await response.json();
      
      if (data.success) {
        // Map the API response (metrics table format) to ContentEntry interface
        const mappedContent: ContentEntry[] = data.content.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          type: item.metadata.content_type, // Map metadata.content_type to top-level type
          title: item.metadata.title,
          status: item.metadata.status || 'completed',
          rating: item.metadata.rating,
          genre: item.metadata.genres || [],
          language: item.metadata.language || 'en',
          runtime_minutes: item.metadata.runtime_minutes,
          pages: item.metadata.pages,
          release_year: item.metadata.release_year,
          completed_at: item.metadata.watched_date ? new Date(item.metadata.watched_date) : undefined,
          started_at: undefined,
          platform: item.metadata.platform || 'Unknown',
          notes: item.metadata.review_text || undefined,
          metadata: { // This metadata is for additional details, not the main fields
            tmdb_id: item.metadata.tmdb_id ? String(item.metadata.tmdb_id) : undefined,
            isbn: item.metadata.isbn,
            serializd_id: item.metadata.serializd_id,
            imdb_rating: item.metadata.vote_average,
            personal_tags: item.metadata.personal_tags,
            rewatch_count: item.metadata.rewatch_count,
            source: item.metadata.source,
            seasons: item.metadata.season_episode,
            page: item.metadata.page,
            imported_at: item.metadata.imported_at,
          },
          recorded_at: new Date(item.recorded_at),
        }));
        
        setContent(mappedContent);
        setStats(calculateStats(mappedContent));
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (contentData: ContentEntry[]): ContentStats => {
    const movies = contentData.filter(c => c.type === 'movie');
    const tvShows = contentData.filter(c => c.type === 'tv_show');
    const books = contentData.filter(c => c.type === 'book');

    const ratedContent = contentData.filter(c => c.rating && c.rating > 0);
    const avgRating = ratedContent.length > 0 
      ? ratedContent.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedContent.length
      : 0;

    // Genre analysis
    const genreCounts: { [key: string]: number } = {};
    contentData.forEach(item => {
      if (item.genre) {
        item.genre.forEach(genre => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const topGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent content (last 10)
    const recentlyWatched = contentData
      .sort((a, b) => (b.completed_at?.getTime() || 0) - (a.completed_at?.getTime() || 0))
      .slice(0, 10);

    // Monthly progress
    const monthlyData: { [key: string]: number } = {};
    contentData.forEach(item => {
      if (item.completed_at) {
        const month = item.completed_at.toISOString().slice(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });

    const monthlyProgress = Object.entries(monthlyData)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months

    return {
      total: contentData.length,
      movies: movies.length,
      tv_shows: tvShows.length,
      books: books.length,
      avgRating,
      topGenres,
      recentlyWatched,
      monthlyProgress
    };
  };

  const filteredContent = content.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter; // Use item.type
  });

  const sortedContent = [...filteredContent].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return (b.completed_at?.getTime() || 0) - (a.completed_at?.getTime() || 0); // Use completed_at
      case 'rating':
        return (b.rating || 0) - (a.rating || 0); // Use item.rating
      case 'title':
        return a.title.localeCompare(b.title); // Use item.title
      default:
        return 0;
    }
  });

  const formatDate = (date: Date | undefined) => { // Accept Date object or undefined
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getContentIcon = (type: string) => { // type is now directly 'movie' | 'tv_show' | 'book'
    switch (type) {
      case 'movie': return '🎬';
      case 'tv_show': return '📺';
      case 'book': return '📚';
      default: return '📄';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!stats || content.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No content data yet</h3>
        <p className="text-gray-600 mb-4">Import your Serializd data to start tracking your entertainment</p>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          Import Serializd Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="2xl">📊</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Movies</p>
              <p className="text-2xl font-bold text-blue-600">{stats.movies}</p>
            </div>
            <div className="2xl">🎬</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">TV Shows</p>
              <p className="2xl font-bold text-purple-600">{stats.tv_shows}</p>
            </div>
            <div className="2xl">📺</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="sm text-gray-600">Avg Rating</p>
              <p className="2xl font-bold text-yellow-600">{stats.avgRating.toFixed(1)}</p>
            </div>
            <div className="2xl">⭐</div>
          </div>
        </div>
      </div>

      {/* Top Genres */}
      {stats.topGenres.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="lg font-semibold text-gray-900 mb-4">Top Genres</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.topGenres.map((genre, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">{genre.count}</span>
                </div>
                <p className="sm font-medium text-gray-900">{genre.genre}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'movie', 'tv_show', 'book'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : type === 'tv_show' ? 'TV Shows' : 
               type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'rating' | 'title')}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="date">Sort by Date</option>
          <option value="rating">Sort by Rating</option>
          <option value="title">Sort by Title</option>
        </select>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedContent.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getContentIcon(item.type)}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{item.title}</h4>
                    {item.metadata.seasons && (
                      <p className="text-xs text-gray-500">{item.metadata.seasons}</p>
                    )}
                  </div>
                </div>
                {item.rating && (
                  <span className={`text-sm font-bold ${getRatingColor(item.rating)}`}>
                    {item.rating.toFixed(1)}
                  </span>
                )}
              </div>
              
              {item.notes && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {item.notes.length > 100 
                    ? item.notes.substring(0, 100) + '...'
                    : item.notes}
                </p>
              )}
              
              {item.genre && item.genre.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.genre.slice(0, 3).map((genre, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                  {item.genre.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                      +{item.genre.length - 3}
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{formatDate(item.completed_at)}</span>
                {item.notes && (
                  <span className="text-purple-600">📝 Review</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedContent.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No content found for the selected filter.</p>
        </div>
      )}
    </div>
  );
}
