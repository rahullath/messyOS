// src/components/habits/analytics/CompletionRateChart.tsx - Completion rate visualization
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
}

interface AnalyticsData {
  habits: Habit[];
  entries: HabitEntry[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface CompletionRateChartProps {
  data: AnalyticsData;
}

export function CompletionRateChart({ data }: CompletionRateChartProps) {
  const chartData = useMemo(() => {
    // Calculate completion rates for each habit
    const habitRates = data.habits.map(habit => {
      const habitEntries = data.entries.filter(e => e.habit_id === habit.id);
      const totalEntries = habitEntries.length;
      const successfulEntries = habitEntries.filter(e => e.value === 1).length;
      const completionRate = totalEntries > 0 ? (successfulEntries / totalEntries) * 100 : 0;
      
      return {
        habit,
        totalEntries,
        successfulEntries,
        completionRate,
        color: habit.color
      };
    });

    // Sort by completion rate
    return habitRates.sort((a, b) => b.completionRate - a.completionRate);
  }, [data]);

  const maxRate = Math.max(...chartData.map(d => d.completionRate), 100);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Completion Rates</h3>
          <p className="text-sm text-text-secondary">Success rate by habit</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-muted">
            {data.entries.length} total entries
          </p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-text-muted">No data available for selected habits</p>
        </div>
      ) : (
        <div className="space-y-4">
          {chartData.map((item, index) => (
            <div key={item.habit.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-text-primary">
                    {item.habit.name}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.habit.type === 'build' 
                      ? 'bg-accent-success/20 text-accent-success' 
                      : item.habit.type === 'break'
                      ? 'bg-accent-error/20 text-accent-error'
                      : 'bg-accent-warning/20 text-accent-warning'
                  }`}>
                    {item.habit.type}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-text-primary">
                    {Math.round(item.completionRate)}%
                  </span>
                  <p className="text-xs text-text-muted">
                    {item.successfulEntries}/{item.totalEntries}
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-surface-hover rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${(item.completionRate / maxRate) * 100}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Completion Rate</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-accent-success rounded-full" />
              <span>Build</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-accent-error rounded-full" />
              <span>Break</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-accent-warning rounded-full" />
              <span>Maintain</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompletionRateChart;