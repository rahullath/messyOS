// src/components/dashboard/cards/TodaysProgressCard.tsx - Today's Progress Overview
import React, { useState, useEffect } from 'react';

interface ProgressData {
  habits: {
    completed: number;
    total: number;
    completion_percentage: number;
  };
  tasks: {
    completed: number;
    due_today: number;
    overdue: number;
  };
  nutrition: {
    calories_consumed: number;
    calories_target: number;
    protein_consumed: number;
    protein_target: number;
  };
  active_workout?: {
    type: string;
    duration_minutes: number;
    started_at: string;
  };
}

export default function TodaysProgressCard() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProgressData();
    // Update every minute to keep workout timer fresh
    const interval = setInterval(fetchProgressData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchProgressData = async () => {
    try {
      // Mock data - replace with actual API calls
      setTimeout(() => {
        setProgressData({
          habits: {
            completed: 4,
            total: 7,
            completion_percentage: 57
          },
          tasks: {
            completed: 3,
            due_today: 8,
            overdue: 1
          },
          nutrition: {
            calories_consumed: 1420,
            calories_target: 2100,
            protein_consumed: 85,
            protein_target: 120
          },
          active_workout: {
            type: 'Upper Body Strength',
            duration_minutes: 32,
            started_at: new Date(Date.now() - 32 * 60 * 1000).toISOString()
          }
        });
        setIsLoading(false);
      }, 600);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      setIsLoading(false);
    }
  };

  const calculateCircleProgress = (percentage: number) => {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return { strokeDasharray, strokeDashoffset };
  };

  if (isLoading) {
    return (
      <div className="messy-card h-32">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-3"></div>
          <div className="flex space-x-4">
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-messy-border rounded"></div>
              <div className="h-3 bg-messy-border rounded w-3/4"></div>
            </div>
            <div className="w-12 h-12 bg-messy-border rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  const habitsProgress = calculateCircleProgress(progressData?.habits.completion_percentage || 0);
  const nutritionProgress = progressData ? (progressData.nutrition.calories_consumed / progressData.nutrition.calories_target) * 100 : 0;
  const proteinProgress = progressData ? (progressData.nutrition.protein_consumed / progressData.nutrition.protein_target) * 100 : 0;

  return (
    <div className="messy-card h-32 relative">
      <div className="flex items-center justify-between h-full">
        
        {/* Left Section - Habits Ring */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <svg width="48" height="48" className="transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                className="text-messy-border"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={habitsProgress.strokeDasharray}
                strokeDashoffset={habitsProgress.strokeDashoffset}
                className="text-messy-success transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-messy-primary font-bold text-sm">
                {progressData?.habits.completion_percentage}%
              </span>
            </div>
          </div>
          
          <div>
            <div className="text-messy-primary font-medium">Habits</div>
            <div className="text-messy-secondary text-sm">
              {progressData?.habits.completed}/{progressData?.habits.total} complete
            </div>
          </div>
        </div>

        {/* Middle Section - Tasks & Nutrition */}
        <div className="flex-1 mx-6 space-y-3">
          {/* Tasks */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm">📋</span>
              <span className="text-messy-secondary text-sm">Tasks</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-messy-success text-sm font-medium">
                {progressData?.tasks.completed}
              </span>
              <span className="text-messy-muted text-sm">/</span>
              <span className="text-messy-secondary text-sm">
                {progressData?.tasks.due_today}
              </span>
              {progressData && progressData.tasks.overdue > 0 && (
                <span className="text-messy-error text-xs font-medium ml-2">
                  +{progressData.tasks.overdue} overdue
                </span>
              )}
            </div>
          </div>

          {/* Nutrition Progress Bars */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-messy-secondary">Calories</span>
                <span className="text-messy-primary">
                  {progressData?.nutrition.calories_consumed}/{progressData?.nutrition.calories_target}
                </span>
              </div>
              <div className="w-full bg-messy-border rounded-full h-1.5">
                <div 
                  className="messy-progress-bar h-1.5 rounded-full"
                  style={{ width: `${Math.min(nutritionProgress, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-messy-secondary">Protein</span>
                <span className="text-messy-primary">
                  {progressData?.nutrition.protein_consumed}g/{progressData?.nutrition.protein_target}g
                </span>
              </div>
              <div className="w-full bg-messy-border rounded-full h-1.5">
                <div 
                  className="bg-messy-error h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(proteinProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Active Workout Timer */}
        {progressData?.active_workout ? (
          <div className="text-right">
            <div className="flex items-center space-x-2 mb-1">
              <span className="messy-status-active"></span>
              <span className="text-messy-success text-xs font-medium">ACTIVE</span>
            </div>
            <div className="text-messy-primary font-bold text-lg">
              {Math.floor(progressData.active_workout.duration_minutes / 60)}:
              {(progressData.active_workout.duration_minutes % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-messy-secondary text-xs">
              {progressData.active_workout.type}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <button className="messy-btn-secondary text-xs py-1 px-3">
              Start Workout
            </button>
          </div>
        )}
      </div>

      {/* Today's Date */}
      <div className="absolute top-2 right-3 text-messy-muted text-xs">
        {new Date().toLocaleDateString([], { 
          month: 'short', 
          day: 'numeric' 
        })}
      </div>
    </div>
  );
}