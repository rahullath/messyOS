// src/lib/habits/pagination-service.ts - Pagination service for habit entries
import type { Database } from '../../types/supabase';
import { habitCacheService } from './cache-service';

type HabitEntry = Database['public']['Tables']['habit_entries']['Row'];
type HabitData = Database['public']['Tables']['habits']['Row'];

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: 'date' | 'created_at' | 'value';
  sortOrder?: 'asc' | 'desc';
  filters?: {
    habitIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    value?: number;
    hasNotes?: boolean;
    hasContext?: boolean;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  performance: {
    queryTime: number;
    cacheHit: boolean;
  };
}

export interface HabitEntryWithHabit extends HabitEntry {
  habit?: HabitData;
}

class HabitPaginationService {
  private readonly DEFAULT_PAGE_SIZE = 50;
  private readonly MAX_PAGE_SIZE = 200;

  /**
   * Generate cache key for paginated results
   */
  private getPaginationCacheKey(
    userId: string, 
    params: PaginationParams
  ): string {
    const filterKey = params.filters ? 
      JSON.stringify(params.filters).replace(/[^a-zA-Z0-9]/g, '') : 'nofilter';
    
    return `paginated:${userId}:${params.page}:${params.pageSize}:${params.sortBy || 'date'}:${params.sortOrder || 'desc'}:${filterKey}`;
  }

  /**
   * Validate and normalize pagination parameters
   */
  private normalizePaginationParams(params: Partial<PaginationParams>): PaginationParams {
    return {
      page: Math.max(1, params.page || 1),
      pageSize: Math.min(
        this.MAX_PAGE_SIZE, 
        Math.max(1, params.pageSize || this.DEFAULT_PAGE_SIZE)
      ),
      sortBy: params.sortBy || 'date',
      sortOrder: params.sortOrder || 'desc',
      filters: params.filters || {}
    };
  }

  /**
   * Build Supabase query with filters and sorting
   */
  private buildQuery(
    supabaseClient: any,
    userId: string,
    params: PaginationParams,
    includeHabit: boolean = false
  ) {
    let query = supabaseClient
      .from('habit_entries')
      .select(
        includeHabit 
          ? '*, habit:habits(id, name, category, type, color, measurement_type)'
          : '*',
        { count: 'exact' }
      )
      .eq('user_id', userId);

    // Apply filters
    if (params.filters?.habitIds?.length) {
      query = query.in('habit_id', params.filters.habitIds);
    }

    if (params.filters?.dateFrom) {
      query = query.gte('date', params.filters.dateFrom);
    }

    if (params.filters?.dateTo) {
      query = query.lte('date', params.filters.dateTo);
    }

    if (params.filters?.value !== undefined) {
      query = query.eq('value', params.filters.value);
    }

    if (params.filters?.hasNotes) {
      query = query.not('notes', 'is', null);
    }

    if (params.filters?.hasContext) {
      query = query.or('effort.not.is.null,mood.not.is.null,energy_level.not.is.null,location.not.is.null');
    }

    // Apply sorting
    const sortColumn = params.sortBy === 'created_at' ? 'created_at' : 
                      params.sortBy === 'value' ? 'value' : 'date';
    
    query = query.order(sortColumn, { ascending: params.sortOrder === 'asc' });

    // Apply pagination
    const offset = (params.page - 1) * params.pageSize;
    query = query.range(offset, offset + params.pageSize - 1);

    return query;
  }

  /**
   * Get paginated habit entries for a user
   */
  async getPaginatedEntries(
    supabaseClient: any,
    userId: string,
    params: Partial<PaginationParams> = {},
    includeHabit: boolean = false
  ): Promise<PaginatedResult<HabitEntryWithHabit>> {
    const startTime = Date.now();
    const normalizedParams = this.normalizePaginationParams(params);
    const cacheKey = this.getPaginationCacheKey(userId, normalizedParams);

    // Check cache first
    const cachedResult = habitCacheService.get<PaginatedResult<HabitEntryWithHabit>>(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        performance: {
          queryTime: Date.now() - startTime,
          cacheHit: true
        }
      };
    }

