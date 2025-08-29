// src/components/dashboard/cards/HabitsOverviewCard.tsx - Habits Overview with Heatmap
import React, { useState, useEffect } from 'react';

interface Habit {
  id: string;
  name: string;
  icon: string;
  completed_today: boolean;
  current_streak: number;
  type: 'boolean' | 'measurement' | 'time';
  target_value?: number;
  current_value?: number;
  unit?: string;
}

interface HabitCompletion {
  date: string;
  completed: boolean;
  value?: number;
}

export default function HabitsOverviewCard() {
  const [todaysHabits, setTodaysHabits] = useState<Habit[]>([]);
  const [weeklyData, setWeeklyData] = useState<HabitCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHabitsData();
  }, []);

  const fetchHabitsData = async () => {
    try {
      // Mock data - replace with actual API calls
      setTimeout(() => {
        setTodaysHabits([
          {
            id: '1',
            name: 'Morning Workout',
            icon: '🏋️',
            completed_today: true,
            current_streak: 5,
            type: 'time',
            target_value: 45,
            current_value: 60,
            unit: 'min'
          },
          {
            id: '2',
            name: 'Read',
            icon: '📚',
            completed_today: false,
            current_streak: 12,
            type: 'time',
            target_value: 30,
            current_value: 0,
            unit: 'min'
          },
          {
            id: '3',
            name: 'Water',
            icon: '💧',
            completed_today: false,
            current_streak: 3,
            type: 'measurement',
            target_value: 3,
            current_value: 1.5,
            unit: 'L'
          },
          {
            id: '4',
            name: 'Meditate',
            icon: '🧘',
            completed_today: true,
            current_streak: 8,
            type: 'boolean'
          }
        ]);

        // Generate weekly heatmap data
        const weekData = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          weekData.push({
            date: date.toISOString().split('T')[0],
            completed: Math.random() > 0.3 // 70% completion rate
          });
        }
        setWeeklyData(weekData);
        setIsLoading(false);
      }, 700);
    } catch (error) {
      console.error('Failed to fetch habits data:', error);
      setIsLoading(false);
    }
  };

  const completeHabit = async (habitId: string) => {
    setTodaysHabits(prev => prev.map(habit => 
      habit.id === habitId 
        ? { ...habit, completed_today: !habit.completed_today }
        : habit
    ));
  };

  const getCompletionRate = () => {
    if (todaysHabits.length === 0) return 0;
    const completed = todaysHabits.filter(h => h.completed_today).length;
    return Math.round((completed / todaysHabits.length) * 100);
  };

  const getLongestStreak = () => {
    return Math.max(...todaysHabits.map(h => h.current_streak), 0);
  };

  if (isLoading) {
    return (
      <div className="messy-card h-48">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-3"></div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-messy-border rounded"></div>
                <div className="flex-1 h-3 bg-messy-border rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="messy-card h-48">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-messy-primary font-medium">Habits</h3>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-center">
            <div className="text-messy-success font-bold text-sm">{getCompletionRate()}%</div>
            <div className="text-messy-muted text-xs">today</div>
          </div>
          <div className="text-center">
            <div className="text-messy-warning font-bold text-sm">{getLongestStreak()}</div>
            <div className="text-messy-muted text-xs">streak</div>
          </div>
        </div>
      </div>

      {/* Today's Habits Grid */}
      <div className="space-y-2 mb-4">
        {todaysHabits.slice(0, 4).map((habit) => (
          <div key={habit.id} className="flex items-center space-x-3">
            <button
              onClick={() => completeHabit(habit.id)}
              className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                habit.completed_today
                  ? 'bg-messy-success border-messy-success text-white'
                  : 'border-messy-border hover:border-messy-primary'
              }`}
            >
              {habit.completed_today && (
                <span className="text-xs">✓</span>
              )}
            </button>
            
            <div className="flex items-center space-x-2 flex-1">
              <span className="text-sm">{habit.icon}</span>
              <span className="text-messy-secondary text-sm">{habit.name}</span>
              {habit.current_streak > 0 && (
                <span className="text-messy-warning text-xs">
                  {habit.current_streak}🔥
                </span>
              )}
            </div>

            {/* Progress for measurement habits */}
            {habit.type !== 'boolean' && (
              <div className="text-right">
                <span className={`text-xs font-medium ${
                  (habit.current_value || 0) >= (habit.target_value || 0)
                    ? 'text-messy-success'
                    : 'text-messy-warning'
                }`}>
                  {habit.current_value}/{habit.target_value} {habit.unit}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Weekly Heatmap */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-messy-secondary text-xs">This Week</span>
          <button className="text-messy-primary text-xs hover:underline">
            Past Logging
          </button>
        </div>
        <div className="flex space-x-1">
          {weeklyData.map((day, index) => (
            <div
              key={day.date}
              className={`w-6 h-6 rounded text-xs flex items-center justify-center transition-colors ${
                day.completed
                  ? 'bg-messy-success text-white'
                  : 'bg-messy-border text-messy-muted hover:bg-messy-card-hover'
              }`}
              title={new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
            >
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(day.date).getDay()]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}