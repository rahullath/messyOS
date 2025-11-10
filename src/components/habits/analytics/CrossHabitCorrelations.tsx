// src/components/habits/analytics/CrossHabitCorrelations.tsx - Cross-habit correlation analysis
import React, { useMemo } from 'react';

interface Habit {
  id: string;
  name: string;
  color: string;
}

interface HabitEntry {
  id: string;
  habit_id: string;
  value: number;
  date: string;
}

interface AnalyticsData {
  habits: Habit[];
  entries: HabitEntry[];
}

interface CrossHabitCorrelationsProps {
  data: AnalyticsData;
}

interface Correlation {
  habit1: Habit;
  habit2: Habit;
  correlation: number;
  strength: 'weak' | 'moderate' | 'strong';
  insight: string;
}

const CrossHabitCorrelations: React.FC<CrossHabitCorrelationsProps> = ({ data }) => {
  const correlations = useMemo(() => {
    if (!data.habits || data.habits.length < 2 || !data.entries) {
      return [];
    }

    const habitPairs: Correlation[] = [];
    
    // Create all possible pairs of habits
    for (let i = 0; i < data.habits.length; i++) {
      for (let j = i + 1; j < data.habits.length; j++) {
        const habit1 = data.habits[i];
        const habit2 = data.habits[j];
        
        // Get entries for both habits, grouped by date
        const habit1Entries = data.entries.filter(e => e.habit_id === habit1.id);
        const habit2Entries = data.entries.filter(e => e.habit_id === habit2.id);
        
        // Create date-based lookup for correlation calculation
        const habit1ByDate = new Map(habit1Entries.map(e => [e.date, e.value > 0 ? 1 : 0]));
        const habit2ByDate = new Map(habit2Entries.map(e => [e.date, e.value > 0 ? 1 : 0]));
        
        // Find common dates
        const commonDates = Array.from(habit1ByDate.keys()).filter(date => habit2ByDate.has(date));
        
        if (commonDates.length < 5) continue; // Need at least 5 data points
        
        // Calculate Pearson correlation coefficient
        const correlation = calculateCorrelation(
          commonDates.map(date => habit1ByDate.get(date)!),
          commonDates.map(date => habit2ByDate.get(date)!)
        );
        
        if (!isNaN(correlation)) {
          const strength = getCorrelationStrength(Math.abs(correlation));
          const insight = generateInsight(habit1, habit2, correlation);
          
          habitPairs.push({
            habit1,
            habit2,
            correlation,
            strength,
            insight
          });
        }
      }
    }
    
    // Sort by absolute correlation strength
    return habitPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [data]);

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getCorrelationStrength = (absCorrelation: number): 'weak' | 'moderate' | 'strong' => {
    if (absCorrelation >= 0.7) return 'strong';
    if (absCorrelation >= 0.4) return 'moderate';
    return 'weak';
  };

  const generateInsight = (habit1: Habit, habit2: Habit, correlation: number): string => {
    const absCorr = Math.abs(correlation);
    const isPositive = correlation > 0;
    
    if (absCorr < 0.3) {
      return `${habit1.name} and ${habit2.name} appear to be independent of each other.`;
    }
    
    if (isPositive) {
      if (absCorr >= 0.7) {
        return `Strong positive correlation: When you do ${habit1.name}, you're very likely to also do ${habit2.name}.`;
      } else if (absCorr >= 0.4) {
        return `Moderate positive correlation: ${habit1.name} and ${habit2.name} often happen together.`;
      } else {
        return `Weak positive correlation: ${habit1.name} and ${habit2.name} sometimes happen together.`;
      }
    } else {
      if (absCorr >= 0.7) {
        return `Strong negative correlation: When you do ${habit1.name}, you're unlikely to do ${habit2.name}.`;
      } else if (absCorr >= 0.4) {
        return `Moderate negative correlation: ${habit1.name} and ${habit2.name} tend to compete with each other.`;
      } else {
        return `Weak negative correlation: ${habit1.name} and ${habit2.name} occasionally conflict.`;
      }
    }
  };

  const getCorrelationColor = (correlation: number): string => {
    const intensity = Math.abs(correlation);
    if (correlation > 0) {
      // Positive correlations in green shades
      if (intensity >= 0.7) return 'bg-green-100 border-green-500 text-green-800';
      if (intensity >= 0.4) return 'bg-green-50 border-green-300 text-green-700';
      return 'bg-green-25 border-green-200 text-green-600';
    } else {
      // Negative correlations in red shades
      if (intensity >= 0.7) return 'bg-red-100 border-red-500 text-red-800';
      if (intensity >= 0.4) return 'bg-red-50 border-red-300 text-red-700';
      return 'bg-red-25 border-red-200 text-red-600';
    }
  };

  if (correlations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cross-Habit Correlations</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500">
            Not enough data to calculate correlations. Track at least 2 habits for 5+ days to see patterns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Cross-Habit Correlations</h3>
        <div className="text-sm text-gray-500">
          {correlations.length} correlation{correlations.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="space-y-4">
        {correlations.slice(0, 10).map((corr, index) => (
          <div
            key={`${corr.habit1.id}-${corr.habit2.id}`}
            className={`p-4 rounded-lg border-2 ${getCorrelationColor(corr.correlation)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: corr.habit1.color }}
                  />
                  <span className="font-medium">{corr.habit1.name}</span>
                </div>
                <span className="text-gray-400">↔</span>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: corr.habit2.color }}
                  />
                  <span className="font-medium">{corr.habit2.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {corr.correlation > 0 ? '+' : ''}{(corr.correlation * 100).toFixed(0)}%
                </div>
                <div className="text-xs capitalize">{corr.strength}</div>
              </div>
            </div>
            <p className="text-sm">{corr.insight}</p>
          </div>
        ))}
      </div>

      {correlations.length > 10 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View all {correlations.length} correlations →
          </button>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Understanding Correlations</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Positive correlation:</strong> Habits that tend to happen together</p>
          <p><strong>Negative correlation:</strong> Habits that tend to compete with each other</p>
          <p><strong>Strength:</strong> Weak (&lt;40%), Moderate (40-70%), Strong (&gt;70%)</p>
        </div>
      </div>
    </div>
  );
};

export default CrossHabitCorrelations;