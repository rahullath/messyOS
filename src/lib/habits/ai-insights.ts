// src/lib/habits/ai-insights.ts - AI-powered habit insights service
import { tokenService } from '../tokens/service';
import { authClient } from '../auth/config';

export interface HabitInsight {
  type: 'pattern' | 'correlation' | 'trend' | 'recommendation' | 'optimal_conditions';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  data?: any;
  tokenCost: number;
}

export interface OptimalConditions {
  bestMood: number | null;
  bestEnergyLevel: number | null;
  optimalLocations: string[];
  favorableWeather: string[];
  successfulContextTags: string[];
  bestTimeOfDay: string | null;
  bestDaysOfWeek: string[];
}

export interface ParsedHabitLog {
  habitName: string;
  habitId?: string;
  value: number;
  confidence: number;
  date?: string;
  notes?: string;
  suggestedContext?: {
    effort?: number;
    mood?: number;
    energy?: number;
    location?: string;
    weather?: string;
    tags?: string[];
  };
}

export interface PersonalizedRecommendation {
  type: 'timing' | 'context' | 'approach' | 'goal';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  habitId?: string;
  tokenCost: number;
}

class AIInsightsService {
  private client = authClient;
  private tokenCosts = {
    'pattern_analysis': 25,
    'natural_language_parsing': 15,
    'personalized_recommendations': 30,
    'optimal_conditions': 20,
    'habit_correlation': 35
  };