    try {
      // Build and execute query
      const query = this.buildQuery(supabaseClient, userId, normalizedParams, includeHabit);
      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch habit entries: ${error.message}`);
      }

      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / normalizedParams.pageSize);

      const result: PaginatedResult<HabitEntryWithHabit> = {
        data: data || [],
        pagination: {
          page: normalizedParams.page,
          pageSize: normalizedParams.pageSize,
          totalItems,
          totalPages,
          hasNextPage: normalizedParams.page < totalPages,
          hasPreviousPage: normalizedParams.page > 1
        },
        performance: {
          queryTime: Date.now() - startTime,
          cacheHit: false
        }
      };

      // Cache the result (5 minute TTL for paginated data)
      habitCacheService.set(cacheKey, result, 5 * 60 * 1000);

      return result;

    } catch (error) {
      console.error('Pagination query failed:', error);
      throw error;
    }
  }

  /**
   * Get paginated entries for a specific habit
   */
  async getPaginatedHabitEntries(
    supabaseClient: any,
    userId: string,
    habitId: string,
    params: Partial<PaginationParams> = {}
  ): Promise<PaginatedResult<HabitEntry>> {
    const paramsWithHabitFilter = {
      ...params,
      filters: {
        ...params.filters,
        habitIds: [habitId]
      }
    };

    const result = await this.getPaginatedEntries(
      supabaseClient, 
      userId, 
      paramsWithHabitFilter, 
      false
    );

    return {
      ...result,
      data: result.data.map(entry => {
        const { habit, ...entryData } = entry;
        return entryData as HabitEntry;
      })
    };
  }

  /**
   * Get entries for analytics with optimized pagination
   */
  async getAnalyticsEntries(
    supabaseClient: any,
    userId: string,
    days: number = 30,
    habitIds?: string[]
  ): Promise<HabitEntryWithHabit[]> {
    const cacheKey = `analytics_entries:${userId}:${days}d:${habitIds?.join(',') || 'all'}`;
    
    // Check cache first
    const cachedEntries = habitCacheService.get<HabitEntryWithHabit[]>(cacheKey);
    if (cachedEntries) {
      return cachedEntries;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabaseClient
        .from('habit_entries')
        .select('*, habit:habits(id, name, category, type, color)')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (habitIds?.length) {
        query = query.in('habit_id', habitIds);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch analytics entries: ${error.message}`);
      }

      const entries = data || [];
      
      // Cache for 15 minutes
      habitCacheService.set(cacheKey, entries, 15 * 60 * 1000);

      return entries;

    } catch (error) {
      console.error('Analytics entries query failed:', error);
      throw error;
    }
  }

  /**
   * Get streak calculation data with pagination
   */
  async getStreakCalculationData(
    supabaseClient: any,
    userId: string,
    habitId: string,
    days: number = 365
  ): Promise<HabitEntry[]> {
    const cacheKey = `streak_data:${habitId}:${days}d`;
    
    // Check cache first
    const cachedData = habitCacheService.get<HabitEntry[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabaseClient
        .from('habit_entries')
        .select('date, value, habit_id')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch streak data: ${error.message}`);
      }

      const entries = data || [];
      
      // Cache for 1 hour
      habitCacheService.set(cacheKey, entries, 60 * 60 * 1000);

      return entries;

    } catch (error) {
      console.error('Streak calculation data query failed:', error);
      throw error;
    }
  }

  /**
   * Get recent entries for quick actions
   */
  async getRecentEntries(
    supabaseClient: any,
    userId: string,
    limit: number = 10
  ): Promise<HabitEntryWithHabit[]> {
    const cacheKey = `recent_entries:${userId}:${limit}`;
    
    // Check cache first
    const cachedEntries = habitCacheService.get<HabitEntryWithHabit[]>(cacheKey);
    if (cachedEntries) {
      return cachedEntries;
    }

    try {
      const { data, error } = await supabaseClient
        .from('habit_entries')
        .select('*, habit:habits(id, name, category, type, color)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recent entries: ${error.message}`);
      }

      const entries = data || [];
      
      // Cache for 2 minutes (short TTL for recent data)
      habitCacheService.set(cacheKey, entries, 2 * 60 * 1000);

      return entries;

    } catch (error) {
      console.error('Recent entries query failed:', error);
      throw error;
    }
  }

  /**
   * Invalidate pagination cache for user
   */
  invalidateUserPaginationCache(userId: string): void {
    habitCacheService.invalidateUserCache(userId);
  }

  /**
   * Invalidate pagination cache for specific habit
   */
  invalidateHabitPaginationCache(userId: string, habitId: string): void {
    habitCacheService.invalidateHabitCache(userId, habitId);
  }

  /**
   * Get pagination metadata without fetching data
   */
  async getPaginationMetadata(
    supabaseClient: any,
    userId: string,
    filters?: PaginationParams['filters']
  ): Promise<{
    totalItems: number;
    totalPages: number;
    recommendedPageSize: number;
  }> {
    try {
      let query = supabaseClient
        .from('habit_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Apply filters
      if (filters?.habitIds?.length) {
        query = query.in('habit_id', filters.habitIds);
      }

      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      const { count, error } = await query;

      if (error) {
        throw new Error(`Failed to get pagination metadata: ${error.message}`);
      }

      const totalItems = count || 0;
      
      // Recommend page size based on total items
      let recommendedPageSize = this.DEFAULT_PAGE_SIZE;
      if (totalItems > 1000) {
        recommendedPageSize = 100;
      } else if (totalItems < 100) {
        recommendedPageSize = 25;
      }

      return {
        totalItems,
        totalPages: Math.ceil(totalItems / recommendedPageSize),
        recommendedPageSize
      };

    } catch (error) {
      console.error('Failed to get pagination metadata:', error);
      throw error;
    }
  }
}

export const habitPaginationService = new HabitPaginationService();
export default habitPaginationService;