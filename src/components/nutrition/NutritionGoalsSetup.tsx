// src/components/nutrition/NutritionGoalsSetup.tsx - Nutrition Goals Configuration
import React, { useState, useEffect } from 'react';

interface NutritionGoal {
  id: string;
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fat: number;
  daily_fiber: number;
  goal_type: string;
  activity_level: string;
  height_cm?: number;
  weight_kg?: number;
  age?: number;
  gender?: string;
}

export default function NutritionGoalsSetup() {
  const [goals, setGoals] = useState<NutritionGoal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    daily_calories: '',
    daily_protein: '',
    daily_carbs: '',
    daily_fat: '',
    daily_fiber: '25',
    goal_type: 'maintain',
    activity_level: 'moderate',
    height_cm: '',
    weight_kg: '',
    age: '',
    gender: ''
  });

  const goalTypes = [
    { value: 'lose_weight', label: 'Lose Weight' },
    { value: 'maintain', label: 'Maintain Weight' },
    { value: 'gain_weight', label: 'Gain Weight' },
    { value: 'bulk', label: 'Muscle Gain' },
    { value: 'cut', label: 'Cut (Lean)' }
  ];

  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
    { value: 'light', label: 'Light (light exercise 1-3 days/week)' },
    { value: 'moderate', label: 'Moderate (moderate exercise 3-5 days/week)' },
    { value: 'active', label: 'Active (hard exercise 6-7 days/week)' },
    { value: 'very_active', label: 'Very Active (physical job + exercise)' }
  ];

  // Auto-calculate macros based on goals
  const calculateMacros = () => {
    const { weight_kg, height_cm, age, gender, goal_type, activity_level } = formData;
    
    if (!weight_kg || !height_cm || !age || !gender) return;

    const weight = parseFloat(weight_kg);
    const height = parseFloat(height_cm);
    const ageNum = parseInt(age);

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * ageNum + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * ageNum - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    let calories = bmr * activityMultipliers[activity_level];

    // Adjust for goal
    if (goal_type === 'lose_weight') calories -= 500; // 1lb/week loss
    if (goal_type === 'gain_weight') calories += 500; // 1lb/week gain
    if (goal_type === 'bulk') calories += 300; // Moderate surplus
    if (goal_type === 'cut') calories -= 300; // Moderate deficit

    // Calculate macros
    const protein = weight * (goal_type === 'bulk' ? 2.2 : goal_type === 'cut' ? 2.5 : 1.8); // g per kg
    const fat = calories * 0.25 / 9; // 25% of calories from fat
    const carbs = (calories - (protein * 4) - (fat * 9)) / 4; // Remaining calories from carbs

    setFormData(prev => ({
      ...prev,
      daily_calories: Math.round(calories).toString(),
      daily_protein: Math.round(protein).toString(),
      daily_carbs: Math.round(carbs).toString(),
      daily_fat: Math.round(fat).toString()
    }));
  };

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/nutrition/goals');
      const data = await response.json();
      if (data.success && data.goal) {
        setGoals(data.goal);
        setFormData({
          daily_calories: data.goal.daily_calories.toString(),
          daily_protein: data.goal.daily_protein.toString(),
          daily_carbs: data.goal.daily_carbs.toString(),
          daily_fat: data.goal.daily_fat.toString(),
          daily_fiber: data.goal.daily_fiber.toString(),
          goal_type: data.goal.goal_type,
          activity_level: data.goal.activity_level,
          height_cm: data.goal.height_cm?.toString() || '',
          weight_kg: data.goal.weight_kg?.toString() || '',
          age: data.goal.age?.toString() || '',
          gender: data.goal.gender || ''
        });
      } else {
        setIsEditing(true); // No goals set, show setup form
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGoals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/nutrition/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setGoals(data.goal);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg">
        <div className="text-white text-center">Loading nutrition goals...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">🎯 Nutrition Goals</h2>
        {goals && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700"
          >
            Edit Goals
          </button>
        )}
      </div>

      {!isEditing && goals ? (
        /* Display Current Goals */
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{Math.round(goals.daily_calories)}</div>
              <div className="text-gray-400">Calories/day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{Math.round(goals.daily_protein)}g</div>
              <div className="text-gray-400">Protein/day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(goals.daily_carbs)}g</div>
              <div className="text-gray-400">Carbs/day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{Math.round(goals.daily_fat)}g</div>
              <div className="text-gray-400">Fat/day</div>
            </div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Goal:</span> 
                <span className="text-white ml-2 capitalize">{goals.goal_type.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-gray-400">Activity:</span> 
                <span className="text-white ml-2 capitalize">{goals.activity_level}</span>
              </div>
              {goals.weight_kg && (
                <div>
                  <span className="text-gray-400">Weight:</span> 
                  <span className="text-white ml-2">{goals.weight_kg} kg</span>
                </div>
              )}
              {goals.height_cm && (
                <div>
                  <span className="text-gray-400">Height:</span> 
                  <span className="text-white ml-2">{goals.height_cm} cm</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Edit Goals Form */
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-white font-medium mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <input
                type="number"
                placeholder="Age"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                className="bg-gray-600 text-white p-3 rounded"
              />
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="bg-gray-600 text-white p-3 rounded"
              >
                <option value="">Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <input
                type="number"
                placeholder="Weight (kg)"
                value={formData.weight_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                className="bg-gray-600 text-white p-3 rounded"
              />
              <input
                type="number"
                placeholder="Height (cm)"
                value={formData.height_cm}
                onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value }))}
                className="bg-gray-600 text-white p-3 rounded"
              />
            </div>
          </div>

          {/* Goals & Activity */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-white font-medium mb-4">Goals & Activity Level</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={formData.goal_type}
                onChange={(e) => setFormData(prev => ({ ...prev, goal_type: e.target.value }))}
                className="bg-gray-600 text-white p-3 rounded"
              >
                {goalTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <select
                value={formData.activity_level}
                onChange={(e) => setFormData(prev => ({ ...prev, activity_level: e.target.value }))}
                className="bg-gray-600 text-white p-3 rounded"
              >
                {activityLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto Calculate Button */}
          {formData.weight_kg && formData.height_cm && formData.age && formData.gender && (
            <button
              onClick={calculateMacros}
              className="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700"
            >
              🧮 Auto-Calculate Nutrition Goals
            </button>
          )}

          {/* Manual Nutrition Targets */}
          <div className="bg-gray-700 p-4 rounded">
            <h3 className="text-white font-medium mb-4">Daily Nutrition Targets</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="text-gray-400 block mb-2">Calories</label>
                <input
                  type="number"
                  value={formData.daily_calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_calories: e.target.value }))}
                  className="w-full bg-gray-600 text-white p-3 rounded"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-2">Protein (g)</label>
                <input
                  type="number"
                  value={formData.daily_protein}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_protein: e.target.value }))}
                  className="w-full bg-gray-600 text-white p-3 rounded"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-2">Carbs (g)</label>
                <input
                  type="number"
                  value={formData.daily_carbs}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_carbs: e.target.value }))}
                  className="w-full bg-gray-600 text-white p-3 rounded"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-2">Fat (g)</label>
                <input
                  type="number"
                  value={formData.daily_fat}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_fat: e.target.value }))}
                  className="w-full bg-gray-600 text-white p-3 rounded"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-2">Fiber (g)</label>
                <input
                  type="number"
                  value={formData.daily_fiber}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_fiber: e.target.value }))}
                  className="w-full bg-gray-600 text-white p-3 rounded"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={saveGoals}
              className="flex-1 bg-green-600 text-white py-3 rounded font-medium hover:bg-green-700"
            >
              Save Nutrition Goals
            </button>
            {goals && (
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}