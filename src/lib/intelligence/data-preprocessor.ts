// Advanced Data Preprocessing and Context Enrichment
// Ensures all data is properly structured and enriched before AI analysis

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

interface EnrichedDataPoint {
  id: string;
  user_id: string;
  domain: 'habits' | 'health' | 'finance' | 'tasks' | 'content';
  type: string;
  value: number | string | boolean;
  metadata: {
    original_data: any;
    enriched_context: any;
    quality_score: number;
    confidence: number;
    tags: string[];
    relationships: string[];
  };
  temporal_context: {
    timestamp: string;
    day_of_week: string;
    hour_of_day: number;
    is_weekend: boolean;
    season: string;
    relative_time: string; // "morning", "afternoon", "evening", "night"
  };
  processed_at: string;
}

interface DataContext {
  user_profile: UserProfile;
  environmental_factors: EnvironmentalFactors;
  behavioral_patterns: BehavioralPattern[];
  data_relationships: DataRelationship[];
}

interface UserProfile {
  preferences: any;
  goals: any[];
  constraints: any[];
  lifestyle_factors: any;
}

interface EnvironmentalFactors {
  time_zone: string;
  typical_schedule: any;
  external_events: any[];
}

interface BehavioralPattern {
  pattern_type: string;
  description: string;
  frequency: string;
  strength: number;
}

interface DataRelationship {
  source_domain: string;
  target_domain: string;
  relationship_type: string;
  strength: number;
  description: string;
}

export class DataPreprocessor {
  private supabase;
  private userId: string;

  constructor(userId: string) {
    this.supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    this.userId = userId;
  }

  // Main preprocessing pipeline
  async preprocessAllData(): Promise<{
    enriched_data: EnrichedDataPoint[];
    context: DataContext;
    processing_summary: any;
  }> {
    console.log('🔄 Starting comprehensive data preprocessing...');

    const startTime = Date.now();

    // Step 1: Gather raw data from all sources
    const rawData = await this.gatherRawData();

    // Step 2: Clean and validate data
    const cleanedData = await this.cleanAndValidateData(rawData);

    // Step 3: Enrich data with context
    const enrichedData = await this.enrichDataWithContext(cleanedData);

    // Step 4: Build comprehensive context
    const context = await this.buildDataContext();

    // Step 5: Establish relationships
    const dataWithRelationships = await this.establishDataRelationships(enrichedData);

    const processingTime = Date.now() - startTime;

    const processingSummary = {
      processing_time_ms: processingTime,
      raw_data_points: rawData.length,
      cleaned_data_points: cleanedData.length,
      enriched_data_points: dataWithRelationships.length,
      quality_score: this.calculateOverallQualityScore(dataWithRelationships),
      completeness_score: this.calculateCompletenessScore(dataWithRelationships),
      processed_at: new Date().toISOString()
    };

    console.log('✅ Data preprocessing completed:', processingSummary);

    return {
      enriched_data: dataWithRelationships,
      context,
      processing_summary: processingSummary
    };
  }

