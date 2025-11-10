// src/components/nutrition/NutritionTracker.tsx - Comprehensive Nutrition Tracking Interface
import React, { useState, useEffect } from 'react';

interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  common_portions: Array<{name: string, grams: number}>;
  category: string;
}

interface FoodLog {
  id: string;
  food_id?: string;
  recipe_id?: string;
  quantity_grams: number;
  meal_type: string;
  logged_at: string;
  foods?: Food;
  recipes?: {name: string, servings: number};
  notes?: string;
}

interface NutritionSummary {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  meal_breakdown: Record<string, any>;
  goal_progress: Record<string, number>;
}

export default function NutritionTracker() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [foods, setFoods] = useState<Food[]>([]);
  const [dailyLogs, setDailyLogs] = useState<FoodLog[]>([]);
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddFood, setShowAddFood] = useState(false);
  
  // Quick logging form
  const [quantity, setQuantity] = useState('100');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [notes, setNotes] = useState('');

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  // Fetch foods based on search
  const searchFoods = async (search: string) => {
    if (!search || search.length < 2) {
      setFoods([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/nutrition/foods?search=${encodeURIComponent(search)}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setFoods(data.foods);
      }
    } catch (error) {
      console.error('Failed to search foods:', error);
    }
  };

  // Fetch daily logs and summary
  const fetchDailyData = async () => {
    setIsLoading(true);
    try {
      const [logsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/nutrition/log-food?date=${selectedDate}`),
        fetch(`/api/nutrition/daily-summary?date=${selectedDate}`)
      ]);

      const logsData = await logsResponse.json();
      const summaryData = await summaryResponse.json();

      if (logsData.success) {
        setDailyLogs(logsData.logs);
      }
      if (summaryData.success) {
        setSummary(summaryData.summary);
      }
    } catch (error) {
      console.error('Failed to fetch daily data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Log food
  const logFood = async () => {
    if (!selectedFood || !quantity) return;

    try {
      const response = await fetch('/api/nutrition/log-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: selectedFood.id,
          quantity_grams: parseFloat(quantity),
          meal_type: selectedMealType,
          notes,
          logged_at: `${selectedDate}T${new Date().toTimeString().split(' ')[0]}`
        })
      });

      const data = await response.json();
      if (data.success) {
        // Reset form
        setSelectedFood(null);
        setQuantity('100');
        setNotes('');
        setSearchTerm('');
        setFoods([]);
        setShowAddFood(false);
        
        // Refresh data
        await fetchDailyData();
      }
    } catch (error) {
      console.error('Failed to log food:', error);
    }
  };

  // Calculate nutrition for a given amount
  const calculateNutrition = (food: Food, grams: number) => {
    const multiplier = grams / 100;
    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10,
      fiber: Math.round(food.fiber * multiplier * 10) / 10
    };
  };

  useEffect(() => {
    fetchDailyData();
  }, [selectedDate]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchFoods(searchTerm);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <div className="bg-gray-900 min-h-screen p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">🥗 Nutrition Tracker</h1>
        
        {/* Date Selector */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-gray-800 text-white p-2 rounded border border-gray-700"
        />
      </div>

      {/* Daily Summary */}
      {summary && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h2 className="text-white font-medium mb-3">Daily Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{Math.round(summary.total_calories)}</div>
              <div className="text-gray-400 text-sm">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{Math.round(summary.total_protein)}g</div>
              <div className="text-gray-400 text-sm">Protein</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(summary.total_carbs)}g</div>
              <div className="text-gray-400 text-sm">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{Math.round(summary.total_fat)}g</div>
              <div className="text-gray-400 text-sm">Fat</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{Math.round(summary.total_fiber)}g</div>
              <div className="text-gray-400 text-sm">Fiber</div>
            </div>
          </div>

          {/* Goal Progress */}
          {summary.goal_progress && Object.keys(summary.goal_progress).length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(summary.goal_progress).map(([key, progress]) => (
                <div key={key} className="text-center">
                  <div className="text-sm text-gray-400 capitalize">{key.replace('_progress', '')}</div>
                  <div className={`text-sm font-medium ${
                    progress > 100 ? 'text-red-400' : progress > 80 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {progress}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Add Food Button */}
      <button
        onClick={() => setShowAddFood(!showAddFood)}
        className="w-full bg-cyan-600 text-white py-3 rounded-lg font-medium hover:bg-cyan-700 mb-4"
      >
        + Add Food
      </button>

      {/* Add Food Interface */}
      {showAddFood && (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
          <h3 className="text-white font-medium mb-4">Add Food</h3>
          
          {/* Meal Type Selector */}
          <div className="mb-4">
            <div className="grid grid-cols-4 gap-2">
              {mealTypes.map(meal => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`p-2 rounded capitalize ${
                    selectedMealType === meal 
                      ? 'bg-cyan-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>

          {/* Food Search */}
          <input
            type="text"
            placeholder="Search for food..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-700 text-white p-3 rounded mb-4"
          />

          {/* Food Results */}
          {foods.length > 0 && (
            <div className="space-y-2 mb-4">
              {foods.map(food => (
                <div
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className={`p-3 rounded cursor-pointer border-2 ${
                    selectedFood?.id === food.id
                      ? 'border-cyan-500 bg-gray-700'
                      : 'border-gray-600 bg-gray-750 hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">{food.name}</div>
                      <div className="text-gray-400 text-sm">{food.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white">{food.calories} cal</div>
                      <div className="text-gray-400 text-sm">per 100g</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity Input */}
          {selectedFood && (
            <div className="space-y-4">
              <div>
                <label className="text-white block mb-2">Quantity (grams)</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-gray-700 text-white p-3 rounded"
                />
                
                {/* Common Portions */}
                {selectedFood.common_portions && selectedFood.common_portions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFood.common_portions.map((portion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuantity(portion.grams.toString())}
                        className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-600"
                      >
                        {portion.name} ({portion.grams}g)
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nutrition Preview */}
              {quantity && (
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-white font-medium mb-2">Nutrition for {quantity}g:</div>
                  {(() => {
                    const nutrition = calculateNutrition(selectedFood, parseFloat(quantity));
                    return (
                      <div className="grid grid-cols-5 gap-2 text-sm">
                        <div className="text-center">
                          <div className="text-orange-400 font-medium">{nutrition.calories}</div>
                          <div className="text-gray-400">cal</div>
                        </div>
                        <div className="text-center">
                          <div className="text-red-400 font-medium">{nutrition.protein}g</div>
                          <div className="text-gray-400">protein</div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400 font-medium">{nutrition.carbs}g</div>
                          <div className="text-gray-400">carbs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-400 font-medium">{nutrition.fat}g</div>
                          <div className="text-gray-400">fat</div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-400 font-medium">{nutrition.fiber}g</div>
                          <div className="text-gray-400">fiber</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Notes */}
              <input
                type="text"
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded"
              />

              {/* Log Button */}
              <button
                onClick={logFood}
                className="w-full bg-green-600 text-white py-3 rounded font-medium hover:bg-green-700"
              >
                Log {selectedFood.name}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recent Logs */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-white font-medium mb-4">Today's Food Log</h3>
        
        {isLoading ? (
          <div className="text-gray-400 text-center py-4">Loading...</div>
        ) : dailyLogs.length === 0 ? (
          <div className="text-gray-400 text-center py-4">No food logged today</div>
        ) : (
          <div className="space-y-3">
            {mealTypes.map(mealType => {
              const mealLogs = dailyLogs.filter(log => log.meal_type === mealType);
              if (mealLogs.length === 0) return null;

              return (
                <div key={mealType} className="border-l-4 border-cyan-500 pl-4">
                  <h4 className="text-white font-medium capitalize mb-2">{mealType}</h4>
                  {mealLogs.map(log => (
                    <div key={log.id} className="bg-gray-700 p-3 rounded mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium">
                            {log.foods?.name || log.recipes?.name}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {log.quantity_grams}g
                            {log.notes && ` • ${log.notes}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">
                            {log.foods && Math.round((log.quantity_grams / 100) * log.foods.calories)} cal
                          </div>
                          <div className="text-gray-400 text-sm">
                            {new Date(log.logged_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}