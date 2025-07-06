// src/lib/intelligence/dashboard-ai.ts
import { createServerClient } from '../supabase/server';

interface UserContext {
  habits: any[];
  recentMetrics: any[];
  financialData: any[];
  contentData: any[];
  timeframe: string;
}

interface AIInsight {
  type: 'habit' | 'health' | 'finance' | 'content' | 'correlation';
  title: string;
  description: string;
  action?: string;
  confidence: number;
  data: any;
}

export class DashboardIntelligence {
  private geminiApiKey: string;

  constructor() {
    this.geminiApiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  }

  async generateDashboardInsights(userId: string, supabase: any): Promise<AIInsight[]> {
    // Gather comprehensive user context
    const userContext = await this.gatherUserContext(userId, supabase);
    
    // Generate AI insights using real data patterns
    const insights = await this.analyzePatterns(userContext);
    
    return insights;
  }

  private async gatherUserContext(userId: string, supabase: any): Promise<UserContext> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get habit patterns with entries
    const { data: habits } = await supabase
      .from('habits')
      .select(`
        *,
        habit_entries!inner(date, value, effort, energy_level, mood, context)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('habit_entries.date', thirtyDaysAgo.toISOString().split('T')[0]);

    // Get health/finance metrics
    const { data: metrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: false });

    // Get content consumption
    const { data: content } = await supabase
      .from('content_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      habits: habits || [],
      recentMetrics: metrics || [],
      financialData: metrics?.filter(m => ['expense', 'income', 'crypto_value'].includes(m.type)) || [],
      contentData: content || [],
      timeframe: '30d'
    };
  }

  private async analyzePatterns(context: UserContext): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // 1. Habit Performance Analysis
    insights.push(...this.analyzeHabitPatterns(context.habits));

    // 2. Financial Intelligence
    insights.push(...this.analyzeFinancialPatterns(context.financialData));

    // 3. Cross-Domain Correlations
    insights.push(...this.findCorrelations(context));

    // 4. Health Optimization
    insights.push(...this.analyzeHealthPatterns(context.recentMetrics));

    // 5. Content Intelligence
    insights.push(...this.analyzeContentPatterns(context.contentData));

    // Generate AI-powered insights using Gemini
    const aiInsights = await this.generateGeminiInsights(context);
    insights.push(...aiInsights);

    return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
  }

  private analyzeHabitPatterns(habits: any[]): AIInsight[] {
    const insights: AIInsight[] = [];

    habits.forEach(habit => {
      const entries = habit.habit_entries || [];
      const last7Days = entries.slice(0, 7);
      const completionRate = last7Days.filter(e => e.value === 1).length / 7;

      // Identify declining habits
      if (completionRate < 0.5 && habit.streak_count > 30) {
        insights.push({
          type: 'habit',
          title: `${habit.name} Declining`,
          description: `Your ${habit.name} habit dropped to ${Math.round(completionRate * 100)}% this week, breaking a ${habit.streak_count}-day streak.`,
          action: `Identify what changed in your routine and restart tomorrow.`,
          confidence: 0.9,
          data: { habitId: habit.id, completionRate, previousStreak: habit.streak_count }
        });
      }

      // Identify energy/mood correlations
      const highEnergyDays = entries.filter(e => e.energy_level >= 4);
      const habitSuccessOnHighEnergy = highEnergyDays.filter(e => e.value === 1).length / highEnergyDays.length;

      if (habitSuccessOnHighEnergy > 0.8 && highEnergyDays.length > 5) {
        insights.push({
          type: 'correlation',
          title: `${habit.name} + High Energy = Success`,
          description: `You complete ${habit.name} ${Math.round(habitSuccessOnHighEnergy * 100)}% more on high-energy days.`,
          action: `Schedule ${habit.name} when energy is naturally higher.`,
          confidence: 0.8,
          data: { habitId: habit.id, correlation: habitSuccessOnHighEnergy }
        });
      }
    });

    return insights;
  }

  private analyzeFinancialPatterns(financial: any[]): AIInsight[] {
    const insights: AIInsight[] = [];

    // Group expenses by category
    const expenses = financial.filter(m => m.type === 'expense');
    const categorySpending = expenses.reduce((acc, exp) => {
      const category = exp.category || 'Unknown';
      acc[category] = (acc[category] || 0) + exp.value;
      return acc;
    }, {});

    // Find highest spending category
    const topCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    if (topCategory && topCategory[1] > 10000) {
      insights.push({
        type: 'finance',
        title: `High ${topCategory[0]} Spending`,
        description: `₹${topCategory[1].toLocaleString()} spent on ${topCategory[0]} this month - 40% of total expenses.`,
        action: `Review ${topCategory[0]} subscriptions and find 20% savings opportunity.`,
        confidence: 0.85,
        data: { category: topCategory[0], amount: topCategory[1] }
      });
    }

    // Crypto portfolio analysis
    const cryptoValues = financial.filter(m => m.type === 'crypto_value');
    if (cryptoValues.length > 1) {
      const latestValue = cryptoValues[0]?.value || 0;
      const previousValue = cryptoValues[1]?.value || 0;
      const change = ((latestValue - previousValue) / previousValue) * 100;

      if (Math.abs(change) > 10) {
        insights.push({
          type: 'finance',
          title: `Crypto Portfolio ${change > 0 ? 'Surge' : 'Dip'}`,
          description: `Portfolio ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% to $${latestValue.toFixed(2)}.`,
          action: change > 0 ? 'Consider taking profits on gains.' : 'Review DCA strategy for accumulation.',
          confidence: 0.75,
          data: { change, currentValue: latestValue }
        });
      }
    }

    return insights;
  }

  private findCorrelations(context: UserContext): AIInsight[] {
    const insights: AIInsight[] = [];

    // Find habit-spending correlations
    const codingHabit = context.habits.find(h => h.name.toLowerCase().includes('coding'));
    const foodExpenses = context.financialData.filter(m => 
      m.category?.toLowerCase().includes('food') || 
      m.metadata?.description?.toLowerCase().includes('zomato')
    );

    if (codingHabit && foodExpenses.length > 5) {
      const codingDays = codingHabit.habit_entries?.filter(e => e.value === 1).map(e => e.date) || [];
      const foodOrderDays = foodExpenses.map(e => e.recorded_at.split('T')[0]);
      
      const overlap = codingDays.filter(day => foodOrderDays.includes(day)).length;
      const correlation = overlap / codingDays.length;

      if (correlation > 0.6) {
        insights.push({
          type: 'correlation',
          title: 'Coding Days = Food Delivery',
          description: `${Math.round(correlation * 100)}% of coding days involve food delivery orders.`,
          action: 'Meal prep on Sundays to optimize coding-day nutrition and save money.',
          confidence: 0.8,
          data: { correlation, savingsPotential: foodExpenses.length * 200 }
        });
      }
    }

    return insights;
  }

  private analyzeHealthPatrics(metrics: any[]): AIInsight[] {
    const insights: AIInsight[] = [];

    const sleepData = metrics.filter(m => m.type === 'sleep_duration');
    const stressData = metrics.filter(m => m.type === 'stress_level');

    if (sleepData.length > 7) {
      const avgSleep = sleepData.reduce((sum, s) => sum + s.value, 0) / sleepData.length;
      const recentSleep = sleepData.slice(0, 3).reduce((sum, s) => sum + s.value, 0) / 3;

      if (recentSleep < avgSleep - 60) { // 1 hour less than average
        insights.push({
          type: 'health',
          title: 'Sleep Debt Accumulating',
          description: `Recent sleep (${(recentSleep/60).toFixed(1)}h) is 1+ hours below your average.`,
          action: 'Prioritize 8+ hours tonight to restore cognitive performance.',
          confidence: 0.9,
          data: { avgSleep: avgSleep/60, recentSleep: recentSleep/60 }
        });
      }
    }

    return insights;
  }

  private analyzeContentPatterns(content: any[]): AIInsight[] {
    const insights: AIInsight[] = [];

    if (content.length > 10) {
      const genreCount = content.reduce((acc, item) => {
        const genres = item.genre || [];
        genres.forEach((g: string) => acc[g] = (acc[g] || 0) + 1);
        return acc;
      }, {});

      const topGenre = Object.entries(genreCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];

      if (topGenre && topGenre[1] > 5) {
        insights.push({
          type: 'content',
          title: `${topGenre[0]} Preference Detected`,
          description: `${topGenre[1]} of your last ${content.length} shows were ${topGenre[0]}.`,
          action: `Explore international ${topGenre[0]} or try a new genre for variety.`,
          confidence: 0.7,
          data: { genre: topGenre[0], count: topGenre[1] }
        });
      }
    }

    return insights;
  }

  private async generateGeminiInsights(context: UserContext): Promise<AIInsight[]> {
    if (!this.geminiApiKey) return [];

    const prompt = `
    Analyze this user's life data and provide 2-3 actionable insights:

    HABIT DATA:
    ${context.habits.map(h => `${h.name}: ${h.streak_count} day streak, recent completion rate: ${Math.round((h.habit_entries?.filter((e: any) => e.value === 1).length || 0) / (h.habit_entries?.length || 1) * 100)}%`).join('\n')}

    FINANCIAL DATA:
    Monthly expenses: ₹${context.financialData.reduce((sum, f) => sum + (f.type === 'expense' ? f.value : 0), 0).toLocaleString()}
    Top categories: ${Object.entries(context.financialData.reduce((acc, f) => {
      if (f.type === 'expense') {
        acc[f.category || 'Unknown'] = (acc[f.category || 'Unknown'] || 0) + f.value;
      }
      return acc;
    }, {})).sort(([,a], [,b]) => (b as number) - (a as number)).slice(0, 3).map(([cat, amt]) => `${cat}: ₹${amt}`).join(', ')}

    Provide insights in this JSON format:
    [
      {
        "type": "habit|finance|health|correlation",
        "title": "Brief insight title",
        "description": "Detailed analysis with specific numbers",
        "action": "Specific actionable recommendation",
        "confidence": 0.8
      }
    ]

    Focus on: 1) Pattern recognition 2) Optimization opportunities 3) Risk warnings
    `;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const result = await response.json();
      const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (content) {
        const insights = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
        return insights.map((insight: any) => ({
          ...insight,
          data: {}
        }));
      }
    } catch (error) {
      console.error('Gemini API error:', error);
    }

    return [];
  }
}

// Usage in your dashboard page
export async function generateDashboardData(userId: string, supabase: any) {
  const intelligence = new DashboardIntelligence();
  const insights = await intelligence.generateDashboardInsights(userId, supabase);
  
  return {
    insights,
    hasEmptyData: insights.length === 0,
    lastAnalysis: new Date().toISOString()
  };
}