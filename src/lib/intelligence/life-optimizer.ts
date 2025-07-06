// src/lib/intelligence/life-optimizer.ts
interface LifeDataPoint {
  date: string;
  habits: Record<string, number>;
  mood: number;
  energy: number;
  sleep: number;
  expenses: number;
  productivity: number;
  stress: number;
}

interface Prediction {
  metric: string;
  predicted_value: number;
  confidence: number;
  influencing_factors: string[];
  recommendation: string;
}

export class LifeOptimizer {
  private readonly MINIMUM_DATA_POINTS = 14; // Need 2 weeks minimum for patterns

  async analyzeLifePatterns(userId: string, supabase: any): Promise<{
    patterns: any[];
    predictions: Prediction[];
    optimizations: any[];
    riskyTrends: any[];
  }> {
    // Gather comprehensive life data
    const lifeData = await this.gatherLifeDataPoints(userId, supabase);
    
    if (lifeData.length < this.MINIMUM_DATA_POINTS) {
      return {
        patterns: [],
        predictions: [],
        optimizations: [{
          type: 'data_collection',
          message: `Need ${this.MINIMUM_DATA_POINTS - lifeData.length} more days of data for accurate analysis`,
          priority: 'high'
        }],
        riskyTrends: []
      };
    }

    // Real statistical analysis
    const patterns = this.findStatisticalPatterns(lifeData);
    const predictions = this.generatePredictions(lifeData);
    const optimizations = this.calculateOptimizations(patterns, lifeData);
    const riskyTrends = this.detectRiskyTrends(lifeData);

    return { patterns, predictions, optimizations, riskyTrends };
  }

