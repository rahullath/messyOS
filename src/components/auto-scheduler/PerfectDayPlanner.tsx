/**
 * Perfect Day Planner Component
 * AI-powered daily schedule optimization interface
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Utensils, Dumbbell, Brain, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import type { OptimizedDayPlan, PerfectDayRequest } from '../../lib/task-management/auto-scheduler';

interface PerfectDayPlannerProps {
  userId: string;
  initialDate?: Date;
}

interface PlanSummary {
  optimization_score: number;
  tasks_scheduled: number;
  gym_session_scheduled: boolean;
  total_meal_cost: number;
  free_time_blocks: number;
  potential_conflicts: number;
  backup_plans_available: number;
}

export default function PerfectDayPlanner({ userId, initialDate }: PerfectDayPlannerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [optimizedPlan, setOptimizedPlan] = useState<OptimizedDayPlan | null>(null);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Partial<PerfectDayRequest>>({
    energy_preferences: {
      morning_energy: 'medium',
      afternoon_energy: 'medium',
      evening_energy: 'low'
    },
    gym_preferences: {
      preferred_time: 'morning',
      workout_type: 'mixed',
      duration_preference: 60
    },
    meal_preferences: {
      dietary_restrictions: [],
      calorie_target: 2200,
      protein_target: 120,
      cooking_time_limit: 45,
      budget_limit: 15
    },
    task_priorities: {
      focus_areas: ['assignments', 'projects'],
      deadline_urgency: 'moderate',
      complexity_preference: 'complex_tasks_first'
    },
    external_constraints: {
      weather_sensitivity: 'medium',
      budget_consciousness: 'medium',
      time_flexibility: 'moderate'
    }
  });

  // Load existing plan when date changes
  useEffect(() => {
    loadExistingPlan();
  }, [selectedDate]);

  const loadExistingPlan = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(`/api/auto-scheduler/generate-perfect-day?date=${dateStr}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setOptimizedPlan(result.data.plan);
        setPlanSummary(result.data.summary);
      } else {
        setOptimizedPlan(null);
        setPlanSummary(null);
      }
    } catch (error) {
      console.error('Failed to load existing plan:', error);
      setOptimizedPlan(null);
      setPlanSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePerfectDay = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const request: PerfectDayRequest = {
        user_id: userId,
        date: selectedDate,
        ...preferences
      };

      const response = await fetch('/api/auto-scheduler/generate-perfect-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to generate perfect day');
      }

      if (result.success) {
        setOptimizedPlan(result.data.plan);
        setPlanSummary(result.data.summary);
        setError(null);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Perfect day generation failed:', error);
      setError(error.message);
      setOptimizedPlan(null);
      setPlanSummary(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { 
      style: 'currency', 
      currency: 'GBP' 
    }).format(amount);
  };

  const getOptimizationScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              Perfect Day Planner
            </h1>
            <p className="text-gray-600 mt-1">
              AI-optimized daily scheduling for Birmingham UK
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              min={new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <button
              onClick={generatePerfectDay}
              disabled={isGenerating}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Generate Perfect Day
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Preferences */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Morning Energy
            </label>
            <select
              value={preferences.energy_preferences?.morning_energy || 'medium'}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                energy_preferences: {
                  ...prev.energy_preferences,
                  morning_energy: e.target.value as 'low' | 'medium' | 'high'
                }
              }))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gym Preference
            </label>
            <select
              value={preferences.gym_preferences?.preferred_time || 'morning'}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                gym_preferences: {
                  ...prev.gym_preferences,
                  preferred_time: e.target.value as 'morning' | 'afternoon' | 'evening' | 'flexible'
                }
              }))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meal Budget
            </label>
            <select
              value={preferences.meal_preferences?.budget_limit || 15}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                meal_preferences: {
                  ...prev.meal_preferences,
                  budget_limit: Number(e.target.value)
                }
              }))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>£10/day</option>
              <option value={15}>£15/day</option>
              <option value={20}>£20/day</option>
              <option value={25}>£25/day</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weather Sensitivity
            </label>
            <select
              value={preferences.external_constraints?.weather_sensitivity || 'medium'}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                external_constraints: {
                  ...prev.external_constraints,
                  weather_sensitivity: e.target.value as 'low' | 'medium' | 'high'
                }
              }))}
              className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-medium text-red-800">Generation Failed</h3>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading existing plan...</p>
        </div>
      )}

      {/* Plan Summary */}
      {planSummary && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Plan Summary
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getOptimizationScoreColor(planSummary.optimization_score)}`}>
                {planSummary.optimization_score}% Optimized
              </div>
              <p className="text-xs text-gray-500 mt-1">Overall Score</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{planSummary.tasks_scheduled}</div>
              <p className="text-xs text-gray-500">Tasks Scheduled</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {planSummary.gym_session_scheduled ? '✅' : '❌'}
              </div>
              <p className="text-xs text-gray-500">Gym Session</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(planSummary.total_meal_cost)}
              </div>
              <p className="text-xs text-gray-500">Meal Cost</p>
            </div>
          </div>
        </div>
      )}

      {/* Optimized Plan Display */}
      {optimizedPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Schedule Timeline */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Daily Schedule
            </h3>
            
            <div className="space-y-3">
              {/* Wake Up */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-16 text-sm font-medium text-blue-700">
                  {formatTime(optimizedPlan.wake_up_time)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-blue-900">Wake Up</div>
                  <div className="text-sm text-blue-700">
                    {Math.round(optimizedPlan.sleep_schedule.recommended_duration / 60)}h sleep
                  </div>
                </div>
              </div>

              {/* Gym Session */}
              {optimizedPlan.gym_session && (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-16 text-sm font-medium text-green-700">
                    {formatTime(optimizedPlan.gym_session.scheduled_time.start)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-green-900 flex items-center gap-2">
                      <Dumbbell className="w-4 h-4" />
                      Gym Session
                    </div>
                    <div className="text-sm text-green-700">
                      {optimizedPlan.gym_session.workout_duration}min workout + 
                      {optimizedPlan.gym_session.travel_time * 2}min travel ({optimizedPlan.gym_session.travel_method})
                    </div>
                  </div>
                </div>
              )}

              {/* Meals */}
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-16 text-sm font-medium text-orange-700">
                  {formatTime(optimizedPlan.meal_plan.breakfast.timing)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-orange-900 flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    Breakfast ({optimizedPlan.meal_plan.breakfast.location})
                  </div>
                  <div className="text-sm text-orange-700">
                    {optimizedPlan.meal_plan.breakfast.macros.calories} cal, 
                    {optimizedPlan.meal_plan.breakfast.macros.protein}g protein
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-16 text-sm font-medium text-orange-700">
                  {formatTime(optimizedPlan.meal_plan.lunch.timing)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-orange-900 flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    Lunch ({optimizedPlan.meal_plan.lunch.location})
                  </div>
                  <div className="text-sm text-orange-700">
                    {optimizedPlan.meal_plan.lunch.restaurant_option?.name || 'Home cooked'} - 
                    {formatCurrency(optimizedPlan.meal_plan.lunch.cost_estimate)}
                  </div>
                </div>
              </div>

              {/* Tasks */}
              {optimizedPlan.task_blocks.map((taskBlock, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="w-16 text-sm font-medium text-purple-700">
                    {formatTime(taskBlock.scheduled_time.start)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-purple-900">{taskBlock.task.title}</div>
                    <div className="text-sm text-purple-700">
                      {taskBlock.scheduled_time.duration}min • 
                      {taskBlock.task.complexity} • 
                      {taskBlock.energy_match_score}% energy match
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights & Details */}
          <div className="space-y-6">
            {/* AI Reasoning */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI Reasoning
              </h3>
              
              <div className="space-y-2">
                {optimizedPlan.ai_reasoning.map((reason, index) => (
                  <div key={index} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                    {reason}
                  </div>
                ))}
              </div>
            </div>

            {/* Travel Optimization */}
            {optimizedPlan.travel_optimization.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Travel Plan
                </h3>
                
                <div className="space-y-3">
                  {optimizedPlan.travel_optimization.map((travel, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900">
                        {travel.from.name} → {travel.to.name}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {travel.method} • {travel.duration}min • {formatCurrency(travel.cost)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Weather: {travel.weather_impact.condition} ({travel.weather_impact.cycling_recommendation} for cycling)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Potential Conflicts */}
            {optimizedPlan.potential_conflicts.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Potential Issues
                </h3>
                
                <div className="space-y-2">
                  {optimizedPlan.potential_conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm text-yellow-700 p-2 bg-yellow-50 rounded">
                      {conflict}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Plan State */}
      {!isLoading && !optimizedPlan && !error && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Plan Generated Yet</h3>
          <p className="text-gray-600 mb-4">
            Generate your perfect day plan to see an AI-optimized schedule with gym, meals, tasks, and travel.
          </p>
          <button
            onClick={generatePerfectDay}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate Perfect Day
          </button>
        </div>
      )}
    </div>
  );
}