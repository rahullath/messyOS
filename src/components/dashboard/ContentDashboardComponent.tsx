// src/components/dashboard/ContentDashboardComponent.tsx
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
  upcomingEpisodes: UpcomingEpisode[];
}

interface UpcomingEpisode {
  title: string;
  season_episode: string;
  air_date: string;
  network: string;
  poster_url?: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  rating?: number;
  genres: string[];
  overview?: string;
  poster_url?: string;
  tmdb_id?: number;
  season_episode?: string;
  watch_date?: string;
  cast?: string;
  networks?: string;
  status?: string;
  vote_average?: number;
}

export default function ContentDashboardComponent() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'movie' | 'tv_show' | 'book'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'title'>('date');
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  useEffect(() => {
    fetchContentData();
  }, []);

  const fetchContentData = async () => {
    try {
      const response = await fetch('/api/content');
      const data = await response.json();
      
      if (data.success) {
        // Process the enriched data structure from your existing API
        const processedContent = data.content.map((item: any) => {
          // Handle both enriched_Reviews and enriched_Watched_shows format
          const metadata = item.metadata || {};
          
          let rating = null;
          if (metadata.rating) {
            // Parse "188/5" format from enriched_Reviews or use direct rating
            if (typeof metadata.rating === 'string' && metadata.rating.includes('/')) {
              rating = parseInt(metadata.rating.split('/')[0]) / 20; // Convert to 1-10 scale
            } else if (typeof metadata.rating === 'number') {
              rating = metadata.rating;
            }
          }

          // Debug: Check what poster fields are available
          console.log('Sample metadata for poster debugging:', {
            tmdb_id: metadata.tmdb_id,
            available_fields: Object.keys(metadata).filter(key => 
              key.toLowerCase().includes('poster') || 
              key.toLowerCase().includes('image') || 
              key.toLowerCase().includes('photo')
            )
          });

          // Get poster URL from TMDB data - check multiple possible field names
          let poster_url = undefined;
          if (metadata.tmdb_id) {
            // Try different possible poster path fields from your enriched data
            const posterPath = metadata.poster_path || 
                             metadata.Poster_Path || 
                             metadata.poster || 
                             metadata.poster_url ||
                             metadata.image ||
                             metadata.backdrop_path;
            
            if (posterPath && typeof posterPath === 'string') {
              // If it's already a full URL, use it
              if (posterPath.startsWith('http')) {
                poster_url = posterPath;
              } else if (posterPath.startsWith('/')) {
                // If it's a TMDB path, construct the full URL
                poster_url = `https://image.tmdb.org/t/p/w300${posterPath}`;
              }
            }
          }

          return {
            id: item.id,
            title: metadata.tmdb_title || metadata.title || 'Unknown',
            type: metadata.content_type || 'movie',
            rating: rating,
            genres: Array.isArray(metadata.genres) ? metadata.genres : 
                   (typeof metadata.genres === 'string' ? metadata.genres.split(', ').filter(g => g.trim()) : []),
            overview: metadata.overview,
            poster_url: poster_url,
            tmdb_id: metadata.tmdb_id,
            season_episode: metadata.season_episode,
            watch_date: metadata.watched_date || metadata.completed_at,
            cast: metadata.cast,
            networks: metadata.networks,
            status: metadata.status,
            vote_average: metadata.vote_average,
            imdb_id: metadata.imdb_id,
            keywords: typeof metadata.keywords === 'string' ? 
              metadata.keywords.split(', ').filter(k => k.trim()) : 
              (metadata.keywords || [])
          };
        });

        setContent(processedContent);
        setStats(calculateStats(processedContent));
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (contentData: ContentItem[]): ContentStats => {
    const movies = contentData.filter(c => c.type === 'movie');
    const tvShows = contentData.filter(c => c.type === 'tv_show');
    const books = contentData.filter(c => c.type === 'book');

    const ratedContent = contentData.filter(c => c.rating && c.rating > 0);
    const avgRating = ratedContent.length > 0 
      ? ratedContent.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedContent.length 
      : 0;

    // Generate genre counts
    const genreCount = new Map<string, number>();
    contentData.forEach(item => {
      if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach(genre => {
          genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
        });
      }
    });

    const topGenres = Array.from(genreCount.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate monthly progress (last 12 months)
    const monthlyProgress = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const count = contentData.filter(item => 
        item.watch_date && item.watch_date.startsWith(monthKey)
      ).length;

      monthlyProgress.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        count
      });
    }

    // Get upcoming episodes for returning series
    const upcomingEpisodes: UpcomingEpisode[] = tvShows
      .filter(show => show.status === 'Returning Series')
      .slice(0, 5)
      .map(show => ({
        title: show.title,
        season_episode: 'Next Episode',
        air_date: 'TBA',
        network: show.networks || 'Unknown',
        poster_url: show.poster_url
      }));

    return {
      total: contentData.length,
      movies: movies.length,
      tv_shows: tvShows.length,
      books: books.length,
      avgRating: Math.round(avgRating * 10) / 10,
      topGenres,
      recentlyWatched: contentData
        .filter(c => c.watch_date)
        .sort((a, b) => new Date(b.watch_date!).getTime() - new Date(a.watch_date!).getTime())
        .slice(0, 10) as ContentEntry[],
      monthlyProgress,
      upcomingEpisodes
    };
  };

  const filteredContent = content.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const sortedContent = [...filteredContent].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'date':
      default:
        return new Date(b.watch_date || 0).getTime() - new Date(a.watch_date || 0).getTime();
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-300">Loading content...</span>
      </div>
    );
  }

  if (!stats || content.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7H3a1 1 0 01-1-1V5a1 1 0 011-1h4z"/>
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">No content data yet</h3>
        <p className="text-gray-400 mb-4">Import your enriched Serializd data to start tracking</p>
        <button 
          onClick={() => window.location.href = '/import'}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Import Content Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Episodes Calendar */}
      {stats.upcomingEpisodes.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Upcoming Episodes
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {stats.upcomingEpisodes.map((episode, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="text-sm font-medium text-gray-200 truncate">{episode.title}</div>
                <div className="text-xs text-gray-400 mt-1">{episode.network}</div>
                <div className="text-xs text-blue-400 mt-1">{episode.air_date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Entries</p>
              <p className="text-2xl font-bold text-gray-200">{stats.total}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Movies</p>
              <p className="text-2xl font-bold text-blue-400">{stats.movies}</p>
            </div>
            <div className="text-2xl">🎬</div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">TV Shows</p>
              <p className="text-2xl font-bold text-purple-400">{stats.tv_shows}</p>
            </div>
            <div className="text-2xl">📺</div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Rating</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.avgRating}</p>
            </div>
            <div className="text-2xl">⭐</div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {(['all', 'movie', 'tv_show', 'book'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === filterType
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {filterType === 'all' ? 'All' : filterType === 'tv_show' ? 'TV Shows' : 
               filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-700 text-gray-200 px-3 py-1 rounded-lg text-sm border border-gray-600"
          >
            <option value="date">Sort by Date</option>
            <option value="rating">Sort by Rating</option>
            <option value="title">Sort by Title</option>
          </select>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {sortedContent.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="bg-gray-800/50 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700/50 transition-all border border-gray-700/50 hover:border-purple-500/50"
          >
            {/* Poster placeholder */}
            <div className="aspect-[2/3] bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center relative">
              {item.poster_url ? (
                <img 
                  src={item.poster_url} 
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log('Failed to load poster:', item.poster_url);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              
              {/* Always show emoji as fallback/overlay */}
              <div className={`text-4xl ${item.poster_url ? 'absolute inset-0 flex items-center justify-center bg-gray-800/50 opacity-0 hover:opacity-100 transition-opacity' : ''}`}>
                {item.type === 'movie' ? '🎬' : item.type === 'tv_show' ? '📺' : '📚'}
              </div>
            </div>
            
            {/* Content Info */}
            <div className="p-3">
              <h3 className="font-medium text-sm text-gray-200 truncate mb-1">{item.title}</h3>
              {item.season_episode && (
                <p className="text-xs text-gray-400 truncate mb-1">{item.season_episode}</p>
              )}
              {item.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-xs">⭐</span>
                  <span className="text-xs text-gray-300">{item.rating.toFixed(1)}</span>
                </div>
              )}
              {item.watch_date && (
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(item.watch_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedItem(null)}>
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-200">{selectedItem.title}</h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  {selectedItem.overview && (
                    <p className="text-gray-300 mb-4">{selectedItem.overview}</p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    {selectedItem.genres.length > 0 && (
                      <p><strong className="text-gray-400">Genres:</strong> <span className="text-gray-300">{selectedItem.genres.join(', ')}</span></p>
                    )}
                    {selectedItem.cast && (
                      <p><strong className="text-gray-400">Cast:</strong> <span className="text-gray-300">{selectedItem.cast}</span></p>
                    )}
                    {selectedItem.networks && (
                      <p><strong className="text-gray-400">Network:</strong> <span className="text-gray-300">{selectedItem.networks}</span></p>
                    )}
                    {selectedItem.rating && (
                      <p><strong className="text-gray-400">Your Rating:</strong> <span className="text-yellow-400">⭐ {selectedItem.rating.toFixed(1)}/10</span></p>
                    )}
                    {selectedItem.vote_average && (
                      <p><strong className="text-gray-400">TMDB Rating:</strong> <span className="text-blue-400">{selectedItem.vote_average.toFixed(1)}/10</span></p>
                    )}
                  </div>
                </div>
                
                <div className="text-center">
                  {selectedItem.poster_url && (
                    <img 
                      src={selectedItem.poster_url} 
                      alt={selectedItem.title}
                      className="w-full max-w-48 mx-auto rounded-lg"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Genres */}
      {stats.topGenres.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Top Genres</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.topGenres.map((genre, index) => (
              <div key={genre.genre} className="text-center">
                <div className="text-lg font-bold text-purple-400">{genre.count}</div>
                <div className="text-sm text-gray-400">{genre.genre}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}