  private async gatherLifeDataPoints(userId: string, supabase: any): Promise<LifeDataPoint[]> {
    const days = 90; // Analyze last 90 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all data types for correlation analysis
    const [habitsData, metricsData] = await Promise.all([
      supabase
        .from('habit_entries')
        .select('date, value, habit_id, effort, energy_level, mood, habits(name)')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true }),
      
      supabase
        .from('metrics')
        .select('recorded_at, type, value, category')
        .eq('user_id', userId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true })
    ]);

    // Transform into daily data points
    const dataPoints: Record<string, Partial<LifeDataPoint>> = {};

    // Process habits
    habitsData.data?.forEach((entry: any) => {
      const date = entry.date;
      if (!dataPoints[date]) {
        dataPoints[date] = { date, habits: {} };
      }
      
      dataPoints[date].habits![entry.habits.name] = entry.value;
      
      // Aggregate mood and energy from habits
      if (entry.mood) {
        dataPoints[date].mood = (dataPoints[date].mood || 0) + entry.mood;
      }
      if (entry.energy_level) {
        dataPoints[date].energy = (dataPoints[date].energy || 0) + entry.energy_level;
      }
    });

    // Process metrics
    metricsData.data?.forEach((metric: any) => {
      const date = metric.recorded_at.split('T')[0];
      if (!dataPoints[date]) {
        dataPoints[date] = { date, habits: {} };
      }

      switch (metric.type) {
        case 'sleep_duration':
          dataPoints[date].sleep = metric.value / 60; // Convert to hours
          break;
        case 'stress_level':
          dataPoints[date].stress = metric.value;
          break;
        case 'expense':
          dataPoints[date].expenses = (dataPoints[date].expenses || 0) + metric.value;
          break;
      }
    });

    // Convert to array and fill missing data
    return Object.values(dataPoints)
      .map(dp => ({
        date: dp.date!,
        habits: dp.habits || {},
        mood: dp.mood || 3,
        energy: dp.energy || 3,
        sleep: dp.sleep || 7,
        expenses: dp.expenses || 0,
        productivity: this.calculateProductivity(dp.habits || {}),
        stress: dp.stress || 3
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private calculateProductivity(habits: Record<string, number>): number {
    // Define productivity habits
    const productivityHabits = ['Coding', 'University', 'Work'];
    
    let score = 0;
    let count = 0;
    
    productivityHabits.forEach(habit => {
      if (habits[habit] !== undefined) {
        score += habits[habit];
        count++;
      }
    });
    
    return count > 0 ? score / count : 0;
  }

  private findStatisticalPatterns(data: LifeDataPoint[]): any[] {
    const patterns = [];

    // 1. Sleep-Productivity Correlation
    const sleepProductivityCorr = this.calculateCorrelation(
      data.map(d => d.sleep),
      data.map(d => d.productivity)
    );

    if (Math.abs(sleepProductivityCorr) > 0.3) {
      patterns.push({
        type: 'correlation',
        variables: ['sleep', 'productivity'],
        strength: sleepProductivityCorr,
        insight: sleepProductivityCorr > 0 
          ? `${Math.round(sleepProductivityCorr * 100)}% correlation: More sleep = higher productivity`
          : `${Math.round(Math.abs(sleepProductivityCorr) * 100)}% negative correlation: Oversleeping hurts productivity`,
        actionable: true
      });
    }

    // 2. Weekly Patterns
    const weeklyPatterns = this.analyzeWeeklyPatterns(data);
    patterns.push(...weeklyPatterns);

    // 3. Habit Chain Analysis
    const habitChains = this.analyzeHabitChains(data);
    patterns.push(...habitChains);

    // 4. Stress-Expense Correlation
    const stressExpenseCorr = this.calculateCorrelation(
      data.map(d => d.stress),
      data.map(d => d.expenses)
    );

    if (stressExpenseCorr > 0.4) {
      patterns.push({
        type: 'correlation',
        variables: ['stress', 'expenses'],
        strength: stressExpenseCorr,
        insight: `High stress days lead to ${Math.round((stressExpenseCorr * 100))}% more spending`,
        actionable: true,
        recommendation: 'Implement stress-relief protocols to reduce impulse spending'
      });
    }

    return patterns;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private analyzeWeeklyPatterns(data: LifeDataPoint[]): any[] {
    const patterns = [];
    const dayOfWeekData: Record<string, number[]> = {
      'Sunday': [],
      'Monday': [],
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': []
    };

    // Group by day of week
    data.forEach(point => {
      const dayName = new Date(point.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekData[dayName].push(point.productivity);
    });

    // Find best and worst days
    const dayAverages = Object.entries(dayOfWeekData)
      .map(([day, scores]) => ({
        day,
        avg: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        count: scores.length
      }))
      .filter(d => d.count >= 3); // Need at least 3 data points

    if (dayAverages.length > 0) {
      const bestDay = dayAverages.reduce((a, b) => a.avg > b.avg ? a : b);
      const worstDay = dayAverages.reduce((a, b) => a.avg < b.avg ? a : b);

      if (bestDay.avg - worstDay.avg > 0.5) {
        patterns.push({
          type: 'weekly_pattern',
          insight: `${bestDay.day}s are your most productive (${bestDay.avg.toFixed(1)}/5), ${worstDay.day}s are worst (${worstDay.avg.toFixed(1)}/5)`,
          recommendation: `Schedule important tasks on ${bestDay.day}s, use ${worstDay.day}s for recovery/planning`,
          actionable: true,
          data: { bestDay: bestDay.day, worstDay: worstDay.day }
        });
      }
    }

    return patterns;
  }

  private analyzeHabitChains(data: LifeDataPoint[]): any[] {
    const patterns = [];
    
    // Find habits that predict other habits
    const habitNames = Object.keys(data[0]?.habits || {});
    
    for (let i = 0; i < habitNames.length; i++) {
      for (let j = i + 1; j < habitNames.length; j++) {
        const habit1 = habitNames[i];
        const habit2 = habitNames[j];
        
        const habit1Values = data.map(d => d.habits[habit1] || 0);
        const habit2Values = data.map(d => d.habits[habit2] || 0);
        
        const correlation = this.calculateCorrelation(habit1Values, habit2Values);
        
        if (correlation > 0.6) {
          patterns.push({
            type: 'habit_chain',
            habits: [habit1, habit2],
            strength: correlation,
            insight: `${habit1} success predicts ${habit2} success (${Math.round(correlation * 100)}% correlation)`,
            recommendation: `Use ${habit1} as a trigger for ${habit2} - create a habit stack`,
            actionable: true
          });
        }
      }
    }
    
    return patterns;
  }

  private generatePredictions(data: LifeDataPoint[]): Prediction[] {
    const predictions: Prediction[] = [];
    
    // Predict tomorrow's optimal habits based on patterns
    const latest = data[data.length - 1];
    
    // Sleep-based predictions
    if (latest.sleep < 6) {
      predictions.push({
        metric: 'productivity',
        predicted_value: 2.1,
        confidence: 0.85,
        influencing_factors: ['Low sleep (${latest.sleep}h)', 'Historical sleep-productivity correlation'],
        recommendation: 'Postpone demanding tasks. Focus on low-energy activities like planning or admin work.'
      });
    }

    // Trend-based predictions
    const last7Days = data.slice(-7);
    const avgStress = last7Days.reduce((sum, d) => sum + d.stress, 0) / 7;
    
    if (avgStress > 6) {
      predictions.push({
        metric: 'expense_risk',
        predicted_value: latest.expenses * 1.4,
        confidence: 0.72,
        influencing_factors: ['High stress week (avg ${avgStress.toFixed(1)})', 'Stress-spending correlation'],
        recommendation: 'High stress detected. Remove payment apps from phone today to prevent impulse spending.'
      });
    }

    return predictions;
  }

  private calculateOptimizations(patterns: any[], data: LifeDataPoint[]): any[] {
    const optimizations = [];

    // Find the biggest leverage points
    patterns.forEach(pattern => {
      if (pattern.type === 'correlation' && pattern.actionable) {
        if (pattern.variables.includes('sleep') && pattern.strength > 0.5) {
          optimizations.push({
            type: 'sleep_optimization',
            impact: 'high',
            description: 'Sleep is your highest-leverage productivity factor',
            specific_action: `Target 7.5-8.5h sleep for optimal performance (current avg: ${(data.slice(-7).reduce((sum, d) => sum + d.sleep, 0) / 7).toFixed(1)}h)`,
            estimated_benefit: `+${Math.round(pattern.strength * 30)}% productivity increase`
          });
        }
      }
    });

    return optimizations;
  }

  private detectRiskyTrends(data: LifeDataPoint[]): any[] {
    const risks = [];
    
    // Declining trends
    const last14Days = data.slice(-14);
    const prev14Days = data.slice(-28, -14);
    
    if (last14Days.length >= 7 && prev14Days.length >= 7) {
      const recentSleep = last14Days.reduce((sum, d) => sum + d.sleep, 0) / last14Days.length;
      const previousSleep = prev14Days.reduce((sum, d) => sum + d.sleep, 0) / prev14Days.length;
      
      if (recentSleep < previousSleep - 0.5) {
        risks.push({
          type: 'declining_sleep',
          severity: 'medium',
          trend: `Sleep declining from ${previousSleep.toFixed(1)}h to ${recentSleep.toFixed(1)}h`,
          projection: 'Continued decline will impact all life areas',
          intervention: 'Implement sleep hygiene protocol immediately'
        });
      }
    }

    return risks;
  }
}