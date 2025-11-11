// UK Student Meal Planning Dashboard Component
// Drag-and-drop weekly meal planning interface

import React, { useState, useEffect } from 'react';
import type {
  MealPlan,
  Recipe,
  InventoryItem,
  ShoppingItem,
  CookingTimeLimits,
  WeeklyMeals,
  MealConstraints
} from '../../types/uk-student';
import { MealPlanningService } from '../../lib/uk-student/meal-planning-service';
import { InventoryService } from '../../lib/uk-student/inventory-service';

interface MealPlanningDashboardProps {
  userId: string;
  cookingTimeLimits: CookingTimeLimits;
  budget: number;
  dietaryRestrictions: string[];
}

interface DraggedRecipe {
  recipe: Recipe;
  sourceDay?: string;
  sourceMeal?: 'breakfast' | 'lunch' | 'dinner';
}

export const MealPlanningDashboard: React.FC<MealPlanningDashboardProps> = ({
  userId,
  cookingTimeLimits,
  budget,
  dietaryRestrictions
}) => {
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [suggestedRecipes, setSuggestedRecipes] = useState<Recipe[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [draggedRecipe, setDraggedRecipe] = useState<DraggedRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(new Date());

  const mealPlanningService = new MealPlanningService(userId);
  const inventoryService = new InventoryService(userId);

  useEffect(() => {
    loadInitialData();
  }, [userId, selectedWeek]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [inventoryData, recipesData] = await Promise.all([
        inventoryService.getAllInventory(),
        loadSuggestedRecipes()
      ]);
      
      setInventory(inventoryData);
      setSuggestedRecipes(recipesData);
      
      // Try to load existing meal plan for the week
      await loadExistingMealPlan();
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedRecipes = async (): Promise<Recipe[]> => {
    const availableIngredients = inventory.map(item => item.item_name);
    
    try {
      const [breakfast, lunch, dinner] = await Promise.all([
        mealPlanningService.suggestRecipes(
          availableIngredients,
          cookingTimeLimits.breakfast,
          { tags: ['breakfast'], limit: 10 }
        ),
        mealPlanningService.suggestRecipes(
          availableIngredients,
          cookingTimeLimits.lunch,
          { tags: ['lunch', 'quick'], limit: 10 }
        ),
        mealPlanningService.suggestRecipes(
          availableIngredients,
          cookingTimeLimits.dinner,
          { tags: ['dinner'], limit: 10 }
        )
      ]);

      return [...breakfast, ...lunch, ...dinner];
    } catch (error) {
      console.error('Error loading suggested recipes:', error);
      return [];
    }
  };

  const loadExistingMealPlan = async () => {
    // This would load from the database in a real implementation
    // For now, we'll generate a new plan if none exists
  };

  const generateNewMealPlan = async () => {
    setLoading(true);
    try {
      const constraints: MealConstraints = {
        budget,
        cookingTimeLimits,
        dietaryRestrictions,
        servings: 1,
        bulkCookingPreference: true,
        availableIngredients: inventory.map(item => item.item_name)
      };

      const newMealPlan = await mealPlanningService.generateWeeklyPlan(constraints);
      setMealPlan(newMealPlan);
    } catch (error) {
      console.error('Error generating meal plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (recipe: Recipe, sourceDay?: string, sourceMeal?: 'breakfast' | 'lunch' | 'dinner') => {
    setDraggedRecipe({ recipe, sourceDay, sourceMeal });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDay: string, targetMeal: 'breakfast' | 'lunch' | 'dinner') => {
    e.preventDefault();
    
    if (!draggedRecipe || !mealPlan) return;

    const updatedMeals = { ...mealPlan.meals };
    
    // Remove from source if moving within the plan
    if (draggedRecipe.sourceDay && draggedRecipe.sourceMeal) {
      updatedMeals[draggedRecipe.sourceDay] = {
        ...updatedMeals[draggedRecipe.sourceDay],
        [draggedRecipe.sourceMeal]: null
      };
    }

    // Add to target
    updatedMeals[targetDay] = {
      ...updatedMeals[targetDay],
      [targetMeal]: draggedRecipe.recipe
    };

    setMealPlan({
      ...mealPlan,
      meals: updatedMeals
    });

    setDraggedRecipe(null);
  };

  const removeMeal = (day: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    if (!mealPlan) return;

    const updatedMeals = { ...mealPlan.meals };
    updatedMeals[day] = {
      ...updatedMeals[day],
      [mealType]: null
    };

    setMealPlan({
      ...mealPlan,
      meals: updatedMeals
    });
  };

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedWeek);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading meal planning...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly Meal Planning</h1>
        <p className="text-gray-600">
          Drag and drop recipes to plan your meals. Budget: £{budget} | 
          Available ingredients: {inventory.length}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={generateNewMealPlan}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          Generate New Plan
        </button>
        
        <input
          type="week"
          value={selectedWeek.toISOString().slice(0, 10)}
          onChange={(e) => setSelectedWeek(new Date(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Recipe Suggestions Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4">Suggested Recipes</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {suggestedRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  draggable
                  onDragStart={() => handleDragStart(recipe)}
                  className="p-3 border border-gray-200 rounded-lg cursor-move hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-medium text-sm">{recipe.name}</h3>
                  <p className="text-xs text-gray-500">
                    {recipe.cooking_time + recipe.prep_time} min • 
                    Difficulty: {recipe.difficulty}/5
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recipe.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4">Weekly Meal Plan</h2>
            
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays().map((day) => {
                const dateKey = formatDate(day);
                const dayMeals = mealPlan?.meals[dateKey] || {};
                
                return (
                  <div key={dateKey} className="border border-gray-200 rounded-lg p-2">
                    <h3 className="font-medium text-center mb-2 text-sm">
                      {getDayName(day)}
                      <br />
                      <span className="text-xs text-gray-500">
                        {day.getDate()}/{day.getMonth() + 1}
                      </span>
                    </h3>
                    
                    {/* Breakfast */}
                    <MealSlot
                      mealType="breakfast"
                      recipe={dayMeals.breakfast}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateKey, 'breakfast')}
                      onRemove={() => removeMeal(dateKey, 'breakfast')}
                      onDragStart={(recipe) => handleDragStart(recipe, dateKey, 'breakfast')}
                      timeLimit={cookingTimeLimits.breakfast}
                    />
                    
                    {/* Lunch */}
                    <MealSlot
                      mealType="lunch"
                      recipe={dayMeals.lunch}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateKey, 'lunch')}
                      onRemove={() => removeMeal(dateKey, 'lunch')}
                      onDragStart={(recipe) => handleDragStart(recipe, dateKey, 'lunch')}
                      timeLimit={cookingTimeLimits.lunch}
                    />
                    
                    {/* Dinner */}
                    <MealSlot
                      mealType="dinner"
                      recipe={dayMeals.dinner}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, dateKey, 'dinner')}
                      onRemove={() => removeMeal(dateKey, 'dinner')}
                      onDragStart={(recipe) => handleDragStart(recipe, dateKey, 'dinner')}
                      timeLimit={cookingTimeLimits.dinner}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Shopping List */}
      {mealPlan && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">Shopping List</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mealPlan.shopping_list.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                <span>{item.name}</span>
                <span className="text-sm text-gray-500">
                  {item.quantity} {item.unit}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <p className="text-lg font-semibold">
              Estimated Total: £{mealPlan.total_cost?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// MealSlot Component for drag-and-drop functionality
interface MealSlotProps {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipe: Recipe | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: () => void;
  onDragStart: (recipe: Recipe) => void;
  timeLimit: number;
}

const MealSlot: React.FC<MealSlotProps> = ({
  mealType,
  recipe,
  onDragOver,
  onDrop,
  onRemove,
  onDragStart,
  timeLimit
}) => {
  const getMealTypeColor = () => {
    switch (mealType) {
      case 'breakfast': return 'bg-yellow-50 border-yellow-200';
      case 'lunch': return 'bg-green-50 border-green-200';
      case 'dinner': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const isTimeExceeded = recipe && (recipe.cooking_time + recipe.prep_time) > timeLimit;

  return (
    <div
      className={`mb-2 p-2 border-2 border-dashed rounded min-h-[80px] ${getMealTypeColor()} 
        ${recipe ? 'border-solid' : ''} transition-colors hover:bg-opacity-75`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="text-xs font-medium text-gray-600 mb-1 capitalize">
        {mealType} ({timeLimit}min)
      </div>
      
      {recipe ? (
        <div
          draggable
          onDragStart={() => onDragStart(recipe)}
          className={`cursor-move p-2 rounded ${isTimeExceeded ? 'bg-red-100 border-red-300' : 'bg-white'} 
            border shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-medium text-xs leading-tight">{recipe.name}</h4>
              <p className={`text-xs mt-1 ${isTimeExceeded ? 'text-red-600' : 'text-gray-500'}`}>
                {recipe.cooking_time + recipe.prep_time}min
                {isTimeExceeded && ' ⚠️'}
              </p>
            </div>
            <button
              onClick={onRemove}
              className="text-red-500 hover:text-red-700 text-xs ml-1"
              title="Remove meal"
            >
              ×
            </button>
          </div>
          
          {recipe.nutrition && (
            <div className="text-xs text-gray-500 mt-1">
              {recipe.nutrition.calories}cal • {recipe.nutrition.protein}g protein
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-xs">
          Drop recipe here
        </div>
      )}
    </div>
  );
};