  // Gather raw data from all sources
  private async gatherRawData(): Promise<any[]> {
    const rawData: any[] = [];

    // Habits data
    const { data: habitEntries } = await this.supabase
      .from('habit_entries')
      .select('*, habits(*)')
      .eq('user_id', this.userId)
      .gte('logged_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: false });

    habitEntries?.forEach(entry => {
      rawData.push({
        ...entry,
        domain: 'habits',
        source_table: 'habit_entries'
      });
    });

    // Health metrics
    const { data: healthMetrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['sleep_duration', 'heart_rate_avg', 'heart_rate_min', 'heart_rate_max', 'stress_level', 'steps', 'weight', 'mood'])
      .gte('recorded_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    healthMetrics?.forEach(metric => {
      rawData.push({
        ...metric,
        domain: 'health',
        source_table: 'metrics'
      });
    });

    // Finance data
    const { data: financeMetrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['expense', 'income', 'crypto_value'])
      .gte('recorded_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('recorded_at', { ascending: false });

    financeMetrics?.forEach(metric => {
      rawData.push({
        ...metric,
        domain: 'finance',
        source_table: 'metrics'
      });
    });

    // Tasks data
    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    tasks?.forEach(task => {
      rawData.push({
        ...task,
        domain: 'tasks',
        source_table: 'tasks'
      });
    });

    // Content data
    const { data: content } = await this.supabase
      .from('content_entries')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    content?.forEach(item => {
      rawData.push({
        ...item,
        domain: 'content',
        source_table: 'content_entries'
      });
    });

    return rawData;
  }

  // Clean and validate data
  private async cleanAndValidateData(rawData: any[]): Promise<any[]> {
    const cleanedData: any[] = [];

    for (const dataPoint of rawData) {
      const cleaned = await this.cleanDataPoint(dataPoint);
      if (cleaned && this.validateDataPoint(cleaned)) {
        cleanedData.push(cleaned);
      }
    }

    return cleanedData;
  }

  // Clean individual data point
  private async cleanDataPoint(dataPoint: any): Promise<any | null> {
    try {
      const cleaned = { ...dataPoint };

      // Standardize timestamp field
      cleaned.timestamp = cleaned.logged_at || cleaned.recorded_at || cleaned.created_at || cleaned.completed_at;
      
      if (!cleaned.timestamp) {
        console.warn('Data point missing timestamp:', dataPoint.id);
        return null;
      }

      // Ensure timestamp is valid
      const timestamp = new Date(cleaned.timestamp);
      if (isNaN(timestamp.getTime())) {
        console.warn('Invalid timestamp:', cleaned.timestamp);
        return null;
      }

      // Clean and standardize values based on domain
      switch (cleaned.domain) {
        case 'habits':
          cleaned.value = this.cleanHabitValue(cleaned);
          break;
        case 'health':
          cleaned.value = this.cleanHealthValue(cleaned);
          break;
        case 'finance':
          cleaned.value = this.cleanFinanceValue(cleaned);
          break;
        case 'tasks':
          cleaned.value = this.cleanTaskValue(cleaned);
          break;
        case 'content':
          cleaned.value = this.cleanContentValue(cleaned);
          break;
      }

      // Remove sensitive or unnecessary fields
      delete cleaned.user_id; // Will be added back in enrichment
      
      return cleaned;
    } catch (error) {
      console.error('Error cleaning data point:', error);
      return null;
    }
  }

  // Domain-specific value cleaning
  private cleanHabitValue(dataPoint: any): number {
    // For habits, value represents completion (0-1) or quantity
    if (dataPoint.value !== null && dataPoint.value !== undefined) {
      return Math.max(0, Number(dataPoint.value));
    }
    
    // If no value, assume binary completion
    return 1; // Logged = completed
  }

  private cleanHealthValue(dataPoint: any): number {
    const value = Number(dataPoint.value);
    
    // Apply domain-specific bounds
    switch (dataPoint.type) {
      case 'sleep_duration':
        return Math.max(0, Math.min(24 * 60, value)); // 0-24 hours in minutes
      case 'heart_rate_avg':
      case 'heart_rate_min':
      case 'heart_rate_max':
        return Math.max(30, Math.min(220, value)); // Reasonable heart rate bounds
      case 'stress_level':
        return Math.max(0, Math.min(100, value)); // 0-100 scale
      case 'steps':
        return Math.max(0, Math.min(100000, value)); // Reasonable step count
      case 'weight':
        return Math.max(30, Math.min(300, value)); // Reasonable weight bounds (kg)
      case 'mood':
        return Math.max(1, Math.min(10, value)); // 1-10 mood scale
      default:
        return Math.max(0, value);
    }
  }

  private cleanFinanceValue(dataPoint: any): number {
    const value = Number(dataPoint.value);
    
    switch (dataPoint.type) {
      case 'expense':
        return Math.max(0, value); // Expenses should be positive
      case 'income':
        return Math.max(0, value); // Income should be positive
      case 'crypto_value':
        return Math.max(0, value); // Crypto value should be positive
      default:
        return value;
    }
  }

  private cleanTaskValue(dataPoint: any): number {
    // For tasks, create a completion score
    switch (dataPoint.status) {
      case 'completed':
        return 1;
      case 'in_progress':
        return 0.5;
      case 'todo':
        return 0;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  }

  private cleanContentValue(dataPoint: any): number {
    // For content, use rating or progress
    if (dataPoint.rating) {
      return Number(dataPoint.rating);
    }
    
    // Convert progress to numeric value
    if (dataPoint.progress) {
      const progress = dataPoint.progress.toLowerCase();
      if (progress.includes('completed') || progress.includes('finished')) return 1;
      if (progress.includes('watching') || progress.includes('reading')) return 0.5;
      if (progress.includes('planned') || progress.includes('want')) return 0;
    }
    
    return 0;
  }

  // Validate data point
  private validateDataPoint(dataPoint: any): boolean {
    // Basic validation
    if (!dataPoint.id || !dataPoint.domain || !dataPoint.timestamp) {
      return false;
    }

    // Check if timestamp is within reasonable bounds (not too old or future)
    const timestamp = new Date(dataPoint.timestamp);
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const oneWeekFuture = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (timestamp < oneYearAgo || timestamp > oneWeekFuture) {
      console.warn('Timestamp out of reasonable bounds:', dataPoint.timestamp);
      return false;
    }

    // Domain-specific validation
    switch (dataPoint.domain) {
      case 'habits':
        return this.validateHabitData(dataPoint);
      case 'health':
        return this.validateHealthData(dataPoint);
      case 'finance':
        return this.validateFinanceData(dataPoint);
      case 'tasks':
        return this.validateTaskData(dataPoint);
      case 'content':
        return this.validateContentData(dataPoint);
      default:
        return false;
    }
  }

  private validateHabitData(dataPoint: any): boolean {
    return dataPoint.habit_id && typeof dataPoint.value === 'number' && dataPoint.value >= 0;
  }

  private validateHealthData(dataPoint: any): boolean {
    return dataPoint.type && typeof dataPoint.value === 'number' && !isNaN(dataPoint.value);
  }

  private validateFinanceData(dataPoint: any): boolean {
    return dataPoint.type && typeof dataPoint.value === 'number' && dataPoint.value >= 0;
  }

  private validateTaskData(dataPoint: any): boolean {
    return dataPoint.title && dataPoint.status && typeof dataPoint.value === 'number';
  }

  private validateContentData(dataPoint: any): boolean {
    return dataPoint.title && dataPoint.type && typeof dataPoint.value === 'number';
  }

  // Enrich data with context
  private async enrichDataWithContext(cleanedData: any[]): Promise<EnrichedDataPoint[]> {
    const enrichedData: EnrichedDataPoint[] = [];

    for (const dataPoint of cleanedData) {
      const enriched = await this.enrichSingleDataPoint(dataPoint);
      enrichedData.push(enriched);
    }

    return enrichedData;
  }

  // Enrich single data point
  private async enrichSingleDataPoint(dataPoint: any): Promise<EnrichedDataPoint> {
    const timestamp = new Date(dataPoint.timestamp);
    
    // Generate temporal context
    const temporalContext = {
      timestamp: dataPoint.timestamp,
      day_of_week: timestamp.toLocaleDateString('en-US', { weekday: 'long' }),
      hour_of_day: timestamp.getHours(),
      is_weekend: timestamp.getDay() === 0 || timestamp.getDay() === 6,
      season: this.getSeason(timestamp),
      relative_time: this.getRelativeTime(timestamp.getHours())
    };

    // Generate contextual tags
    const tags = await this.generateContextualTags(dataPoint, temporalContext);

    // Calculate quality score
    const qualityScore = this.calculateDataPointQuality(dataPoint);

    // Generate enriched context
    const enrichedContext = await this.generateEnrichedContext(dataPoint, temporalContext);

    return {
      id: dataPoint.id,
      user_id: this.userId,
      domain: dataPoint.domain,
      type: dataPoint.type || dataPoint.domain,
      value: dataPoint.value,
      metadata: {
        original_data: dataPoint,
        enriched_context: enrichedContext,
        quality_score: qualityScore,
        confidence: this.calculateConfidence(dataPoint, qualityScore),
        tags,
        relationships: [] // Will be populated later
      },
      temporal_context: temporalContext,
      processed_at: new Date().toISOString()
    };
  }

  // Generate contextual tags
  private async generateContextualTags(dataPoint: any, temporalContext: any): Promise<string[]> {
    const tags: string[] = [];

    // Temporal tags
    tags.push(temporalContext.day_of_week.toLowerCase());
    tags.push(temporalContext.relative_time);
    if (temporalContext.is_weekend) tags.push('weekend');
    tags.push(temporalContext.season);

    // Domain-specific tags
    switch (dataPoint.domain) {
      case 'habits':
        tags.push('habit');
        if (dataPoint.habits?.category) tags.push(dataPoint.habits.category.toLowerCase());
        if (dataPoint.habits?.type) tags.push(dataPoint.habits.type);
        if (dataPoint.value >= 1) tags.push('completed');
        break;

      case 'health':
        tags.push('health');
        tags.push(dataPoint.type);
        if (dataPoint.type === 'sleep_duration') {
          if (dataPoint.value >= 7 * 60) tags.push('good_sleep');
          if (dataPoint.value < 6 * 60) tags.push('poor_sleep');
        }
        if (dataPoint.type === 'stress_level') {
          if (dataPoint.value <= 30) tags.push('low_stress');
          if (dataPoint.value >= 70) tags.push('high_stress');
        }
        break;

      case 'finance':
        tags.push('finance');
        tags.push(dataPoint.type);
        if (dataPoint.category) tags.push(dataPoint.category.toLowerCase().replace(/\s+/g, '_'));
        if (dataPoint.value > 1000) tags.push('large_amount');
        break;

      case 'tasks':
        tags.push('task');
        if (dataPoint.category) tags.push(dataPoint.category.toLowerCase());
        if (dataPoint.priority) tags.push(dataPoint.priority + '_priority');
        tags.push(dataPoint.status);
        break;

      case 'content':
        tags.push('content');
        tags.push(dataPoint.type);
        if (dataPoint.genre) {
          dataPoint.genre.forEach((g: string) => tags.push(g.toLowerCase()));
        }
        if (dataPoint.rating >= 8) tags.push('highly_rated');
        break;
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  // Generate enriched context
  private async generateEnrichedContext(dataPoint: any, temporalContext: any): Promise<any> {
    const context: any = {
      temporal_patterns: {},
      behavioral_context: {},
      environmental_factors: {}
    };

    // Add temporal patterns
    context.temporal_patterns = {
      is_routine_time: await this.isRoutineTime(dataPoint.domain, temporalContext.hour_of_day),
      day_type: temporalContext.is_weekend ? 'weekend' : 'weekday',
      time_of_day_category: temporalContext.relative_time
    };

    // Add behavioral context
    context.behavioral_context = {
      frequency_score: await this.calculateFrequencyScore(dataPoint),
      consistency_score: await this.calculateConsistencyScore(dataPoint),
      trend_direction: await this.calculateTrendDirection(dataPoint)
    };

    // Add environmental factors
    context.environmental_factors = {
      season_impact: this.getSeasonalImpact(dataPoint.domain, temporalContext.season),
      day_of_week_impact: this.getDayOfWeekImpact(dataPoint.domain, temporalContext.day_of_week)
    };

    return context;
  }

  // Helper methods for context enrichment
  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private getRelativeTime(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  private calculateDataPointQuality(dataPoint: any): number {
    let score = 0.5; // Base score

    // Check for completeness
    if (dataPoint.value !== null && dataPoint.value !== undefined) score += 0.2;
    if (dataPoint.timestamp) score += 0.1;
    
    // Domain-specific quality checks
    switch (dataPoint.domain) {
      case 'habits':
        if (dataPoint.habits?.name) score += 0.1;
        if (dataPoint.habits?.category) score += 0.1;
        break;
      case 'health':
        if (dataPoint.type) score += 0.1;
        if (dataPoint.unit) score += 0.1;
        break;
      case 'finance':
        if (dataPoint.category) score += 0.1;
        if (dataPoint.metadata?.description) score += 0.1;
        break;
      case 'tasks':
        if (dataPoint.category) score += 0.1;
        if (dataPoint.priority) score += 0.1;
        break;
      case 'content':
        if (dataPoint.genre && dataPoint.genre.length > 0) score += 0.1;
        if (dataPoint.rating) score += 0.1;
        break;
    }

    return Math.min(1, score);
  }

  private calculateConfidence(dataPoint: any, qualityScore: number): number {
    // Base confidence on quality score and data recency
    const age = Date.now() - new Date(dataPoint.timestamp).getTime();
    const daysSinceCreated = age / (1000 * 60 * 60 * 24);
    
    const recencyScore = Math.max(0, 1 - daysSinceCreated / 30); // Decreases over 30 days
    
    return (qualityScore + recencyScore) / 2;
  }

  // Build comprehensive data context
  private async buildDataContext(): Promise<DataContext> {
    const userProfile = await this.buildUserProfile();
    const environmentalFactors = await this.buildEnvironmentalFactors();
    const behavioralPatterns = await this.detectBehavioralPatterns();
    const dataRelationships = await this.identifyDataRelationships();

    return {
      user_profile: userProfile,
      environmental_factors: environmentalFactors,
      behavioral_patterns: behavioralPatterns,
      data_relationships: dataRelationships
    };
  }

  private async buildUserProfile(): Promise<UserProfile> {
    // Get user preferences and settings
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', this.userId)
      .single();

    // Get user goals
    const { data: goals } = await this.supabase
      .from('goals')
      .select('*')
      .eq('user_id', this.userId);

    return {
      preferences: profile?.settings || {},
      goals: goals || [],
      constraints: [], // Could be derived from data patterns
      lifestyle_factors: this.inferLifestyleFactors()
    };
  }

  private async buildEnvironmentalFactors(): Promise<EnvironmentalFactors> {
    return {
      time_zone: 'UTC', // Could be inferred from user data
      typical_schedule: await this.inferTypicalSchedule(),
      external_events: [] // Could include holidays, weather, etc.
    };
  }

  private async detectBehavioralPatterns(): Promise<BehavioralPattern[]> {
    // This would analyze historical data to detect patterns
    // For now, return empty array - could be enhanced with ML
    return [];
  }

  private async identifyDataRelationships(): Promise<DataRelationship[]> {
    // This would identify relationships between different data domains
    // For now, return common relationships
    return [
      {
        source_domain: 'health',
        target_domain: 'habits',
        relationship_type: 'influences',
        strength: 0.7,
        description: 'Sleep quality influences habit completion'
      },
      {
        source_domain: 'finance',
        target_domain: 'health',
        relationship_type: 'correlates',
        strength: 0.5,
        description: 'Spending patterns correlate with stress levels'
      }
    ];
  }

  // Establish relationships between data points
  private async establishDataRelationships(enrichedData: EnrichedDataPoint[]): Promise<EnrichedDataPoint[]> {
    // For each data point, find related data points
    for (const dataPoint of enrichedData) {
      const relationships = await this.findRelatedDataPoints(dataPoint, enrichedData);
      dataPoint.metadata.relationships = relationships;
    }

    return enrichedData;
  }

  private async findRelatedDataPoints(dataPoint: EnrichedDataPoint, allData: EnrichedDataPoint[]): Promise<string[]> {
    const relationships: string[] = [];
    const timestamp = new Date(dataPoint.temporal_context.timestamp);
    
    // Find data points from the same day
    const sameDay = allData.filter(d => {
      const dTimestamp = new Date(d.temporal_context.timestamp);
      return dTimestamp.toDateString() === timestamp.toDateString() && d.id !== dataPoint.id;
    });

    // Add relationships based on temporal proximity and domain interactions
    sameDay.forEach(related => {
      if (this.areDomainsRelated(dataPoint.domain, related.domain)) {
        relationships.push(related.id);
      }
    });

    return relationships;
  }

  private areDomainsRelated(domain1: string, domain2: string): boolean {
    const relatedPairs = [
      ['health', 'habits'],
      ['health', 'finance'],
      ['habits', 'tasks'],
      ['finance', 'tasks']
    ];

    return relatedPairs.some(pair => 
      (pair[0] === domain1 && pair[1] === domain2) ||
      (pair[0] === domain2 && pair[1] === domain1)
    );
  }

  // Helper methods for context building
  private inferLifestyleFactors(): any {
    // This would analyze data to infer lifestyle factors
    return {
      activity_level: 'moderate',
      sleep_pattern: 'regular',
      work_schedule: 'flexible'
    };
  }

  private async inferTypicalSchedule(): Promise<any> {
    // Analyze historical data to infer typical daily schedule
    return {
      wake_time: '07:00',
      sleep_time: '23:00',
      work_hours: '09:00-17:00',
      meal_times: ['08:00', '13:00', '19:00']
    };
  }

  private async isRoutineTime(domain: string, hour: number): Promise<boolean> {
    // Check if this hour is typical for this domain based on historical data
    // For now, return simple heuristics
    switch (domain) {
      case 'habits':
        return hour >= 6 && hour <= 22; // Most habits during waking hours
      case 'health':
        return true; // Health metrics can be recorded anytime
      case 'finance':
        return hour >= 8 && hour <= 20; // Business hours for transactions
      case 'tasks':
        return hour >= 8 && hour <= 18; // Work hours for tasks
      case 'content':
        return hour >= 18 || hour <= 2; // Evening/night for entertainment
      default:
        return true;
    }
  }

  private async calculateFrequencyScore(dataPoint: any): Promise<number> {
    // Calculate how frequently this type of data is recorded
    // Higher score = more frequent recording
    return 0.5; // Placeholder
  }

  private async calculateConsistencyScore(dataPoint: any): Promise<number> {
    // Calculate consistency of this data type over time
    return 0.5; // Placeholder
  }

  private async calculateTrendDirection(dataPoint: any): Promise<string> {
    // Calculate if this metric is trending up, down, or stable
    return 'stable'; // Placeholder
  }

  private getSeasonalImpact(domain: string, season: string): string {
    // Return how season might impact this domain
    const impacts: Record<string, Record<string, string>> = {
      health: {
        winter: 'lower_activity',
        spring: 'increased_energy',
        summer: 'higher_activity',
        autumn: 'routine_changes'
      },
      habits: {
        winter: 'indoor_focus',
        spring: 'renewal_motivation',
        summer: 'outdoor_activities',
        autumn: 'preparation_mode'
      }
    };

    return impacts[domain]?.[season] || 'neutral';
  }

  private getDayOfWeekImpact(domain: string, dayOfWeek: string): string {
    // Return how day of week might impact this domain
    const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
    
    switch (domain) {
      case 'tasks':
        return isWeekend ? 'reduced_activity' : 'high_activity';
      case 'habits':
        return isWeekend ? 'flexible_schedule' : 'routine_schedule';
      case 'finance':
        return isWeekend ? 'leisure_spending' : 'routine_spending';
      default:
        return 'neutral';
    }
  }

  // Quality calculation methods
  private calculateOverallQualityScore(enrichedData: EnrichedDataPoint[]): number {
    if (enrichedData.length === 0) return 0;
    
    const totalQuality = enrichedData.reduce((sum, d) => sum + d.metadata.quality_score, 0);
    return totalQuality / enrichedData.length;
  }

  private calculateCompletenessScore(enrichedData: EnrichedDataPoint[]): number {
    const domains = ['habits', 'health', 'finance', 'tasks', 'content'];
    const availableDomains = [...new Set(enrichedData.map(d => d.domain))];
    
    return availableDomains.length / domains.length;
  }
}

// Export utility functions
export async function preprocessUserData(userId: string) {
  const preprocessor = new DataPreprocessor(userId);
  return await preprocessor.preprocessAllData();
}

export async function getEnrichedDataContext(userId: string) {
  const preprocessor = new DataPreprocessor(userId);
  const result = await preprocessor.preprocessAllData();
  
  return {
    enriched_data: result.enriched_data,
    context: result.context,
    summary: result.processing_summary
  };
}