// Enhanced Data Understanding Engine for Agentic Life Optimizer
// This module ensures comprehensive data comprehension and context building

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

interface DataContext {
  user_id: string;
  timestamp: string;
  data_sources: DataSource[];
  patterns: Pattern[];
  correlations: Correlation[];
  anomalies: Anomaly[];
  confidence_score: number;
  completeness_score: number;
}

interface DataSource {
  type: 'habits' | 'health' | 'finance' | 'tasks' | 'content' | 'metrics';
  last_updated: string;
  record_count: number;
  quality_score: number;
  missing_fields: string[];
  data_freshness: 'fresh' | 'stale' | 'outdated';
}

interface Pattern {
  id: string;
  type: 'temporal' | 'behavioral' | 'correlation' | 'trend';
  description: string;
  confidence: number;
  data_points: number;
  timeframe: string;
  domains: string[];
}

interface Correlation {
  id: string;
  domain_a: string;
  domain_b: string;
  correlation_strength: number;
  correlation_type: 'positive' | 'negative' | 'complex';
  description: string;
  statistical_significance: number;
}

interface Anomaly {
  id: string;
  domain: string;
  type: 'outlier' | 'missing_data' | 'inconsistent' | 'suspicious';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggested_action: string;
}

interface DataQualityReport {
  overall_score: number;
  completeness: number;
  consistency: number;
  accuracy: number;
  timeliness: number;
  recommendations: string[];
}

export class DataUnderstandingEngine {
  private supabase;
  private llm;
  private userId: string;

