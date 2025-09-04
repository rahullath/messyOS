// src/components/habits/analytics/HeatmapCalendar.tsx - Calendar heatmap visualization
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
  dateRange: {
    start: string;
    end: string;
  };
}

interface HeatmapCalendarProps {
  data: AnalyticsData;
}

export function HeatmapCalendar({ data }: HeatmapCalendarProps) {
  const calendarData = useMemo(() => {
    const startDate = new Date(data.dateRange.start);
    const endDate = new Date(data.dateRange.end);
    const days = [];
    
    // Generate all days in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Calculate completion rate for this day
      const dayEntries = data.entries.filter(e => e.date === dateStr);
      const totalPossible = data.habits.length;
      const completed = dayEntries.filter(e => e.value === 1).length;
      const completionRate = totalPossible > 0 ? completed / totalPossible : 0;
      
      days.push({
        date: dateStr,
        dayOfWeek: currentDate.getDay(),
        dayOfMonth: currentDate.getDate(),
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        completionRate,
        completed,
        totalPossible,
        entries: dayEntries
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [data]);

  const getIntensityClass = (rate: number) => {
    if (rate === 0) return 'bg-surface-hover';
    if (rate <= 0.25) return 'bg-accent-success/20';
    if (rate <= 0.5) return 'bg-accent-success/40';
    if (rate <= 0.75) return 'bg-accent-success/60';
    return 'bg-accent-success';
  };

  const getIntensityLabel = (rate: number) => {
    if (rate === 0) return 'No activity';
    if (rate <= 0.25) return 'Low activity';
    if (rate <= 0.5) return 'Moderate activity';
    if (rate <= 0.75) return 'High activity';
    return 'Very high activity';
  };

  // Group days by week
  const weeks = useMemo(() => {
    const weekGroups: typeof calendarData[][] = [];
    let currentWeek: typeof calendarData = [];
    
    calendarData.forEach((day, index) => {
      if (index === 0) {
        // Add empty cells for days before the start of the first week
        for (let i = 0; i < day.dayOfWeek; i++) {
          currentWeek.push(null as any);
        }
      }
      
      currentWeek.push(day);
      
      if (day.dayOfWeek === 6 || index === calendarData.length - 1) {
        // End of week or last day
        weekGroups.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weekGroups;
  }, [calendarData]);

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Activity Heatmap</h3>
          <p className="text-sm text-text-secondary">Daily completion patterns</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-xs text-text-muted text-center py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar weeks */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`aspect-square rounded-sm border border-border/50 ${
                        day ? getIntensityClass(day.completionRate) : 'bg-transparent'
                      } ${day ? 'hover:ring-2 hover:ring-accent-primary/50 cursor-pointer' : ''}`}
                      title={day ? 
                        `${day.date}: ${day.completed}/${day.totalPossible} habits completed (${Math.round(day.completionRate * 100)}%)` : 
                        ''
                      }
                    >
                      {day && (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-text-primary font-medium">
                            {day.dayOfMonth}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-xs text-text-muted">
            <span>Less</span>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-surface-hover rounded-sm border border-border/50" />
              <div className="w-3 h-3 bg-accent-success/20 rounded-sm" />
              <div className="w-3 h-3 bg-accent-success/40 rounded-sm" />
              <div className="w-3 h-3 bg-accent-success/60 rounded-sm" />
              <div className="w-3 h-3 bg-accent-success rounded-sm" />
            </div>
            <span>More</span>
          </div>
          
          <div className="text-xs text-text-muted">
            {calendarData.length} days tracked
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-semibold text-text-primary">
              {calendarData.filter(d => d.completionRate === 1).length}
            </div>
            <div className="text-xs text-text-muted">Perfect days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-text-primary">
              {calendarData.filter(d => d.completionRate > 0).length}
            </div>
            <div className="text-xs text-text-muted">Active days</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-text-primary">
              {Math.round(calendarData.reduce((sum, d) => sum + d.completionRate, 0) / calendarData.length * 100)}%
            </div>
            <div className="text-xs text-text-muted">Avg completion</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeatmapCalendar;