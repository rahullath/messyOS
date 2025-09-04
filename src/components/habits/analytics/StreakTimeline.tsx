// src/components/habits/analytics/StreakTimeline.tsx - Streak visualization over time
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

interface StreakTimelineProps {
  data: AnalyticsData;
}

interface StreakPeriod {
  habitId: string;
  habitName: string;
  habitColor: string;
  startDate: string;
  endDate: string;
  length: number;
  isActive: boolean;
}

export function StreakTimeline({ data }: StreakTimelineProps) {
  const streakData = useMemo(() => {
    const streaks: StreakPeriod[] = [];
    
    data.habits.forEach(habit => {
      const habitEntries = data.entries
        .filter(e => e.habit_id === habit.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (habitEntries.length === 0) return;
      
      let currentStreak: { start: string; length: number } | null = null;
      let previousDate: Date | null = null;
      
      habitEntries.forEach((entry, index) => {
        const entryDate = new Date(entry.date);
        const isSuccess = entry.value === 1;
        
        if (isSuccess) {
          if (!currentStreak) {
            // Start new streak
            currentStreak = { start: entry.date, length: 1 };
          } else {
            // Continue streak if consecutive day
            if (previousDate && 
                entryDate.getTime() - previousDate.getTime() === 24 * 60 * 60 * 1000) {
              currentStreak.length++;
            } else {
              // Gap in streak, end current and start new
              if (currentStreak.length >= 2) {
                streaks.push({
                  habitId: habit.id,
                  habitName: habit.name,
                  habitColor: habit.color,
                  startDate: currentStreak.start,
                  endDate: previousDate?.toISOString().split('T')[0] || currentStreak.start,
                  length: currentStreak.length,
                  isActive: false
                });
              }
              currentStreak = { start: entry.date, length: 1 };
            }
          }
        } else {
          // Streak broken
          if (currentStreak && currentStreak.length >= 2) {
            streaks.push({
              habitId: habit.id,
              habitName: habit.name,
              habitColor: habit.color,
              startDate: currentStreak.start,
              endDate: previousDate?.toISOString().split('T')[0] || currentStreak.start,
              length: currentStreak.length,
              isActive: false
            });
          }
          currentStreak = null;
        }
        
        previousDate = entryDate;
      });
      
      // Handle ongoing streak
      if (currentStreak && currentStreak.length >= 2) {
        const today = new Date().toISOString().split('T')[0];
        const lastEntryDate = habitEntries[habitEntries.length - 1].date;
        const isActive = lastEntryDate === today || 
          new Date(today).getTime() - new Date(lastEntryDate).getTime() <= 24 * 60 * 60 * 1000;
        
        streaks.push({
          habitId: habit.id,
          habitName: habit.name,
          habitColor: habit.color,
          startDate: currentStreak.start,
          endDate: lastEntryDate,
          length: currentStreak.length,
          isActive
        });
      }
    });
    
    return streaks.sort((a, b) => b.length - a.length);
  }, [data]);

  const timelineData = useMemo(() => {
    if (streakData.length === 0) return null;
    
    const startDate = new Date(data.dateRange.start);
    const endDate = new Date(data.dateRange.end);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    return streakData.map(streak => {
      const streakStart = new Date(streak.startDate);
      const streakEnd = new Date(streak.endDate);
      
      const startOffset = Math.max(0, 
        Math.ceil((streakStart.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      );
      const width = Math.ceil((streakEnd.getTime() - streakStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      
      return {
        ...streak,
        startOffset: (startOffset / totalDays) * 100,
        width: (width / totalDays) * 100
      };
    });
  }, [streakData, data.dateRange]);

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔥</span>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No Streaks Found</h3>
          <p className="text-text-secondary">
            Complete habits consistently to build streaks and see them here.
          </p>
        </div>
      </div>
    );
  }

  const longestStreak = timelineData[0];
  const activeStreaks = timelineData.filter(s => s.isActive);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Streak Timeline</h3>
          <p className="text-sm text-text-secondary">
            Habit streaks over time (minimum 2 days)
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-text-muted">
            {activeStreaks.length} active streak{activeStreaks.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-surface-hover rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary">
            {longestStreak.length}
          </div>
          <div className="text-xs text-text-muted">Longest streak</div>
          <div className="text-xs text-accent-primary">{longestStreak.habitName}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary">
            {timelineData.length}
          </div>
          <div className="text-xs text-text-muted">Total streaks</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary">
            {activeStreaks.length}
          </div>
          <div className="text-xs text-text-muted">Active now</div>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-muted mb-2">
          <span>{new Date(data.dateRange.start).toLocaleDateString()}</span>
          <span>{new Date(data.dateRange.end).toLocaleDateString()}</span>
        </div>
        
        <div className="space-y-3">
          {timelineData.slice(0, 10).map((streak, index) => (
            <div key={`${streak.habitId}-${streak.startDate}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: streak.habitColor }}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {streak.habitName}
                  </span>
                  {streak.isActive && (
                    <span className="px-2 py-1 text-xs bg-accent-success/20 text-accent-success rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-text-primary">
                    {streak.length} days
                  </div>
                  <div className="text-xs text-text-muted">
                    {new Date(streak.startDate).toLocaleDateString()} - {new Date(streak.endDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              {/* Timeline bar */}
              <div className="relative w-full h-3 bg-surface-hover rounded-full overflow-hidden">
                <div 
                  className={`absolute h-full rounded-full transition-all duration-500 ${
                    streak.isActive ? 'animate-pulse' : ''
                  }`}
                  style={{ 
                    left: `${streak.startOffset}%`,
                    width: `${streak.width}%`,
                    backgroundColor: streak.habitColor,
                    opacity: streak.isActive ? 1 : 0.7
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {timelineData.length > 10 && (
          <div className="text-center pt-4 border-t border-border">
            <span className="text-sm text-text-muted">
              Showing top 10 streaks. {timelineData.length - 10} more available.
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 bg-accent-primary rounded-full" />
              <span>Completed streak</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 bg-accent-success rounded-full animate-pulse" />
              <span>Active streak</span>
            </div>
          </div>
          <span>Timeline: {data.dateRange.start} to {data.dateRange.end}</span>
        </div>
      </div>
    </div>
  );
}

export default StreakTimeline;