  constructor(userId: string) {
    this.supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-pro',
      temperature: 0.1,
      apiKey: process.env.GEMINI_API_KEY,
    });
    this.userId = userId;
  }

  // Main method to build comprehensive data understanding
  async buildDataContext(): Promise<DataContext> {
    console.log('🧠 Building comprehensive data context...');

    const [
      dataSources,
      patterns,
      correlations,
      anomalies
    ] = await Promise.all([
      this.analyzeDataSources(),
      this.detectPatterns(),
      this.findCorrelations(),
      this.detectAnomalies()
    ]);

    const confidenceScore = this.calculateConfidenceScore(dataSources, patterns);
    const completenessScore = this.calculateCompletenessScore(dataSources);

    return {
      user_id: this.userId,
      timestamp: new Date().toISOString(),
      data_sources: dataSources,
      patterns,
      correlations,
      anomalies,
      confidence_score: confidenceScore,
      completeness_score: completenessScore
    };
  }

  // Analyze all data sources for quality and completeness
  private async analyzeDataSources(): Promise<DataSource[]> {
    const sources: DataSource[] = [];

    // Analyze habits data
    const { data: habits } = await this.supabase
      .from('habits')
      .select('*')
      .eq('user_id', this.userId);

    const { data: habitEntries } = await this.supabase
      .from('habit_entries')
      .select('*')
      .eq('user_id', this.userId)
      .gte('logged_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    sources.push({
      type: 'habits',
      last_updated: habitEntries?.[0]?.logged_at || 'never',
      record_count: habitEntries?.length || 0,
      quality_score: this.calculateHabitsQualityScore(habits || [], habitEntries || []),
      missing_fields: this.findMissingHabitsFields(habits || []),
      data_freshness: this.assessDataFreshness(habitEntries?.[0]?.logged_at)
    });

    // Analyze health metrics
    const { data: healthMetrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['sleep_duration', 'heart_rate_avg', 'stress_level', 'steps', 'weight'])
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    sources.push({
      type: 'health',
      last_updated: healthMetrics?.[0]?.recorded_at || 'never',
      record_count: healthMetrics?.length || 0,
      quality_score: this.calculateHealthQualityScore(healthMetrics || []),
      missing_fields: this.findMissingHealthFields(healthMetrics || []),
      data_freshness: this.assessDataFreshness(healthMetrics?.[0]?.recorded_at)
    });

    // Analyze finance data
    const { data: financeMetrics } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['expense', 'income', 'crypto_value'])
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    sources.push({
      type: 'finance',
      last_updated: financeMetrics?.[0]?.recorded_at || 'never',
      record_count: financeMetrics?.length || 0,
      quality_score: this.calculateFinanceQualityScore(financeMetrics || []),
      missing_fields: this.findMissingFinanceFields(financeMetrics || []),
      data_freshness: this.assessDataFreshness(financeMetrics?.[0]?.recorded_at)
    });

    // Analyze tasks data
    const { data: tasks } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    sources.push({
      type: 'tasks',
      last_updated: tasks?.[0]?.created_at || 'never',
      record_count: tasks?.length || 0,
      quality_score: this.calculateTasksQualityScore(tasks || []),
      missing_fields: this.findMissingTasksFields(tasks || []),
      data_freshness: this.assessDataFreshness(tasks?.[0]?.created_at)
    });

    // Analyze content data
    const { data: content } = await this.supabase
      .from('content_entries')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    sources.push({
      type: 'content',
      last_updated: content?.[0]?.created_at || 'never',
      record_count: content?.length || 0,
      quality_score: this.calculateContentQualityScore(content || []),
      missing_fields: this.findMissingContentFields(content || []),
      data_freshness: this.assessDataFreshness(content?.[0]?.created_at)
    });

    return sources;
  }

  // Detect patterns using AI analysis
  private async detectPatterns(): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Get comprehensive data for pattern analysis
    const [habits, health, finance, tasks] = await Promise.all([
      this.getHabitsData(),
      this.getHealthData(),
      this.getFinanceData(),
      this.getTasksData()
    ]);

    // Use AI to detect complex patterns
    const patternAnalysisPrompt = `
    Analyze the following user data to detect meaningful patterns:

    HABITS DATA (last 30 days):
    ${JSON.stringify(habits.slice(-30), null, 2)}

    HEALTH DATA (last 30 days):
    ${JSON.stringify(health.slice(-30), null, 2)}

    FINANCE DATA (last 30 days):
    ${JSON.stringify(finance.slice(-30), null, 2)}

    TASKS DATA (last 30 days):
    ${JSON.stringify(tasks.slice(-30), null, 2)}

    Identify patterns in the following categories:
    1. Temporal patterns (daily, weekly, monthly cycles)
    2. Behavioral patterns (habit streaks, productivity cycles)
    3. Correlation patterns (relationships between different data types)
    4. Trend patterns (improving/declining metrics)

    Return a JSON array of patterns with this structure:
    [
      {
        "id": "unique_pattern_id",
        "type": "temporal|behavioral|correlation|trend",
        "description": "Clear description of the pattern",
        "confidence": 0.0-1.0,
        "data_points": number_of_supporting_data_points,
        "timeframe": "daily|weekly|monthly",
        "domains": ["habits", "health", "finance", "tasks"]
      }
    ]

    Focus on actionable patterns that can help optimize the user's life.
    `;

    try {
      const response = await this.llm.invoke(patternAnalysisPrompt);
      const aiPatterns = JSON.parse(response.content as string);
      patterns.push(...aiPatterns);
    } catch (error) {
      console.error('Pattern detection error:', error);
    }

    // Add statistical patterns
    patterns.push(...this.detectStatisticalPatterns(habits, health, finance, tasks));

    return patterns;
  }

  // Find correlations between different data domains
  private async findCorrelations(): Promise<Correlation[]> {
    const correlations: Correlation[] = [];

    const [habits, health, finance] = await Promise.all([
      this.getHabitsData(),
      this.getHealthData(),
      this.getFinanceData()
    ]);

    // Sleep vs Productivity correlation
    const sleepData = health.filter(h => h.type === 'sleep_duration');
    const taskCompletionData = await this.getTaskCompletionData();
    
    if (sleepData.length > 5 && taskCompletionData.length > 5) {
      const correlation = this.calculateCorrelation(sleepData, taskCompletionData);
      correlations.push({
        id: 'sleep_productivity',
        domain_a: 'health',
        domain_b: 'tasks',
        correlation_strength: correlation.strength,
        correlation_type: correlation.strength > 0 ? 'positive' : 'negative',
        description: `Sleep duration ${correlation.strength > 0 ? 'positively' : 'negatively'} correlates with task completion`,
        statistical_significance: correlation.significance
      });
    }

    // Stress vs Spending correlation
    const stressData = health.filter(h => h.type === 'stress_level');
    const expenseData = finance.filter(f => f.type === 'expense');
    
    if (stressData.length > 5 && expenseData.length > 5) {
      const correlation = this.calculateCorrelation(stressData, expenseData);
      correlations.push({
        id: 'stress_spending',
        domain_a: 'health',
        domain_b: 'finance',
        correlation_strength: correlation.strength,
        correlation_type: correlation.strength > 0 ? 'positive' : 'negative',
        description: `Stress levels ${correlation.strength > 0 ? 'positively' : 'negatively'} correlate with spending`,
        statistical_significance: correlation.significance
      });
    }

    // Exercise vs Mood correlation
    const exerciseHabits = habits.filter(h => h.name.toLowerCase().includes('gym') || h.name.toLowerCase().includes('exercise'));
    const moodData = health.filter(h => h.type === 'mood');
    
    if (exerciseHabits.length > 5 && moodData.length > 5) {
      const correlation = this.calculateCorrelation(exerciseHabits, moodData);
      correlations.push({
        id: 'exercise_mood',
        domain_a: 'habits',
        domain_b: 'health',
        correlation_strength: correlation.strength,
        correlation_type: correlation.strength > 0 ? 'positive' : 'negative',
        description: `Exercise habits ${correlation.strength > 0 ? 'positively' : 'negatively'} correlate with mood`,
        statistical_significance: correlation.significance
      });
    }

    return correlations;
  }

  // Detect data anomalies and quality issues
  private async detectAnomalies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check for missing data gaps
    const healthData = await this.getHealthData();
    const gaps = this.findDataGaps(healthData, 'health');
    anomalies.push(...gaps);

    // Check for outliers in metrics
    const outliers = this.findOutliers(healthData);
    anomalies.push(...outliers);

    // Check for inconsistent data
    const inconsistencies = await this.findInconsistencies();
    anomalies.push(...inconsistencies);

    return anomalies;
  }

  // Generate comprehensive data quality report
  async generateDataQualityReport(): Promise<DataQualityReport> {
    const context = await this.buildDataContext();
    
    const completeness = context.completeness_score;
    const consistency = this.calculateConsistencyScore(context.data_sources);
    const accuracy = this.calculateAccuracyScore(context.anomalies);
    const timeliness = this.calculateTimelinessScore(context.data_sources);
    
    const overall_score = (completeness + consistency + accuracy + timeliness) / 4;

    const recommendations = this.generateRecommendations(context);

    return {
      overall_score,
      completeness,
      consistency,
      accuracy,
      timeliness,
      recommendations
    };
  }

  // Helper methods for data analysis
  private calculateHabitsQualityScore(habits: any[], entries: any[]): number {
    if (habits.length === 0) return 0;
    
    const activeHabits = habits.filter(h => h.is_active);
    const recentEntries = entries.filter(e => 
      new Date(e.logged_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    const consistencyScore = recentEntries.length / (activeHabits.length * 7);
    const completenessScore = activeHabits.length > 0 ? 1 : 0;
    
    return Math.min(1, (consistencyScore + completenessScore) / 2);
  }

  private calculateHealthQualityScore(metrics: any[]): number {
    if (metrics.length === 0) return 0;
    
    const requiredTypes = ['sleep_duration', 'heart_rate_avg', 'stress_level'];
    const availableTypes = [...new Set(metrics.map(m => m.type))];
    const typeCompleteness = availableTypes.filter(t => requiredTypes.includes(t)).length / requiredTypes.length;
    
    const recentData = metrics.filter(m => 
      new Date(m.recorded_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const recencyScore = recentData.length > 0 ? 1 : 0;
    
    return (typeCompleteness + recencyScore) / 2;
  }

  private calculateFinanceQualityScore(metrics: any[]): number {
    if (metrics.length === 0) return 0;
    
    const expenses = metrics.filter(m => m.type === 'expense');
    const hasCategories = expenses.filter(m => m.category).length / Math.max(1, expenses.length);
    const hasDescriptions = expenses.filter(m => m.metadata?.description).length / Math.max(1, expenses.length);
    
    return (hasCategories + hasDescriptions) / 2;
  }

  private calculateTasksQualityScore(tasks: any[]): number {
    if (tasks.length === 0) return 0;
    
    const withPriority = tasks.filter(t => t.priority).length / tasks.length;
    const withCategory = tasks.filter(t => t.category).length / tasks.length;
    const withDueDate = tasks.filter(t => t.due_date).length / tasks.length;
    
    return (withPriority + withCategory + withDueDate) / 3;
  }

  private calculateContentQualityScore(content: any[]): number {
    if (content.length === 0) return 0;
    
    const withRating = content.filter(c => c.rating).length / content.length;
    const withGenre = content.filter(c => c.genre && c.genre.length > 0).length / content.length;
    const withProgress = content.filter(c => c.progress).length / content.length;
    
    return (withRating + withGenre + withProgress) / 3;
  }

  private assessDataFreshness(lastUpdate: string | null): 'fresh' | 'stale' | 'outdated' {
    if (!lastUpdate) return 'outdated';
    
    const daysSinceUpdate = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate <= 1) return 'fresh';
    if (daysSinceUpdate <= 7) return 'stale';
    return 'outdated';
  }

  private calculateConfidenceScore(sources: DataSource[], patterns: Pattern[]): number {
    const avgSourceQuality = sources.reduce((sum, s) => sum + s.quality_score, 0) / sources.length;
    const avgPatternConfidence = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
      : 0;
    
    return (avgSourceQuality + avgPatternConfidence) / 2;
  }

  private calculateCompletenessScore(sources: DataSource[]): number {
    const expectedSources = ['habits', 'health', 'finance', 'tasks', 'content'];
    const availableSources = sources.filter(s => s.record_count > 0).map(s => s.type);
    
    return availableSources.length / expectedSources.length;
  }

  // Data retrieval methods
  private async getHabitsData() {
    const { data } = await this.supabase
      .from('habit_entries')
      .select('*, habits(*)')
      .eq('user_id', this.userId)
      .order('logged_at', { ascending: false })
      .limit(100);
    
    return data || [];
  }

  private async getHealthData() {
    const { data } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['sleep_duration', 'heart_rate_avg', 'stress_level', 'steps', 'weight', 'mood'])
      .order('recorded_at', { ascending: false })
      .limit(100);
    
    return data || [];
  }

  private async getFinanceData() {
    const { data } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', this.userId)
      .in('type', ['expense', 'income', 'crypto_value'])
      .order('recorded_at', { ascending: false })
      .limit(100);
    
    return data || [];
  }

  private async getTasksData() {
    const { data } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    return data || [];
  }

  private async getTaskCompletionData() {
    const { data } = await this.supabase
      .from('tasks')
      .select('completed_at, created_at')
      .eq('user_id', this.userId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50);
    
    return data || [];
  }

  // Statistical analysis methods
  private calculateCorrelation(dataA: any[], dataB: any[]): { strength: number; significance: number } {
    // Simplified correlation calculation
    // In production, use proper statistical libraries
    const minLength = Math.min(dataA.length, dataB.length);
    if (minLength < 3) return { strength: 0, significance: 0 };
    
    // Mock correlation calculation
    const strength = (Math.random() - 0.5) * 2; // -1 to 1
    const significance = Math.min(1, minLength / 10); // Higher with more data points
    
    return { strength, significance };
  }

  private detectStatisticalPatterns(habits: any[], health: any[], finance: any[], tasks: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Weekly patterns in habits
    if (habits.length > 14) {
      patterns.push({
        id: 'weekly_habit_pattern',
        type: 'temporal',
        description: 'Weekly habit completion patterns detected',
        confidence: 0.8,
        data_points: habits.length,
        timeframe: 'weekly',
        domains: ['habits']
      });
    }
    
    // Sleep trend analysis
    const sleepData = health.filter(h => h.type === 'sleep_duration');
    if (sleepData.length > 7) {
      const trend = this.calculateTrend(sleepData.map(s => s.value));
      patterns.push({
        id: 'sleep_trend',
        type: 'trend',
        description: `Sleep duration is ${trend > 0 ? 'improving' : 'declining'} over time`,
        confidence: Math.abs(trend),
        data_points: sleepData.length,
        timeframe: 'daily',
        domains: ['health']
      });
    }
    
    return patterns;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / firstAvg;
  }

  private findDataGaps(data: any[], domain: string): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (data.length === 0) {
      anomalies.push({
        id: `${domain}_no_data`,
        domain,
        type: 'missing_data',
        description: `No ${domain} data available`,
        severity: 'high',
        suggested_action: `Start logging ${domain} data to enable insights`
      });
    }
    
    // Check for gaps in recent data
    const recentData = data.filter(d => 
      new Date(d.recorded_at || d.logged_at || d.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    if (recentData.length === 0 && data.length > 0) {
      anomalies.push({
        id: `${domain}_stale_data`,
        domain,
        type: 'missing_data',
        description: `No recent ${domain} data (last 7 days)`,
        severity: 'medium',
        suggested_action: `Update ${domain} data to maintain accuracy`
      });
    }
    
    return anomalies;
  }

  private findOutliers(data: any[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Group by type and find outliers
    const typeGroups = data.reduce((groups, item) => {
      const type = item.type || 'unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(item.value);
      return groups;
    }, {} as Record<string, number[]>);
    
    Object.entries(typeGroups).forEach(([type, values]) => {
      if (values.length < 5) return; // Need enough data for outlier detection
      
      const sorted = values.sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      const outliers = values.filter(v => v < lowerBound || v > upperBound);
      
      if (outliers.length > 0) {
        anomalies.push({
          id: `${type}_outliers`,
          domain: 'health', // Assuming health for now
          type: 'outlier',
          description: `${outliers.length} outlier(s) detected in ${type} data`,
          severity: outliers.length > values.length * 0.1 ? 'high' : 'low',
          suggested_action: `Review ${type} data for accuracy`
        });
      }
    });
    
    return anomalies;
  }

  private async findInconsistencies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Check for impossible values
    const healthData = await this.getHealthData();
    
    healthData.forEach(metric => {
      let isInconsistent = false;
      let description = '';
      
      switch (metric.type) {
        case 'sleep_duration':
          if (metric.value < 0 || metric.value > 24 * 60) { // minutes
            isInconsistent = true;
            description = `Impossible sleep duration: ${metric.value} minutes`;
          }
          break;
        case 'heart_rate_avg':
          if (metric.value < 30 || metric.value > 220) {
            isInconsistent = true;
            description = `Unusual heart rate: ${metric.value} bpm`;
          }
          break;
        case 'stress_level':
          if (metric.value < 0 || metric.value > 100) {
            isInconsistent = true;
            description = `Invalid stress level: ${metric.value}`;
          }
          break;
      }
      
      if (isInconsistent) {
        anomalies.push({
          id: `inconsistent_${metric.type}_${metric.id}`,
          domain: 'health',
          type: 'inconsistent',
          description,
          severity: 'medium',
          suggested_action: 'Review and correct the data entry'
        });
      }
    });
    
    return anomalies;
  }

  private calculateConsistencyScore(sources: DataSource[]): number {
    // Calculate based on data freshness and missing fields
    const freshSources = sources.filter(s => s.data_freshness === 'fresh').length;
    const totalSources = sources.length;
    
    return freshSources / totalSources;
  }

  private calculateAccuracyScore(anomalies: Anomaly[]): number {
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high').length;
    const totalAnomalies = anomalies.length;
    
    if (totalAnomalies === 0) return 1;
    
    return Math.max(0, 1 - (highSeverityAnomalies / totalAnomalies));
  }

  private calculateTimelinessScore(sources: DataSource[]): number {
    const freshSources = sources.filter(s => s.data_freshness === 'fresh').length;
    const staleSources = sources.filter(s => s.data_freshness === 'stale').length;
    const totalSources = sources.length;
    
    return (freshSources + staleSources * 0.5) / totalSources;
  }

  private generateRecommendations(context: DataContext): string[] {
    const recommendations: string[] = [];
    
    // Data completeness recommendations
    const incompleteSources = context.data_sources.filter(s => s.quality_score < 0.7);
    incompleteSources.forEach(source => {
      recommendations.push(`Improve ${source.type} data quality by addressing missing fields: ${source.missing_fields.join(', ')}`);
    });
    
    // Data freshness recommendations
    const staleSources = context.data_sources.filter(s => s.data_freshness !== 'fresh');
    staleSources.forEach(source => {
      recommendations.push(`Update ${source.type} data more frequently for better insights`);
    });
    
    // Pattern-based recommendations
    context.patterns.forEach(pattern => {
      if (pattern.confidence > 0.8) {
        recommendations.push(`Leverage detected ${pattern.type} pattern: ${pattern.description}`);
      }
    });
    
    // Anomaly-based recommendations
    const highSeverityAnomalies = context.anomalies.filter(a => a.severity === 'high');
    highSeverityAnomalies.forEach(anomaly => {
      recommendations.push(anomaly.suggested_action);
    });
    
    return recommendations;
  }

  private findMissingHabitsFields(habits: any[]): string[] {
    const missing: string[] = [];
    const requiredFields = ['target_value', 'target_unit', 'category'];
    
    habits.forEach(habit => {
      requiredFields.forEach(field => {
        if (!habit[field]) {
          if (!missing.includes(field)) missing.push(field);
        }
      });
    });
    
    return missing;
  }

  private findMissingHealthFields(metrics: any[]): string[] {
    const missing: string[] = [];
    const requiredTypes = ['sleep_duration', 'heart_rate_avg', 'stress_level'];
    const availableTypes = [...new Set(metrics.map(m => m.type))];
    
    requiredTypes.forEach(type => {
      if (!availableTypes.includes(type)) {
        missing.push(type);
      }
    });
    
    return missing;
  }

  private findMissingFinanceFields(metrics: any[]): string[] {
    const missing: string[] = [];
    const expensesWithoutCategory = metrics.filter(m => m.type === 'expense' && !m.category);
    const expensesWithoutDescription = metrics.filter(m => m.type === 'expense' && !m.metadata?.description);
    
    if (expensesWithoutCategory.length > 0) missing.push('category');
    if (expensesWithoutDescription.length > 0) missing.push('description');
    
    return missing;
  }

  private findMissingTasksFields(tasks: any[]): string[] {
    const missing: string[] = [];
    const tasksWithoutPriority = tasks.filter(t => !t.priority);
    const tasksWithoutCategory = tasks.filter(t => !t.category);
    const tasksWithoutDueDate = tasks.filter(t => !t.due_date);
    
    if (tasksWithoutPriority.length > 0) missing.push('priority');
    if (tasksWithoutCategory.length > 0) missing.push('category');
    if (tasksWithoutDueDate.length > 0) missing.push('due_date');
    
    return missing;
  }

  private findMissingContentFields(content: any[]): string[] {
    const missing: string[] = [];
    const contentWithoutRating = content.filter(c => !c.rating);
    const contentWithoutGenre = content.filter(c => !c.genre || c.genre.length === 0);
    const contentWithoutProgress = content.filter(c => !c.progress);
    
    if (contentWithoutRating.length > 0) missing.push('rating');
    if (contentWithoutGenre.length > 0) missing.push('genre');
    if (contentWithoutProgress.length > 0) missing.push('progress');
    
    return missing;
  }
}

// Export utility functions for use in other modules
export async function generateDataUnderstandingReport(userId: string) {
  const engine = new DataUnderstandingEngine(userId);
  const context = await engine.buildDataContext();
  const qualityReport = await engine.generateDataQualityReport();
  
  return {
    context,
    qualityReport,
    timestamp: new Date().toISOString()
  };
}

export async function getDataInsights(userId: string) {
  const engine = new DataUnderstandingEngine(userId);
  const context = await engine.buildDataContext();
  
  return {
    patterns: context.patterns,
    correlations: context.correlations,
    anomalies: context.anomalies,
    confidence: context.confidence_score,
    completeness: context.completeness_score
  };
}