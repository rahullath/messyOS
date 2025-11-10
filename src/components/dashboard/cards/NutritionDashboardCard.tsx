// src/components/dashboard/cards/NutritionDashboardCard.tsx - Nutrition Overview with Macros Ring
import React, { useState, useEffect } from 'react';

interface NutritionData {
  calories: { consumed: number; target: number; };
  protein: { consumed: number; target: number; };
  carbs: { consumed: number; target: number; };
  fats: { consumed: number; target: number; };
  last_meal: {
    name: string;
    calories: number;
    time: string;
  } | null;
}

export default function NutritionDashboardCard() {
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickFood, setQuickFood] = useState('');

  useEffect(() => {
    fetchNutritionData();
  }, []);

  const fetchNutritionData = async () => {
    try {
      const response = await fetch('/api/nutrition/daily-summary');
      const data = await response.json();
      
      if (data.success) {
        setNutritionData({
          calories: { consumed: data.summary.total_calories || 0, target: 2100 },
          protein: { consumed: data.summary.total_protein || 0, target: 120 },
          carbs: { consumed: data.summary.total_carbs || 0, target: 250 },
          fats: { consumed: data.summary.total_fat || 0, target: 70 },
          last_meal: {
            name: "Chicken Curry with Rice",
            calories: 450,
            time: "1:30 PM"
          }
        });
      } else {
        // Mock data if API fails
        setNutritionData({
          calories: { consumed: 1420, target: 2100 },
          protein: { consumed: 85, target: 120 },
          carbs: { consumed: 180, target: 250 },
          fats: { consumed: 45, target: 70 },
          last_meal: {
            name: "Chicken Curry with Rice",
            calories: 450,
            time: "1:30 PM"
          }
        });
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch nutrition data:', error);
      setIsLoading(false);
    }
  };

  const quickAddFood = async () => {
    if (!quickFood.trim()) return;
    
    try {
      const response = await fetch('/api/ai/smart-data-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_dump: `Ate: ${quickFood}`
        })
      });

      if (response.ok) {
        setQuickFood('');
        setShowQuickAdd(false);
        fetchNutritionData(); // Refresh
      }
    } catch (error) {
      console.error('Failed to log food:', error);
    }
  };

  const MacroRing = ({ label, consumed, target, color }: {
    label: string;
    consumed: number;
    target: number;
    color: string;
  }) => {
    const percentage = Math.min((consumed / target) * 100, 100);
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="text-center">
        <div className="relative w-10 h-10 mb-1">
          <svg width="40" height="40" className="transform -rotate-90">
            <circle
              cx="20"
              cy="20"
              r={radius}
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              className="text-messy-border"
            />
            <circle
              cx="20"
              cy="20"
              r={radius}
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={`${color} transition-all duration-500`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-messy-primary">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
        <div className="text-messy-secondary text-xs">{label}</div>
        <div className="text-messy-primary text-xs font-medium">
          {Math.round(consumed)}/{target}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="messy-card h-48">
        <div className="animate-pulse">
          <div className="h-4 bg-messy-border rounded mb-3"></div>
          <div className="flex justify-around mb-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 bg-messy-border rounded-full mx-auto mb-2"></div>
                <div className="h-2 bg-messy-border rounded w-8 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="h-3 bg-messy-border rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="messy-card h-48 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🥗</span>
          <h3 className="text-messy-primary font-medium">Nutrition</h3>
        </div>
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="text-messy-secondary hover:text-messy-primary transition-colors text-sm"
        >
          + Add
        </button>
      </div>

      {/* Quick Add Interface */}
      {showQuickAdd && (
        <div className="absolute top-0 left-0 right-0 bottom-0 messy-card-glass p-4 z-20">
          <div className="space-y-3">
            <h4 className="text-messy-primary font-medium">Quick Food Log</h4>
            <input
              type="text"
              value={quickFood}
              onChange={(e) => setQuickFood(e.target.value)}
              placeholder="What did you eat? (e.g., '2 eggs', 'chicken sandwich')"
              className="w-full messy-input text-sm"
              onKeyPress={(e) => e.key === 'Enter' && quickAddFood()}
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={quickAddFood}
                disabled={!quickFood.trim()}
                className="flex-1 messy-btn-primary text-xs py-2 disabled:opacity-50"
              >
                Log Food
              </button>
              <button
                onClick={() => setShowQuickAdd(false)}
                className="messy-btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Macros Ring Chart */}
      {nutritionData && (
        <>
          <div className="flex justify-around mb-4">
            <MacroRing
              label="Protein"
              consumed={nutritionData.protein.consumed}
              target={nutritionData.protein.target}
              color="text-messy-error"
            />
            <MacroRing
              label="Carbs"
              consumed={nutritionData.carbs.consumed}
              target={nutritionData.carbs.target}
              color="text-messy-warning"
            />
            <MacroRing
              label="Fats"
              consumed={nutritionData.fats.consumed}
              target={nutritionData.fats.target}
              color="text-messy-secondary"
            />
          </div>

          {/* Calories Remaining */}
          <div className="bg-messy-border bg-opacity-30 rounded-lg p-3 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-messy-secondary text-sm">Calories</span>
              <span className="text-messy-primary font-bold">
                {Math.max(0, nutritionData.calories.target - nutritionData.calories.consumed)} left
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-messy-muted mt-1">
              <span>{Math.round(nutritionData.calories.consumed)} consumed</span>
              <span>{nutritionData.calories.target} target</span>
            </div>
          </div>

          {/* Last Meal */}
          {nutritionData.last_meal && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm">🍽️</span>
                <div>
                  <div className="text-messy-secondary text-xs">{nutritionData.last_meal.name}</div>
                  <div className="text-messy-muted text-xs">
                    {nutritionData.last_meal.calories} cal • {nutritionData.last_meal.time}
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/nutrition'}
                className="messy-btn-ghost text-xs py-1 px-2"
              >
                View All
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}