  /**
   * Analyze habit patterns and generate insights
   */
  async generateHabitInsights(userId: string, habitId?: string): Promise<HabitInsight[]> {
    try {
      // Check token balance first
      const tokenBalance = await tokenService.getTokenBalance(userId);
      if (!tokenBalance || tokenBalance.balance < this.tokenCosts.pattern_analysis) {
        throw new Error('Insufficient tokens for pattern analysis');
      }

      // Get habit data for analysis
      const habitData = await this.getHabitAnalysisData(userId, habitId);
      if (!habitData || habitData.length === 0) {
        return [{
          type: 'pattern',
          title: 'Not Enough Data',
          description: 'You need at least 7 days of habit tracking data to generate meaningful insights.',
          confidence: 1.0,
          actionable: false,
          tokenCost: 0
        }];
      }

      // Deduct tokens
      const deductionResult = await tokenService.deductTokens(
        userId,
        this.tokenCosts.pattern_analysis,
        'AI Pattern Analysis',
        'habit_insight',
        habitId
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || 'Failed to deduct tokens');
      }

      // Generate insights using AI analysis
      const insights = await this.analyzeHabitPatterns(habitData, habitId);
      
      // Store insights in database
      await this.storeInsights(userId, habitId, insights);

      return insights;
    } catch (error) {
      console.error('Error generating habit insights:', error);
      throw error;
    }
  }

  /**
   * Parse natural language habit logging
   */
  async parseNaturalLanguageLog(userId: string, input: string): Promise<ParsedHabitLog[]> {
    try {
      // Check token balance
      const tokenBalance = await tokenService.getTokenBalance(userId);
      if (!tokenBalance || tokenBalance.balance < this.tokenCosts.natural_language_parsing) {
        throw new Error('Insufficient tokens for natural language parsing');
      }

      // Get user's habits for context
      const userHabits = await this.getUserHabits(userId);

      // Deduct tokens
      const deductionResult = await tokenService.deductTokens(
        userId,
        this.tokenCosts.natural_language_parsing,
        'Natural Language Habit Parsing',
        'habit_nlp'
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || 'Failed to deduct tokens');
      }

      // Parse the input using AI
      const parsedLogs = await this.processNaturalLanguageInput(input, userHabits);

      return parsedLogs;
    } catch (error) {
      console.error('Error parsing natural language log:', error);
      throw error;
    }
  }

  /**
   * Generate personalized recommendations
   */
  async generatePersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    try {
      // Check token balance
      const tokenBalance = await tokenService.getTokenBalance(userId);
      if (!tokenBalance || tokenBalance.balance < this.tokenCosts.personalized_recommendations) {
        throw new Error('Insufficient tokens for personalized recommendations');
      }

      // Get comprehensive user data
      const userData = await this.getUserComprehensiveData(userId);

      // Deduct tokens
      const deductionResult = await tokenService.deductTokens(
        userId,
        this.tokenCosts.personalized_recommendations,
        'Personalized Habit Recommendations',
        'habit_recommendations'
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || 'Failed to deduct tokens');
      }

      // Generate recommendations using AI
      const recommendations = await this.generateRecommendations(userData);

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze optimal conditions for habit success
   */
  async analyzeOptimalConditions(userId: string, habitId: string): Promise<OptimalConditions> {
    try {
      // Check token balance
      const tokenBalance = await tokenService.getTokenBalance(userId);
      if (!tokenBalance || tokenBalance.balance < this.tokenCosts.optimal_conditions) {
        throw new Error('Insufficient tokens for optimal conditions analysis');
      }

      // Get habit entries with context data
      const { data: entries, error } = await this.client
        .from('habit_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('habit_id', habitId)
        .not('mood', 'is', null)
        .not('energy_level', 'is', null)
        .order('logged_at', { ascending: false })
        .limit(100);

      if (error || !entries || entries.length < 5) {
        throw new Error('Not enough context data for optimal conditions analysis');
      }

      // Deduct tokens
      const deductionResult = await tokenService.deductTokens(
        userId,
        this.tokenCosts.optimal_conditions,
        'Optimal Conditions Analysis',
        'habit_optimal_conditions',
        habitId
      );

      if (!deductionResult.success) {
        throw new Error(deductionResult.error || 'Failed to deduct tokens');
      }

      // Analyze optimal conditions
      const conditions = await this.calculateOptimalConditions(entries);

      return conditions;
    } catch (error) {
      console.error('Error analyzing optimal conditions:', error);
      throw error;
    }
  }

  /**
   * Get habit data for analysis
   */
  private async getHabitAnalysisData(userId: string, habitId?: string) {
    const query = this.client
      .from('habit_entries')
      .select(`
        *,
        habits (
          id,
          name,
          type,
          measurement_type,
          target_value,
          streak_count
        )
      `)
      .eq('user_id', userId)
      .gte('logged_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('logged_at', { ascending: false });

    if (habitId) {
      query.eq('habit_id', habitId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching habit data:', error);
      return null;
    }

    return data;
  }

  /**
   * Get user's habits for NLP context
   */
  private async getUserHabits(userId: string) {
    const { data, error } = await this.client
      .from('habits')
      .select('id, name, type, measurement_type, target_value, target_unit')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching user habits:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get comprehensive user data for recommendations
   */
  private async getUserComprehensiveData(userId: string) {
    const [habitsResult, entriesResult] = await Promise.all([
      this.client
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      this.client
        .from('habit_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('logged_at', { ascending: false })
    ]);

    return {
      habits: habitsResult.data || [],
      entries: entriesResult.data || []
    };
  }

  /**
   * Analyze habit patterns using AI-like logic
   */
  private async analyzeHabitPatterns(habitData: any[], habitId?: string): Promise<HabitInsight[]> {
    const insights: HabitInsight[] = [];

    // Group entries by habit
    const habitGroups = habitData.reduce((acc, entry) => {
      const hId = entry.habit_id;
      if (!acc[hId]) {
        acc[hId] = {
          habit: entry.habits,
          entries: []
        };
      }
      acc[hId].entries.push(entry);
      return acc;
    }, {});

    for (const [hId, group] of Object.entries(habitGroups) as any) {
      const { habit, entries } = group;
      
      // Calculate completion rate
      const completionRate = entries.filter((e: any) => e.value > 0).length / entries.length;
      
      // Analyze streak patterns
      const streakAnalysis = this.analyzeStreakPatterns(entries);
      
      // Analyze context correlations
      const contextAnalysis = this.analyzeContextCorrelations(entries);

      // Generate pattern insights
      if (completionRate > 0.8) {
        insights.push({
          type: 'pattern',
          title: `Strong Performance: ${habit.name}`,
          description: `You're crushing it with ${habit.name}! ${Math.round(completionRate * 100)}% completion rate over the last 30 days.`,
          confidence: 0.9,
          actionable: false,
          data: { completionRate, habitId: hId },
          tokenCost: this.tokenCosts.pattern_analysis
        });
      } else if (completionRate < 0.4) {
        insights.push({
          type: 'recommendation',
          title: `Improvement Opportunity: ${habit.name}`,
          description: `${habit.name} needs attention. Consider breaking it into smaller steps or adjusting your approach.`,
          confidence: 0.8,
          actionable: true,
          data: { completionRate, habitId: hId },
          tokenCost: this.tokenCosts.pattern_analysis
        });
      }

      // Add streak insights
      if (streakAnalysis.averageStreak > 5) {
        insights.push({
          type: 'trend',
          title: `Streak Master: ${habit.name}`,
          description: `Your average streak for ${habit.name} is ${streakAnalysis.averageStreak} days. Keep the momentum going!`,
          confidence: 0.85,
          actionable: false,
          data: streakAnalysis,
          tokenCost: this.tokenCosts.pattern_analysis
        });
      }

      // Add context insights
      if (contextAnalysis.bestMood) {
        insights.push({
          type: 'optimal_conditions',
          title: `Optimal Mood for ${habit.name}`,
          description: `You're most successful with ${habit.name} when your mood is ${contextAnalysis.bestMood}/5. Try tracking your mood before attempting this habit.`,
          confidence: 0.75,
          actionable: true,
          data: contextAnalysis,
          tokenCost: this.tokenCosts.pattern_analysis
        });
      }
    }

    return insights;
  }

  /**
   * Process natural language input
   */
  private async processNaturalLanguageInput(input: string, userHabits: any[]): Promise<ParsedHabitLog[]> {
    const parsedLogs: ParsedHabitLog[] = [];
    const lowerInput = input.toLowerCase();

    // Simple pattern matching for common phrases
    const patterns = [
      { regex: /(?:i\s+)?(?:did|completed|finished)\s+(.+?)(?:\s+for\s+(\d+)\s*(minutes?|hours?|times?))?/gi, confidence: 0.8 },
      { regex: /(?:i\s+)?(?:exercised|worked out|ran|walked|meditated|read|journaled)/gi, confidence: 0.9 },
      { regex: /(\d+)\s*(minutes?|hours?)\s+of\s+(.+)/gi, confidence: 0.85 },
      { regex: /(.+?)\s+(?:today|yesterday|this morning|this evening)/gi, confidence: 0.7 }
    ];

    // Extract date information
    let logDate = new Date().toISOString().split('T')[0]; // Default to today
    if (lowerInput.includes('yesterday')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      logDate = yesterday.toISOString().split('T')[0];
    }

    // Match against user's existing habits
    for (const habit of userHabits) {
      const habitNameLower = habit.name.toLowerCase();
      
      if (lowerInput.includes(habitNameLower)) {
        // Extract value based on measurement type
        let value = 1; // Default for boolean
        
        if (habit.measurement_type === 'duration') {
          const durationMatch = lowerInput.match(new RegExp(`(\\d+)\\s*(minutes?|hours?).*${habitNameLower}|${habitNameLower}.*?(\\d+)\\s*(minutes?|hours?)`, 'i'));
          if (durationMatch) {
            const duration = parseInt(durationMatch[1] || durationMatch[3]);
            const unit = durationMatch[2] || durationMatch[4];
            value = unit.startsWith('hour') ? duration * 60 : duration;
          }
        } else if (habit.measurement_type === 'count') {
          const countMatch = lowerInput.match(new RegExp(`(\\d+).*${habitNameLower}|${habitNameLower}.*(\\d+)`, 'i'));
          if (countMatch) {
            value = parseInt(countMatch[1] || countMatch[2]);
          }
        }

        parsedLogs.push({
          habitName: habit.name,
          habitId: habit.id,
          value,
          confidence: 0.85,
          date: logDate,
          notes: `Logged via natural language: "${input}"`,
          suggestedContext: this.extractContextFromText(lowerInput)
        });
      }
    }

    // If no exact matches, try fuzzy matching
    if (parsedLogs.length === 0) {
      const words = lowerInput.split(/\s+/);
      for (const habit of userHabits) {
        const habitWords = habit.name.toLowerCase().split(/\s+/);
        const matchScore = this.calculateWordMatchScore(words, habitWords);
        
        if (matchScore > 0.6) {
          parsedLogs.push({
            habitName: habit.name,
            habitId: habit.id,
            value: 1,
            confidence: matchScore,
            date: logDate,
            notes: `Fuzzy matched from: "${input}"`,
            suggestedContext: this.extractContextFromText(lowerInput)
          });
        }
      }
    }

    return parsedLogs;
  }

  /**
   * Generate personalized recommendations
   */
  private async generateRecommendations(userData: any): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];
    const { habits, entries } = userData;

    // Analyze each habit's performance
    for (const habit of habits) {
      const habitEntries = entries.filter((e: any) => e.habit_id === habit.id);
      
      if (habitEntries.length < 3) continue;

      const completionRate = habitEntries.filter((e: any) => e.value > 0).length / habitEntries.length;
      const recentEntries = habitEntries.slice(0, 7); // Last 7 entries
      const recentCompletionRate = recentEntries.filter((e: any) => e.value > 0).length / recentEntries.length;

      // Timing recommendations
      const timeAnalysis = this.analyzeOptimalTiming(habitEntries);
      if (timeAnalysis.bestHour) {
        recommendations.push({
          type: 'timing',
          title: `Optimal Time for ${habit.name}`,
          description: `You're most successful with ${habit.name} around ${timeAnalysis.bestHour}:00. Consider scheduling it for this time.`,
          confidence: 0.8,
          actionable: true,
          habitId: habit.id,
          tokenCost: this.tokenCosts.personalized_recommendations
        });
      }

      // Context recommendations
      if (completionRate < 0.5) {
        recommendations.push({
          type: 'approach',
          title: `Simplify ${habit.name}`,
          description: `${habit.name} has a ${Math.round(completionRate * 100)}% completion rate. Try reducing the target or breaking it into smaller steps.`,
          confidence: 0.75,
          actionable: true,
          habitId: habit.id,
          tokenCost: this.tokenCosts.personalized_recommendations
        });
      }

      // Goal recommendations
      if (habit.measurement_type === 'duration' && completionRate > 0.8) {
        recommendations.push({
          type: 'goal',
          title: `Level Up ${habit.name}`,
          description: `You're consistently hitting your ${habit.name} target. Consider increasing it by 25% to continue growing.`,
          confidence: 0.7,
          actionable: true,
          habitId: habit.id,
          tokenCost: this.tokenCosts.personalized_recommendations
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate optimal conditions from entries
   */
  private async calculateOptimalConditions(entries: any[]): Promise<OptimalConditions> {
    const successfulEntries = entries.filter(e => e.value > 0);
    const failedEntries = entries.filter(e => e.value === 0);

    // Calculate averages for successful entries
    const avgSuccessfulMood = successfulEntries.length > 0 
      ? successfulEntries.reduce((sum, e) => sum + (e.mood || 0), 0) / successfulEntries.length 
      : null;

    const avgSuccessfulEnergy = successfulEntries.length > 0
      ? successfulEntries.reduce((sum, e) => sum + (e.energy_level || 0), 0) / successfulEntries.length
      : null;

    // Find most common locations for successful entries
    const locationCounts = successfulEntries.reduce((acc, e) => {
      if (e.location) {
        acc[e.location] = (acc[e.location] || 0) + 1;
      }
      return acc;
    }, {});

    const optimalLocations = Object.entries(locationCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([location]) => location);

    // Find favorable weather conditions
    const weatherCounts = successfulEntries.reduce((acc, e) => {
      if (e.weather) {
        acc[e.weather] = (acc[e.weather] || 0) + 1;
      }
      return acc;
    }, {});

    const favorableWeather = Object.entries(weatherCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([weather]) => weather);

    // Find successful context tags
    const tagCounts = successfulEntries.reduce((acc, e) => {
      if (e.context_tags) {
        e.context_tags.forEach((tag: string) => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
      }
      return acc;
    }, {});

    const successfulContextTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([tag]) => tag);

    // Analyze best time of day
    const hourCounts = successfulEntries.reduce((acc, e) => {
      if (e.completion_time) {
        const hour = parseInt(e.completion_time.split(':')[0]);
        acc[hour] = (acc[hour] || 0) + 1;
      }
      return acc;
    }, {});

    const bestHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    const bestTimeOfDay = bestHour ? `${bestHour[0]}:00` : null;

    // Analyze best days of week
    const dayCounts = successfulEntries.reduce((acc, e) => {
      const day = new Date(e.logged_at).toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {});

    const bestDaysOfWeek = Object.entries(dayCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([day]) => day);

    return {
      bestMood: avgSuccessfulMood ? Math.round(avgSuccessfulMood) : null,
      bestEnergyLevel: avgSuccessfulEnergy ? Math.round(avgSuccessfulEnergy) : null,
      optimalLocations,
      favorableWeather,
      successfulContextTags,
      bestTimeOfDay,
      bestDaysOfWeek
    };
  }

  /**
   * Store insights in database
   */
  private async storeInsights(userId: string, habitId: string | undefined, insights: HabitInsight[]) {
    try {
      const insightsToStore = insights.map(insight => ({
        user_id: userId,
        habit_id: habitId,
        insight_type: insight.type,
        title: insight.title,
        description: insight.description,
        data: insight.data,
        confidence: insight.confidence,
        is_actionable: insight.actionable,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }));

      const { error } = await this.client
        .from('habit_insights')
        .insert(insightsToStore);

      if (error) {
        console.error('Error storing insights:', error);
      }
    } catch (error) {
      console.error('Error storing insights:', error);
    }
  }

  /**
   * Helper methods
   */
  private analyzeStreakPatterns(entries: any[]) {
    // Sort entries by date
    const sortedEntries = entries.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
    
    let currentStreak = 0;
    let maxStreak = 0;
    let totalStreaks = 0;
    let streakCount = 0;

    for (const entry of sortedEntries) {
      if (entry.value > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        if (currentStreak > 0) {
          totalStreaks += currentStreak;
          streakCount++;
        }
        currentStreak = 0;
      }
    }

    // Don't forget the last streak if it's ongoing
    if (currentStreak > 0) {
      totalStreaks += currentStreak;
      streakCount++;
    }

    return {
      averageStreak: streakCount > 0 ? Math.round(totalStreaks / streakCount) : 0,
      maxStreak,
      currentStreak
    };
  }

  private analyzeContextCorrelations(entries: any[]) {
    const successfulEntries = entries.filter(e => e.value > 0);
    
    if (successfulEntries.length === 0) {
      return {};
    }

    const avgMood = successfulEntries.reduce((sum, e) => sum + (e.mood || 0), 0) / successfulEntries.length;
    const avgEnergy = successfulEntries.reduce((sum, e) => sum + (e.energy_level || 0), 0) / successfulEntries.length;

    return {
      bestMood: avgMood > 0 ? Math.round(avgMood) : null,
      bestEnergy: avgEnergy > 0 ? Math.round(avgEnergy) : null
    };
  }

  private analyzeOptimalTiming(entries: any[]) {
    const successfulEntries = entries.filter(e => e.value > 0);
    
    const hourCounts = successfulEntries.reduce((acc, e) => {
      const hour = new Date(e.logged_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const bestHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      bestHour: bestHour ? parseInt(bestHour[0]) : null
    };
  }

  private extractContextFromText(text: string) {
    const context: any = {};

    // Extract mood indicators
    if (text.includes('great') || text.includes('amazing') || text.includes('fantastic')) {
      context.mood = 5;
    } else if (text.includes('good') || text.includes('well')) {
      context.mood = 4;
    } else if (text.includes('tired') || text.includes('exhausted')) {
      context.energy = 2;
    } else if (text.includes('energetic') || text.includes('pumped')) {
      context.energy = 5;
    }

    // Extract location indicators
    if (text.includes('gym') || text.includes('fitness')) {
      context.location = 'Gym';
    } else if (text.includes('home')) {
      context.location = 'Home';
    } else if (text.includes('office') || text.includes('work')) {
      context.location = 'Office';
    }

    // Extract time indicators
    if (text.includes('morning')) {
      context.tags = ['morning'];
    } else if (text.includes('evening') || text.includes('night')) {
      context.tags = ['evening'];
    }

    return Object.keys(context).length > 0 ? context : undefined;
  }

  private calculateWordMatchScore(words1: string[], words2: string[]): number {
    const matches = words1.filter(word => 
      words2.some(habitWord => 
        habitWord.includes(word) || word.includes(habitWord)
      )
    );
    
    return matches.length / Math.max(words1.length, words2.length);
  }

  /**
   * Get token costs for different AI features
   */
  getTokenCosts() {
    return this.tokenCosts;
  }
}

export const aiInsightsService = new AIInsightsService();
export default aiInsightsService;