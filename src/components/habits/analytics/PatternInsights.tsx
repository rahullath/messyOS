// src/components/habits/analytics/PatternInsights.tsx - AI-powered pattern insights
import React, { useMemo } from 'react';

interface Habit {
  id: string;
  name: string;
  color: string;
  type: 'build' | 'break' | 'maintain';
}

interface HabitEntry {
  id: string;
  habit_id: string;
  value: number;
  date: string;
  effort?: number;
  mood?: number;
  energy_level?: number;
  location?: string;
  weather?: string;
  context_tags?: string[];
  completion_time?: string;
}

interface AnalyticsData {
  habits: Habit[];
  entries: HabitEntry[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface PatternInsightsProps {
  data: AnalyticsData;
  showDetailed?: boolean;
}

interface Insight {
  id: string;
  type: 'pattern' | 'recommendation' | 'achievement' | 'warning';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  icon: string;
  color: string;
}

export function PatternInsights({ data, showDetailed = false }: PatternInsightsProps) {
  const insights = useMemo(() => {
    const generatedInsights: Insight[] = [];
    
    if (!data.entries.length) return generatedInsights;

    // Analyze completion patterns by day of week
    const dayOfWeekAnalysis = analyzeDayOfWeekPatterns(data);
    if (dayOfWeekAnalysis) {
      generatedInsights.push(dayOfWeekAnalysis);
    }

    // Analyze time-based patterns
    const timeAnalysis = analyzeTimePatterns(data);
    if (timeAnalysis) {
      generatedInsights.push(timeAnalysis);
    }

    // Analyze streak patterns
    const streakAnalysis = analyzeStreakPatterns(data);
    if (streakAnalysis) {
      generatedInsights.push(streakAnalysis);
    }

    // Analyze context patterns
    const contextAnalysis = analyzeContextPatterns(data);
    if (contextAnalysis) {
      generatedInsights.push(contextAnalysis);
    }

    // Analyze habit difficulty
    const difficultyAnalysis = analyzeDifficultyPatterns(data);
    if (difficultyAnalysis) {
      generatedInsights.push(difficultyAnalysis);
    }

    // Generate recommendations
    const recommendations = generateRecommendations(data);
    generatedInsights.push(...recommendations);

    return generatedInsights.sort((a, b) => b.confidence - a.confidence);
  }, [data]);

  const analyzeDayOfWeekPatterns = (data: AnalyticsData): Insight | null => {
    const dayStats = Array(7).fill(0).map(() => ({ total: 0, success: 0 }));
    
    data.entries.forEach(entry => {
      const dayOfWeek = new Date(entry.date).getDay();
      dayStats[dayOfWeek].total++;
      if (entry.value === 1) {
        dayStats[dayOfWeek].success++;
      }
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayRates = dayStats.map((stat, index) => ({
      day: dayNames[index],
      rate: stat.total > 0 ? stat.success / stat.total : 0,
      total: stat.total
    })).filter(d => d.total >= 3);

    if (dayRates.length === 0) return null;

    const bestDay = dayRates.reduce((prev, current) => 
      current.rate > prev.rate ? current : prev
    );
    const worstDay = dayRates.reduce((prev, current) => 
      current.rate < prev.rate ? current : prev
    );

    if (bestDay.rate - worstDay.rate > 0.2) {
      return {
        id: 'day-pattern',
        type: 'pattern',
        title: `${bestDay.day}s are your strongest day`,
        description: `You complete ${Math.round(bestDay.rate * 100)}% of habits on ${bestDay.day}s vs ${Math.round(worstDay.rate * 100)}% on ${worstDay.day}s. Consider scheduling important habits on ${bestDay.day}s.`,
        confidence: 0.8,
        actionable: true,
        icon: '📅',
        color: 'text-accent-success'
      };
    }

    return null;
  };

  const analyzeTimePatterns = (data: AnalyticsData): Insight | null => {
    const entriesWithTime = data.entries.filter(e => e.completion_time);
    if (entriesWithTime.length < 10) return null;

    const timeStats: Record<string, { total: number; success: number }> = {};
    
    entriesWithTime.forEach(entry => {
      if (entry.completion_time) {
        const hour = parseInt(entry.completion_time.split(':')[0]);
        const timeSlot = hour < 6 ? 'early-morning' :
                       hour < 12 ? 'morning' :
                       hour < 17 ? 'afternoon' :
                       hour < 21 ? 'evening' : 'night';
        
        if (!timeStats[timeSlot]) {
          timeStats[timeSlot] = { total: 0, success: 0 };
        }
        timeStats[timeSlot].total++;
        if (entry.value === 1) {
          timeStats[timeSlot].success++;
        }
      }
    });

    const timeSlotNames = {
      'early-morning': 'Early Morning (before 6am)',
      'morning': 'Morning (6am-12pm)',
      'afternoon': 'Afternoon (12pm-5pm)',
      'evening': 'Evening (5pm-9pm)',
      'night': 'Night (after 9pm)'
    };

    const timeRates = Object.entries(timeStats)
      .map(([slot, stats]) => ({
        slot,
        name: timeSlotNames[slot as keyof typeof timeSlotNames],
        rate: stats.success / stats.total,
        total: stats.total
      }))
      .filter(t => t.total >= 5)
      .sort((a, b) => b.rate - a.rate);

    if (timeRates.length > 0) {
      const bestTime = timeRates[0];
      return {
        id: 'time-pattern',
        type: 'pattern',
        title: `${bestTime.name} is your peak time`,
        description: `You have a ${Math.round(bestTime.rate * 100)}% success rate during ${bestTime.name.toLowerCase()}. Try scheduling challenging habits during this time.`,
        confidence: 0.75,
        actionable: true,
        icon: '⏰',
        color: 'text-accent-primary'
      };
    }

    return null;
  };

  const analyzeStreakPatterns = (data: AnalyticsData): Insight | null => {
    const habitStreaks = data.habits.map(habit => {
      const habitEntries = data.entries
        .filter(e => e.habit_id === habit.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let maxStreak = 0;
      let currentStreak = 0;
      
      habitEntries.forEach(entry => {
        if (entry.value === 1) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
      
      return { habit, maxStreak, totalEntries: habitEntries.length };
    }).filter(h => h.totalEntries >= 7);

    if (habitStreaks.length === 0) return null;

    const avgStreak = habitStreaks.reduce((sum, h) => sum + h.maxStreak, 0) / habitStreaks.length;
    const bestStreak = habitStreaks.reduce((prev, current) => 
      current.maxStreak > prev.maxStreak ? current : prev
    );

    if (bestStreak.maxStreak >= 7) {
      return {
        id: 'streak-achievement',
        type: 'achievement',
        title: `Impressive ${bestStreak.maxStreak}-day streak!`,
        description: `Your longest streak is ${bestStreak.maxStreak} days with "${bestStreak.habit.name}". You're building strong consistency!`,
        confidence: 0.9,
        actionable: false,
        icon: '🔥',
        color: 'text-accent-warning'
      };
    } else if (avgStreak < 3) {
      return {
        id: 'streak-improvement',
        type: 'recommendation',
        title: 'Focus on building longer streaks',
        description: `Your average streak is ${Math.round(avgStreak)} days. Try focusing on one habit at a time to build momentum.`,
        confidence: 0.7,
        actionable: true,
        icon: '🎯',
        color: 'text-accent-primary'
      };
    }

    return null;
  };

  const analyzeContextPatterns = (data: AnalyticsData): Insight | null => {
    const entriesWithContext = data.entries.filter(e => 
      e.mood !== undefined || e.energy_level !== undefined || e.effort !== undefined
    );

    if (entriesWithContext.length < 10) return null;

    // Analyze mood patterns
    const moodStats = [1, 2, 3, 4, 5].map(mood => {
      const moodEntries = entriesWithContext.filter(e => e.mood === mood);
      return {
        mood,
        total: moodEntries.length,
        success: moodEntries.filter(e => e.value === 1).length
      };
    }).filter(m => m.total >= 3);

    if (moodStats.length >= 3) {
      const bestMood = moodStats.reduce((prev, current) => 
        (current.success / current.total) > (prev.success / prev.total) ? current : prev
      );
      const worstMood = moodStats.reduce((prev, current) => 
        (current.success / current.total) < (prev.success / prev.total) ? current : prev
      );

      const bestRate = bestMood.success / bestMood.total;
      const worstRate = worstMood.success / worstMood.total;

      if (bestRate - worstRate > 0.3) {
        const moodEmojis = ['😔', '😕', '😐', '😊', '😄'];
        return {
          id: 'mood-pattern',
          type: 'pattern',
          title: 'Mood significantly affects your success',
          description: `You're ${Math.round(bestRate * 100)}% successful when feeling ${moodEmojis[bestMood.mood - 1]} vs ${Math.round(worstRate * 100)}% when feeling ${moodEmojis[worstMood.mood - 1]}. Consider mood-boosting activities before important habits.`,
          confidence: 0.8,
          actionable: true,
          icon: '😊',
          color: 'text-accent-success'
        };
      }
    }

    return null;
  };

  const analyzeDifficultyPatterns = (data: AnalyticsData): Insight | null => {
    const entriesWithEffort = data.entries.filter(e => e.effort !== undefined);
    if (entriesWithEffort.length < 10) return null;

    const effortStats = [1, 2, 3, 4, 5].map(effort => {
      const effortEntries = entriesWithEffort.filter(e => e.effort === effort);
      return {
        effort,
        total: effortEntries.length,
        success: effortEntries.filter(e => e.value === 1).length
      };
    }).filter(e => e.total >= 3);

    if (effortStats.length >= 3) {
      const highEffortEntries = effortStats.filter(e => e.effort >= 4);
      const lowEffortEntries = effortStats.filter(e => e.effort <= 2);

      if (highEffortEntries.length > 0 && lowEffortEntries.length > 0) {
        const highEffortRate = highEffortEntries.reduce((sum, e) => sum + e.success, 0) / 
                              highEffortEntries.reduce((sum, e) => sum + e.total, 0);
        const lowEffortRate = lowEffortEntries.reduce((sum, e) => sum + e.success, 0) / 
                             lowEffortEntries.reduce((sum, e) => sum + e.total, 0);

        if (lowEffortRate > highEffortRate + 0.2) {
          return {
            id: 'difficulty-pattern',
            type: 'recommendation',
            title: 'Lower effort habits are more sustainable',
            description: `You complete ${Math.round(lowEffortRate * 100)}% of low-effort habits vs ${Math.round(highEffortRate * 100)}% of high-effort ones. Consider breaking down challenging habits into smaller steps.`,
            confidence: 0.75,
            actionable: true,
            icon: '⚡',
            color: 'text-accent-warning'
          };
        }
      }
    }

    return null;
  };

  const generateRecommendations = (data: AnalyticsData): Insight[] => {
    const recommendations: Insight[] = [];
    
    // Check for habits with low completion rates
    const habitRates = data.habits.map(habit => {
      const habitEntries = data.entries.filter(e => e.habit_id === habit.id);
      const rate = habitEntries.length > 0 ? 
        habitEntries.filter(e => e.value === 1).length / habitEntries.length : 0;
      return { habit, rate, total: habitEntries.length };
    }).filter(h => h.total >= 5);

    const strugglingHabits = habitRates.filter(h => h.rate < 0.4);
    if (strugglingHabits.length > 0) {
      const worstHabit = strugglingHabits.reduce((prev, current) => 
        current.rate < prev.rate ? current : prev
      );
      
      recommendations.push({
        id: 'struggling-habit',
        type: 'warning',
        title: `"${worstHabit.habit.name}" needs attention`,
        description: `Only ${Math.round(worstHabit.rate * 100)}% completion rate. Consider simplifying this habit or adjusting your approach.`,
        confidence: 0.8,
        actionable: true,
        icon: '⚠️',
        color: 'text-accent-error'
      });
    }

    // Check for missing context data
    const entriesWithContext = data.entries.filter(e => 
      e.mood !== undefined || e.energy_level !== undefined || e.effort !== undefined
    );
    
    if (entriesWithContext.length < data.entries.length * 0.3) {
      recommendations.push({
        id: 'context-tracking',
        type: 'recommendation',
        title: 'Track more context for better insights',
        description: 'Only tracking context for some entries. Enhanced logging helps identify patterns and optimize your habits.',
        confidence: 0.6,
        actionable: true,
        icon: '📝',
        color: 'text-accent-primary'
      });
    }

    return recommendations;
  };

  if (insights.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💡</span>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Building Insights</h3>
          <p className="text-text-secondary">
            Keep tracking habits to unlock personalized insights and recommendations.
          </p>
        </div>
      </div>
    );
  }

  const displayInsights = showDetailed ? insights : insights.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Pattern Insights</h3>
            <p className="text-sm text-text-secondary">
              AI-powered analysis of your habit patterns
            </p>
          </div>
          <div className="text-sm text-text-muted">
            {insights.length} insight{insights.length !== 1 ? 's' : ''} found
          </div>
        </div>

        <div className="space-y-4">
          {displayInsights.map(insight => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'achievement' ? 'bg-accent-success/5 border-accent-success' :
                insight.type === 'warning' ? 'bg-accent-error/5 border-accent-error' :
                insight.type === 'recommendation' ? 'bg-accent-primary/5 border-accent-primary' :
                'bg-accent-warning/5 border-accent-warning'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{insight.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${insight.color}`}>
                      {insight.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {insight.actionable && (
                        <span className="px-2 py-1 text-xs bg-accent-primary/20 text-accent-primary rounded-full">
                          Actionable
                        </span>
                      )}
                      <span className="text-xs text-text-muted">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!showDetailed && insights.length > 3 && (
          <div className="mt-4 text-center">
            <button className="text-accent-primary hover:text-accent-primary/80 text-sm font-medium">
              View all {insights.length} insights →
            </button>
          </div>
        )}
      </div>

      {showDetailed && (
        <div className="card">
          <h4 className="font-medium text-text-primary mb-4">How Insights Work</h4>
          <div className="space-y-3 text-sm text-text-secondary">
            <div className="flex items-start space-x-2">
              <span className="text-accent-success">•</span>
              <span><strong>Patterns:</strong> Identified from your habit completion data and context</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-accent-primary">•</span>
              <span><strong>Recommendations:</strong> Actionable suggestions to improve your success rate</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-accent-warning">•</span>
              <span><strong>Achievements:</strong> Recognition of your progress and milestones</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-accent-error">•</span>
              <span><strong>Warnings:</strong> Areas that need attention or adjustment</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatternInsights;