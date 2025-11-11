/**
 * AI Auto-Scheduler for Perfect Day Planning
 * Creates optimized daily schedules considering sleep, classes, gym, meals, travel, and tasks
 * Birmingham UK context with cycling routes, weather, and local services
 */

import { supabase } from '../supabase/client';
import { calendarService } from '../calendar/calendar-service';
import { TaskService } from './task-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';
import type { CalendarEvent, TimeSlot } from '../../types/calendar';
import type { Task } from '../../types/task-management';

// Birmingham UK specific types
export interface BirminghamLocation {
  id: string;
  name: string;
  address: string;
  type: 'gym' | 'university' | 'supermarket' | 'restaurant' | 'home' | 'transport_hub';
  coordinates: { lat: number; lng: number };
  cycling_distance_from_home: number; // miles
  cycling_time_estimate: number; // minutes
  train_time_estimate?: number; // minutes
  walking_time_estimate?: number; // minutes
  cost_considerations?: {
    cycling: number;
    train: number;
    walking: number;
  };
}

export interface SleepData {
  date: string;
  duration: number; // minutes
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  wake_up_time?: string; // ISO time string
  bed_time?: string; // ISO time string
}

export interface GymSession {
  scheduled_time: TimeSlot;
  travel_method: 'cycling' | 'train' | 'walking';
  travel_time: number; // minutes each way
  workout_duration: number; // minutes
  shower_time: number; // minutes
  total_time_required: number; // minutes
  energy_optimization_score: number; // 0-100
  weather_consideration?: WeatherImpact;
}

export interface MealPlan {
  breakfast: MealDetails;
  lunch: MealDetails;
  dinner: MealDetails;
  snacks: MealDetails[];
  total_macros: MacroBreakdown;
  shopping_list: IngredientList;
  total_cost_estimate: number;
}

export interface MealDetails {
  timing: Date;
  location: 'home' | 'university' | 'restaurant' | 'takeaway';
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: Ingredient[];
  macros: MacroBreakdown;
  preparation_time: number; // minutes
  cost_estimate: number;
  restaurant_option?: {
    name: string;
    location: string;
    delivery_service?: 'deliveroo' | 'uber_eats' | 'just_eat';
  };
}

export interface MacroBreakdown {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber?: number; // grams
}

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  cost_estimate: number;
  supermarket_preference?: string;
}

export interface IngredientList {
  items: Ingredient[];
  total_cost: number;
  recommended_supermarket: string;
  shopping_route_optimization?: {
    distance: number;
    travel_method: 'cycling' | 'walking' | 'train';
    estimated_time: number;
  };
}

export interface WeatherImpact {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  temperature: number; // celsius
  precipitation_chance: number; // percentage
  cycling_recommendation: 'ideal' | 'acceptable' | 'challenging' | 'avoid';
  alternative_transport_suggested?: 'train' | 'walking' | 'indoor_activity';
}

export interface OptimizedDayPlan {
  date: Date;
  user_id: string;
  wake_up_time: Date;
  sleep_schedule: {
    target_bedtime: Date;
    target_wake_time: Date;
    recommended_duration: number; // minutes
  };
  gym_session?: GymSession;
  meal_plan: MealPlan;
  class_schedule: CalendarEvent[];
  task_blocks: TaskBlock[];
  travel_optimization: TravelPlan[];
  free_time_blocks: TimeSlot[];
  optimization_score: number; // 0-100
  birmingham_context: BirminghamContext;
  ai_reasoning: string[];
  potential_conflicts: string[];
  backup_plans: BackupPlan[];
}

export interface TaskBlock {
  task: Task;
  scheduled_time: TimeSlot;
  energy_match_score: number; // 0-100
  complexity_appropriateness: number; // 0-100
  deadline_pressure: number; // 0-100
  location_context?: string;
  prerequisites_met: boolean;
}

export interface TravelPlan {
  from: BirminghamLocation;
  to: BirminghamLocation;
  method: 'cycling' | 'train' | 'walking';
  duration: number; // minutes
  cost: number;
  route_details?: {
    distance: number; // miles
    elevation_gain?: number; // meters
    traffic_consideration?: string;
  };
  weather_impact: WeatherImpact;
  alternative_options: {
    method: 'cycling' | 'train' | 'walking';
    duration: number;
    cost: number;
    pros: string[];
    cons: string[];
  }[];
}

export interface BirminghamContext {
  weather_forecast: WeatherImpact;
  university_dining_options: {
    name: string;
    location: string;
    opening_hours: string;
    menu_highlights: string[];
    cost_range: string;
  }[];
  nearby_supermarkets: {
    name: string;
    distance: number;
    cycling_time: number;
    specialties: string[];
  }[];
  gym_availability: {
    peak_hours: string[];
    off_peak_hours: string[];
    current_capacity_estimate: number;
  };
  transport_updates: {
    train_delays?: string[];
    cycling_route_issues?: string[];
    recommended_alternatives?: string[];
  };
}

export interface BackupPlan {
  scenario: string;
  alternative_schedule: Partial<OptimizedDayPlan>;
  trigger_conditions: string[];
  implementation_steps: string[];
}

export interface PerfectDayRequest {
  user_id: string;
  date: Date;
  sleep_data?: SleepData;
  energy_preferences?: {
    morning_energy: 'low' | 'medium' | 'high';
    afternoon_energy: 'low' | 'medium' | 'high';
    evening_energy: 'low' | 'medium' | 'high';
  };
  gym_preferences?: {
    preferred_time: 'morning' | 'afternoon' | 'evening' | 'flexible';
    workout_type: 'strength' | 'cardio' | 'mixed' | 'rest_day';
    duration_preference: number; // minutes
  };
  meal_preferences?: {
    dietary_restrictions: string[];
    calorie_target?: number;
    protein_target?: number;
    cooking_time_limit?: number; // minutes
    budget_limit?: number;
  };
  task_priorities?: {
    focus_areas: string[];
    deadline_urgency: 'relaxed' | 'moderate' | 'urgent';
    complexity_preference: 'simple_tasks_first' | 'complex_tasks_first' | 'mixed';
  };
  external_constraints?: {
    weather_sensitivity: 'low' | 'medium' | 'high';
    budget_consciousness: 'low' | 'medium' | 'high';
    time_flexibility: 'rigid' | 'moderate' | 'flexible';
  };
}

export class AutoSchedulerService {
  private supabaseClient: SupabaseClient<Database>;

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.supabaseClient = supabaseClient || supabase;
  }

  /**
   * Generate a perfectly optimized daily plan
   */
  async generatePerfectDay(request: PerfectDayRequest): Promise<OptimizedDayPlan> {
    console.log('🎯 Generating perfect day plan for:', {
      userId: request.user_id,
      date: request.date.toISOString().split('T')[0]
    });

    // Step 1: Gather all necessary context data
    const context = await this.gatherLifeContext(request.user_id, request.date);
    
    // Step 2: Get Birmingham-specific context
    const birminghamContext = await this.getBirminghamContext(request.date);
    
    // Step 3: Analyze sleep and energy patterns
    const energyProfile = await this.analyzeEnergyPatterns(request.user_id, request.sleep_data);
    
    // Step 4: Get existing calendar events (classes, meetings, etc.)
    const existingEvents = await calendarService.getCalendarEvents(request.user_id, {
      startDate: new Date(request.date.getFullYear(), request.date.getMonth(), request.date.getDate()),
      endDate: new Date(request.date.getFullYear(), request.date.getMonth(), request.date.getDate() + 1)
    });

    // Step 5: Get pending tasks that need scheduling
    const pendingTasks = await this.getPendingTasks(request.user_id);
    
    // Step 6: Optimize gym scheduling
    const gymSession = await this.optimizeGymScheduling(
      request.user_id,
      existingEvents,
      energyProfile,
      birminghamContext,
      request.gym_preferences
    );
    
    // Step 7: Plan meals with macros and timing
    const mealPlan = await this.planOptimalMeals(
      existingEvents,
      gymSession,
      birminghamContext,
      request.meal_preferences
    );
    
    // Step 8: Schedule tasks in available slots
    const taskBlocks = await this.scheduleTasksOptimally(
      request.user_id,
      pendingTasks,
      existingEvents,
      gymSession,
      mealPlan,
      energyProfile,
      request.task_priorities
    );
    
    // Step 9: Optimize travel routes
    const travelOptimization = await this.optimizeTravelRoutes(
      existingEvents,
      gymSession,
      mealPlan,
      taskBlocks,
      birminghamContext
    );
    
    // Step 10: Calculate optimization score and generate insights
    const optimizationScore = this.calculateOptimizationScore(
      energyProfile,
      gymSession,
      mealPlan,
      taskBlocks,
      travelOptimization
    );
    
    // Step 11: Generate AI reasoning and backup plans
    const aiReasoning = this.generateAIReasoning(
      gymSession,
      mealPlan,
      taskBlocks,
      travelOptimization,
      birminghamContext
    );
    
    const backupPlans = await this.generateBackupPlans(
      existingEvents,
      gymSession,
      mealPlan,
      taskBlocks,
      birminghamContext
    );

    const optimizedPlan: OptimizedDayPlan = {
      date: request.date,
      user_id: request.user_id,
      wake_up_time: energyProfile.recommended_wake_time,
      sleep_schedule: {
        target_bedtime: energyProfile.recommended_bedtime,
        target_wake_time: energyProfile.recommended_wake_time,
        recommended_duration: energyProfile.recommended_sleep_duration
      },
      gym_session: gymSession,
      meal_plan: mealPlan,
      class_schedule: existingEvents.filter(e => e.event_type === 'class'),
      task_blocks: taskBlocks,
      travel_optimization: travelOptimization,
      free_time_blocks: await this.calculateFreeTimeBlocks(request.user_id, existingEvents, gymSession, mealPlan, taskBlocks),
      optimization_score: optimizationScore,
      birmingham_context: birminghamContext,
      ai_reasoning: aiReasoning,
      potential_conflicts: await this.identifyPotentialConflicts(request.user_id, existingEvents, gymSession, taskBlocks),
      backup_plans: backupPlans
    };

    // Step 12: Store the optimized plan
    await this.storeOptimizedPlan(optimizedPlan);
    
    console.log('✅ Perfect day plan generated with optimization score:', optimizationScore);
    return optimizedPlan;
  }

  /**
   * Gather comprehensive life context from all modules
   */
  private async gatherLifeContext(userId: string, date: Date) {
    console.log('📊 Gathering life context for user:', userId);
    
    // Get recent health data for energy patterns
    const { data: healthMetrics } = await this.supabaseClient
      .from('metrics')
      .select('type, value, recorded_at, metadata')
      .eq('user_id', userId)
      .in('type', ['sleep_duration', 'heart_rate_avg', 'stress_level', 'steps_count', 'health_score'])
      .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('recorded_at', { ascending: false });

    // Get habit patterns that might affect scheduling
    const { data: habits } = await this.supabaseClient
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    // Get recent task completion patterns
    const { data: recentTasks } = await this.supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()) // Last 14 days
      .order('created_at', { ascending: false });

    return {
      healthMetrics: healthMetrics || [],
      habits: habits || [],
      recentTasks: recentTasks || []
    };
  }

  /**
   * Get Birmingham UK specific context including weather, transport, local services
   */
  private async getBirminghamContext(date: Date): Promise<BirminghamContext> {
    // Import weather service dynamically to avoid circular dependencies
    const { WeatherService } = await import('../services/weather-service');
    
    // Get current weather data
    const currentWeather = await WeatherService.getCurrentWeather();
    const weatherImpact = WeatherService.weatherDataToImpact(currentWeather);
    
    return {
      weather_forecast: weatherImpact,
      university_dining_options: [
        {
          name: 'The Hub Café',
          location: 'University Centre',
          opening_hours: '08:00-18:00',
          menu_highlights: ['Sandwiches', 'Salads', 'Hot meals'],
          cost_range: '£4-8'
        },
        {
          name: 'Pritchatts Park Food Court',
          location: 'Pritchatts Park',
          opening_hours: '08:00-20:00',
          menu_highlights: ['International cuisine', 'Healthy options', 'Grab & go'],
          cost_range: '£5-12'
        }
      ],
      nearby_supermarkets: [
        {
          name: 'Tesco Express',
          distance: 0.8,
          cycling_time: 6,
          specialties: ['Quick essentials', 'Ready meals', 'Fresh produce']
        },
        {
          name: 'ASDA',
          distance: 2.1,
          cycling_time: 15,
          specialties: ['Bulk shopping', 'Value products', 'Wide selection']
        }
      ],
      gym_availability: {
        peak_hours: ['07:00-09:00', '17:00-20:00'],
        off_peak_hours: ['09:00-17:00', '20:00-22:00'],
        current_capacity_estimate: 65
      },
      transport_updates: {
        train_delays: [],
        cycling_route_issues: [],
        recommended_alternatives: ['Cross City Line running normally', 'Cycle routes clear']
      }
    };
  }

  /**
   * Analyze energy patterns from sleep and health data
   */
  private async analyzeEnergyPatterns(userId: string, sleepData?: SleepData) {
    console.log('⚡ Analyzing energy patterns for user:', userId);
    
    // Get recent sleep data if not provided
    if (!sleepData) {
      const { data: recentSleep } = await this.supabaseClient
        .from('metrics')
        .select('value, recorded_at, metadata')
        .eq('user_id', userId)
        .eq('type', 'sleep_duration')
        .order('recorded_at', { ascending: false })
        .limit(1);
      
      if (recentSleep && recentSleep.length > 0) {
        const latest = recentSleep[0];
        sleepData = {
          date: latest.recorded_at.split('T')[0],
          duration: latest.value,
          quality: (latest.metadata as any)?.quality || 'fair'
        };
      }
    }

    // Default energy profile if no sleep data available
    const defaultWakeTime = new Date();
    defaultWakeTime.setHours(6, 0, 0, 0);
    
    const defaultBedtime = new Date();
    defaultBedtime.setHours(22, 0, 0, 0);

    return {
      recommended_wake_time: sleepData?.wake_up_time ? new Date(sleepData.wake_up_time) : defaultWakeTime,
      recommended_bedtime: defaultBedtime,
      recommended_sleep_duration: sleepData?.duration || 480, // 8 hours default
      energy_levels: {
        morning: sleepData?.quality === 'excellent' ? 'high' : sleepData?.quality === 'good' ? 'medium' : 'low',
        afternoon: 'medium',
        evening: 'low'
      } as const,
      sleep_quality_impact: sleepData?.quality || 'fair'
    };
  }

  /**
   * Get pending tasks that need to be scheduled
   */
  private async getPendingTasks(userId: string): Promise<Task[]> {
    const tasksResponse = await TaskService.getTasks(userId, {
      status: 'pending',
      limit: 50,
      sort_by: 'priority',
      sort_order: 'desc'
    });
    
    return tasksResponse.tasks.filter(task => 
      // Only include tasks that aren't already scheduled
      !task.scheduled_start_time && 
      // And have reasonable estimated duration
      task.estimated_duration && task.estimated_duration > 0
    );
  }

  /**
   * Optimize gym scheduling based on classes, energy, and travel
   */
  private async optimizeGymScheduling(
    userId: string,
    existingEvents: CalendarEvent[],
    energyProfile: any,
    birminghamContext: BirminghamContext,
    gymPreferences?: PerfectDayRequest['gym_preferences']
  ): Promise<GymSession | undefined> {
    
    console.log('🏋️ Optimizing gym scheduling...');
    
    // Check if it's a rest day
    if (gymPreferences?.workout_type === 'rest_day') {
      return undefined;
    }

    const gymLocation: BirminghamLocation = {
      id: 'birmingham-gym',
      name: 'Local Gym',
      address: '3.7 miles from home',
      type: 'gym',
      coordinates: { lat: 52.4862, lng: -1.8904 },
      cycling_distance_from_home: 3.7,
      cycling_time_estimate: 34, // Average of 28-40 minutes
      train_time_estimate: 25,
      walking_time_estimate: 75,
      cost_considerations: {
        cycling: 0,
        train: 4.50,
        walking: 0
      }
    };

    const workoutDuration = gymPreferences?.duration_preference || 60;
    const showerTime = 15;
    
    // Determine travel method based on weather and preferences
    let travelMethod: 'cycling' | 'train' | 'walking' = 'cycling';
    let travelTime = gymLocation.cycling_time_estimate;
    
    if (birminghamContext.weather_forecast.cycling_recommendation === 'avoid' || 
        birminghamContext.weather_forecast.precipitation_chance > 70) {
      travelMethod = 'train';
      travelTime = gymLocation.train_time_estimate || 25;
    }

    const totalTimeRequired = (travelTime * 2) + workoutDuration + showerTime;

    // Find available slots for gym session
    const today = new Date();
    const endOfDay = new Date(today);
    endOfDay.setHours(22, 0, 0, 0);

    const availableSlots = await calendarService.findAvailableSlots(userId, {
      start: today,
      end: endOfDay,
      duration: totalTimeRequired,
      buffer: 15
    });

    if (availableSlots.length === 0) {
      console.log('❌ No available slots found for gym session');
      return undefined;
    }

    // Score slots based on preferences and energy
    const scoredSlots = availableSlots.map(slot => {
      const hour = slot.start.getHours();
      let score = 0;

      // Morning preference (6-10 AM) - high energy
      if (hour >= 6 && hour <= 10) {
        score += energyProfile.energy_levels.morning === 'high' ? 30 : 20;
        score += gymPreferences?.preferred_time === 'morning' ? 20 : 0;
      }
      
      // Afternoon preference (12-17 PM)
      else if (hour >= 12 && hour <= 17) {
        score += energyProfile.energy_levels.afternoon === 'high' ? 25 : 15;
        score += gymPreferences?.preferred_time === 'afternoon' ? 20 : 0;
      }
      
      // Evening preference (17-21 PM)
      else if (hour >= 17 && hour <= 21) {
        score += energyProfile.energy_levels.evening === 'high' ? 20 : 10;
        score += gymPreferences?.preferred_time === 'evening' ? 20 : 0;
      }

      // Avoid peak gym hours
      const isPeakHour = birminghamContext.gym_availability.peak_hours.some(peak => {
        const [start, end] = peak.split('-');
        const peakStart = parseInt(start.split(':')[0]);
        const peakEnd = parseInt(end.split(':')[0]);
        return hour >= peakStart && hour < peakEnd;
      });
      
      if (isPeakHour) score -= 15;

      return { slot, score };
    });

    // Select the best slot
    const bestSlot = scoredSlots.sort((a, b) => b.score - a.score)[0];

    if (!bestSlot) {
      return undefined;
    }

    return {
      scheduled_time: bestSlot.slot,
      travel_method: travelMethod,
      travel_time: travelTime,
      workout_duration: workoutDuration,
      shower_time: showerTime,
      total_time_required: totalTimeRequired,
      energy_optimization_score: Math.min(100, bestSlot.score + 50),
      weather_consideration: birminghamContext.weather_forecast
    };
  }

  /**
   * Plan optimal meals with timing, macros, and location decisions
   */
  private async planOptimalMeals(
    existingEvents: CalendarEvent[],
    gymSession: GymSession | undefined,
    birminghamContext: BirminghamContext,
    mealPreferences?: PerfectDayRequest['meal_preferences']
  ): Promise<MealPlan> {
    
    console.log('🍽️ Planning optimal meals...');
    
    const calorieTarget = mealPreferences?.calorie_target || 2200;
    const proteinTarget = mealPreferences?.protein_target || 120;
    
    // Plan breakfast timing
    const breakfastTime = new Date();
    breakfastTime.setHours(7, 30, 0, 0);
    
    // Adjust breakfast timing based on gym session
    if (gymSession && gymSession.scheduled_time.start.getHours() < 9) {
      // Early gym - light breakfast before, proper meal after
      breakfastTime.setHours(6, 30, 0, 0);
    }

    // Plan lunch timing - check if at university
    const lunchTime = new Date();
    lunchTime.setHours(12, 30, 0, 0);
    
    const isAtUniversityDuringLunch = existingEvents.some(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      return eventStart.getHours() <= 13 && eventEnd.getHours() >= 12;
    });

    // Plan dinner
    const dinnerTime = new Date();
    dinnerTime.setHours(19, 0, 0, 0);

    const breakfast: MealDetails = {
      timing: breakfastTime,
      location: 'home',
      meal_type: 'breakfast',
      ingredients: [
        { name: 'Oats', quantity: 80, unit: 'g', cost_estimate: 0.30 },
        { name: 'Banana', quantity: 1, unit: 'piece', cost_estimate: 0.25 },
        { name: 'Milk', quantity: 200, unit: 'ml', cost_estimate: 0.35 },
        { name: 'Protein powder', quantity: 30, unit: 'g', cost_estimate: 1.20 }
      ],
      macros: {
        calories: 520,
        protein: 35,
        carbs: 65,
        fat: 12
      },
      preparation_time: 10,
      cost_estimate: 2.10
    };

    const lunch: MealDetails = {
      timing: lunchTime,
      location: isAtUniversityDuringLunch ? 'university' : 'home',
      meal_type: 'lunch',
      ingredients: isAtUniversityDuringLunch ? [] : [
        { name: 'Chicken breast', quantity: 150, unit: 'g', cost_estimate: 2.50 },
        { name: 'Rice', quantity: 80, unit: 'g', cost_estimate: 0.40 },
        { name: 'Vegetables', quantity: 200, unit: 'g', cost_estimate: 1.20 }
      ],
      macros: {
        calories: isAtUniversityDuringLunch ? 650 : 580,
        protein: isAtUniversityDuringLunch ? 35 : 45,
        carbs: isAtUniversityDuringLunch ? 70 : 60,
        fat: isAtUniversityDuringLunch ? 20 : 8
      },
      preparation_time: isAtUniversityDuringLunch ? 0 : 25,
      cost_estimate: isAtUniversityDuringLunch ? 6.50 : 4.10,
      restaurant_option: isAtUniversityDuringLunch ? {
        name: 'The Hub Café',
        location: 'University Centre',
        delivery_service: undefined
      } : undefined
    };

    const dinner: MealDetails = {
      timing: dinnerTime,
      location: 'home',
      meal_type: 'dinner',
      ingredients: [
        { name: 'Salmon fillet', quantity: 180, unit: 'g', cost_estimate: 4.50 },
        { name: 'Sweet potato', quantity: 200, unit: 'g', cost_estimate: 0.80 },
        { name: 'Broccoli', quantity: 150, unit: 'g', cost_estimate: 1.00 }
      ],
      macros: {
        calories: 620,
        protein: 40,
        carbs: 45,
        fat: 22
      },
      preparation_time: 30,
      cost_estimate: 6.30
    };

    const totalMacros: MacroBreakdown = {
      calories: breakfast.macros.calories + lunch.macros.calories + dinner.macros.calories,
      protein: breakfast.macros.protein + lunch.macros.protein + dinner.macros.protein,
      carbs: breakfast.macros.carbs + lunch.macros.carbs + dinner.macros.carbs,
      fat: breakfast.macros.fat + lunch.macros.fat + dinner.macros.fat
    };

    const shoppingList: IngredientList = {
      items: [
        ...breakfast.ingredients.filter(i => i.name !== 'Protein powder'), // Assume protein powder is stocked
        ...(lunch.location === 'home' ? lunch.ingredients : []),
        ...dinner.ingredients
      ],
      total_cost: breakfast.cost_estimate + (lunch.location === 'home' ? lunch.cost_estimate : 0) + dinner.cost_estimate,
      recommended_supermarket: 'Tesco Express', // Closest option
      shopping_route_optimization: {
        distance: 0.8,
        travel_method: 'cycling',
        estimated_time: 12 // 6 minutes each way
      }
    };

    return {
      breakfast,
      lunch,
      dinner,
      snacks: [], // Can be added based on calorie needs
      total_macros: totalMacros,
      shopping_list: shoppingList,
      total_cost_estimate: breakfast.cost_estimate + lunch.cost_estimate + dinner.cost_estimate
    };
  }

  /**
   * Schedule tasks optimally in available time slots
   */
  private async scheduleTasksOptimally(
    userId: string,
    pendingTasks: Task[],
    existingEvents: CalendarEvent[],
    gymSession: GymSession | undefined,
    mealPlan: MealPlan,
    energyProfile: any,
    taskPreferences?: PerfectDayRequest['task_priorities']
  ): Promise<TaskBlock[]> {
    
    console.log('📋 Scheduling tasks optimally...');
    
    if (pendingTasks.length === 0) {
      return [];
    }

    // Create time blocks that are already occupied
    const occupiedSlots: TimeSlot[] = [
      ...existingEvents.map(event => ({
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        duration: (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60),
        available: false
      })),
      ...(gymSession ? [{
        start: gymSession.scheduled_time.start,
        end: gymSession.scheduled_time.end,
        duration: gymSession.total_time_required,
        available: false
      }] : []),
      // Add meal times as occupied slots
      {
        start: mealPlan.breakfast.timing,
        end: new Date(mealPlan.breakfast.timing.getTime() + mealPlan.breakfast.preparation_time * 60000),
        duration: mealPlan.breakfast.preparation_time,
        available: false
      },
      {
        start: mealPlan.lunch.timing,
        end: new Date(mealPlan.lunch.timing.getTime() + mealPlan.lunch.preparation_time * 60000),
        duration: mealPlan.lunch.preparation_time,
        available: false
      },
      {
        start: mealPlan.dinner.timing,
        end: new Date(mealPlan.dinner.timing.getTime() + mealPlan.dinner.preparation_time * 60000),
        duration: mealPlan.dinner.preparation_time,
        available: false
      }
    ];

    const taskBlocks: TaskBlock[] = [];
    
    // Sort tasks by priority and deadline urgency
    const sortedTasks = [...pendingTasks].sort((a, b) => {
      const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityWeight[a.priority] || 2;
      const bPriority = priorityWeight[b.priority] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // If same priority, sort by deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      
      return 0;
    });

    // Find available slots for each task
    for (const task of sortedTasks.slice(0, 8)) { // Limit to 8 tasks per day
      if (!task.estimated_duration || task.estimated_duration <= 0) continue;

      const today = new Date();
      const endOfDay = new Date(today);
      endOfDay.setHours(21, 0, 0, 0); // Don't schedule tasks too late

      // Find available slots
      const availableSlots = await calendarService.findAvailableSlots(userId, {
        start: today,
        end: endOfDay,
        duration: task.estimated_duration,
        buffer: 10
      });

      // Filter out slots that conflict with already scheduled items
      const validSlots = availableSlots.filter(slot => {
        return !occupiedSlots.some(occupied => 
          this.timeRangesOverlap(slot.start, slot.end, occupied.start, occupied.end)
        );
      });

      if (validSlots.length === 0) continue;

      // Score slots based on energy levels and task complexity
      const scoredSlots = validSlots.map(slot => {
        const hour = slot.start.getHours();
        let score = 0;

        // Match task complexity with energy levels
        if (task.complexity === 'complex') {
          if (hour >= 9 && hour <= 12 && energyProfile.energy_levels.morning === 'high') {
            score += 30;
          } else if (hour >= 14 && hour <= 17 && energyProfile.energy_levels.afternoon === 'high') {
            score += 25;
          }
        } else if (task.complexity === 'simple') {
          if (hour >= 16 && hour <= 20) {
            score += 20; // Simple tasks can be done when energy is lower
          }
        }

        // Deadline pressure
        if (task.deadline) {
          const daysUntilDeadline = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilDeadline <= 1) score += 25;
          else if (daysUntilDeadline <= 3) score += 15;
        }

        return { slot, score };
      });

      const bestSlot = scoredSlots.sort((a, b) => b.score - a.score)[0];
      
      if (bestSlot) {
        const taskBlock: TaskBlock = {
          task,
          scheduled_time: bestSlot.slot,
          energy_match_score: Math.min(100, bestSlot.score + 40),
          complexity_appropriateness: this.calculateComplexityMatch(task, bestSlot.slot, energyProfile),
          deadline_pressure: task.deadline ? this.calculateDeadlinePressure(task.deadline) : 0,
          prerequisites_met: true // Simplified for now
        };

        taskBlocks.push(taskBlock);
        
        // Add this slot to occupied slots for next iteration
        occupiedSlots.push(bestSlot.slot);
      }
    }

    console.log(`✅ Successfully scheduled ${taskBlocks.length} tasks`);
    return taskBlocks;
  }

  /**
   * Optimize travel routes between locations
   */
  private async optimizeTravelRoutes(
    existingEvents: CalendarEvent[],
    gymSession: GymSession | undefined,
    mealPlan: MealPlan,
    taskBlocks: TaskBlock[],
    birminghamContext: BirminghamContext
  ): Promise<TravelPlan[]> {
    
    console.log('🚗 Optimizing travel routes...');
    
    const travelPlans: TravelPlan[] = [];
    
    // Home location
    const home: BirminghamLocation = {
      id: 'home',
      name: 'Home',
      address: 'Home Address',
      type: 'home',
      coordinates: { lat: 52.4862, lng: -1.8904 },
      cycling_distance_from_home: 0,
      cycling_time_estimate: 0,
      train_time_estimate: 0,
      walking_time_estimate: 0
    };

    // University location
    const university: BirminghamLocation = {
      id: 'university-of-birmingham',
      name: 'University of Birmingham',
      address: 'Edgbaston, Birmingham B15 2TT',
      type: 'university',
      coordinates: { lat: 52.4508, lng: -1.9305 },
      cycling_distance_from_home: 2.5,
      cycling_time_estimate: 18,
      train_time_estimate: 15,
      walking_time_estimate: 45
    };

    // Gym location
    const gym: BirminghamLocation = {
      id: 'gym',
      name: 'Local Gym',
      address: '3.7 miles from home',
      type: 'gym',
      coordinates: { lat: 52.4862, lng: -1.8904 },
      cycling_distance_from_home: 3.7,
      cycling_time_estimate: 34,
      train_time_estimate: 25,
      walking_time_estimate: 75
    };

    // Add gym travel if gym session is scheduled
    if (gymSession) {
      travelPlans.push({
        from: home,
        to: gym,
        method: gymSession.travel_method,
        duration: gymSession.travel_time,
        cost: gymSession.travel_method === 'train' ? 4.50 : 0,
        weather_impact: birminghamContext.weather_forecast,
        alternative_options: [
          {
            method: 'cycling',
            duration: 34,
            cost: 0,
            pros: ['Free', 'Good exercise', 'Flexible timing'],
            cons: ['Weather dependent', 'Takes longer', 'Need to shower after']
          },
          {
            method: 'train',
            duration: 25,
            cost: 4.50,
            pros: ['Weather independent', 'Faster', 'Less tiring'],
            cons: ['Costs money', 'Fixed schedule', 'Need to walk to station']
          }
        ]
      });
    }

    // Add university travel for classes
    const universityEvents = existingEvents.filter(e => e.event_type === 'class');
    if (universityEvents.length > 0) {
      travelPlans.push({
        from: home,
        to: university,
        method: 'cycling', // Default to cycling for university
        duration: 18,
        cost: 0,
        weather_impact: birminghamContext.weather_forecast,
        alternative_options: [
          {
            method: 'train',
            duration: 15,
            cost: 3.20,
            pros: ['Faster', 'Weather independent'],
            cons: ['Costs money', 'Less flexible']
          },
          {
            method: 'walking',
            duration: 45,
            cost: 0,
            pros: ['Free', 'Good exercise'],
            cons: ['Takes much longer', 'Weather dependent']
          }
        ]
      });
    }

    return travelPlans;
  }

  /**
   * Calculate free time blocks
   */
  private async calculateFreeTimeBlocks(
    userId: string,
    existingEvents: CalendarEvent[],
    gymSession: GymSession | undefined,
    mealPlan: MealPlan,
    taskBlocks: TaskBlock[]
  ): Promise<TimeSlot[]> {
    
    const occupiedSlots: TimeSlot[] = [
      ...existingEvents.map(event => ({
        start: new Date(event.start_time),
        end: new Date(event.end_time),
        duration: (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60),
        available: false
      })),
      ...(gymSession ? [{
        start: gymSession.scheduled_time.start,
        end: gymSession.scheduled_time.end,
        duration: gymSession.total_time_required,
        available: false
      }] : []),
      ...taskBlocks.map(block => block.scheduled_time)
    ];

    // Find gaps between occupied slots
    const sortedSlots = occupiedSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
    const freeSlots: TimeSlot[] = [];

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentEnd = sortedSlots[i].end;
      const nextStart = sortedSlots[i + 1].start;
      
      const gapDuration = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
      
      if (gapDuration >= 30) { // Only consider gaps of 30+ minutes as free time
        freeSlots.push({
          start: new Date(currentEnd),
          end: new Date(nextStart),
          duration: gapDuration,
          available: true
        });
      }
    }

    return freeSlots;
  }

  /**
   * Calculate overall optimization score
   */
  private calculateOptimizationScore(
    energyProfile: any,
    gymSession: GymSession | undefined,
    mealPlan: MealPlan,
    taskBlocks: TaskBlock[],
    travelOptimization: TravelPlan[]
  ): number {
    let score = 0;

    // Energy optimization (25 points)
    if (gymSession) {
      score += gymSession.energy_optimization_score * 0.25;
    } else {
      score += 15; // Some points for rest day
    }

    // Task scheduling efficiency (30 points)
    const avgTaskScore = taskBlocks.length > 0 
      ? taskBlocks.reduce((sum, block) => sum + block.energy_match_score, 0) / taskBlocks.length
      : 50;
    score += avgTaskScore * 0.30;

    // Meal planning (20 points)
    const mealScore = this.calculateMealPlanScore(mealPlan);
    score += mealScore * 0.20;

    // Travel optimization (15 points)
    const travelScore = this.calculateTravelScore(travelOptimization);
    score += travelScore * 0.15;

    // Time utilization (10 points)
    const timeUtilizationScore = Math.min(100, (taskBlocks.length * 10) + (gymSession ? 20 : 0));
    score += timeUtilizationScore * 0.10;

    return Math.round(Math.min(100, score));
  }

  /**
   * Generate AI reasoning for the schedule decisions
   */
  private generateAIReasoning(
    gymSession: GymSession | undefined,
    mealPlan: MealPlan,
    taskBlocks: TaskBlock[],
    travelOptimization: TravelPlan[],
    birminghamContext: BirminghamContext
  ): string[] {
    
    const reasoning: string[] = [];

    if (gymSession) {
      reasoning.push(
        `Scheduled gym session at ${gymSession.scheduled_time.start.toLocaleTimeString()} using ${gymSession.travel_method} ` +
        `(${gymSession.travel_time} min each way) based on weather conditions and energy levels.`
      );
    }

    if (mealPlan.lunch.location === 'university') {
      reasoning.push(
        `Planned lunch at university (${mealPlan.lunch.restaurant_option?.name}) due to class schedule, ` +
        `saving ${mealPlan.lunch.preparation_time} minutes of cooking time.`
      );
    }

    if (taskBlocks.length > 0) {
      const complexTasks = taskBlocks.filter(b => b.task.complexity === 'complex');
      if (complexTasks.length > 0) {
        reasoning.push(
          `Scheduled ${complexTasks.length} complex tasks during high-energy periods ` +
          `(${complexTasks.map(t => t.scheduled_time.start.toLocaleTimeString()).join(', ')}) ` +
          `for optimal cognitive performance.`
        );
      }
    }

    if (birminghamContext.weather_forecast.cycling_recommendation !== 'ideal') {
      reasoning.push(
        `Weather consideration: ${birminghamContext.weather_forecast.condition} with ` +
        `${birminghamContext.weather_forecast.precipitation_chance}% rain chance. ` +
        `Cycling ${birminghamContext.weather_forecast.cycling_recommendation}.`
      );
    }

    return reasoning;
  }

  /**
   * Generate backup plans for different scenarios
   */
  private async generateBackupPlans(
    existingEvents: CalendarEvent[],
    gymSession: GymSession | undefined,
    mealPlan: MealPlan,
    taskBlocks: TaskBlock[],
    birminghamContext: BirminghamContext
  ): Promise<BackupPlan[]> {
    
    const backupPlans: BackupPlan[] = [];

    // Weather backup plan
    if (gymSession?.travel_method === 'cycling') {
      backupPlans.push({
        scenario: 'Heavy rain or bad weather',
        alternative_schedule: {
          gym_session: {
            ...gymSession,
            travel_method: 'train',
            travel_time: 25,
            total_time_required: (25 * 2) + gymSession.workout_duration + gymSession.shower_time
          }
        },
        trigger_conditions: ['Precipitation > 70%', 'Strong winds', 'Temperature < 2°C'],
        implementation_steps: [
          'Check train times to gym',
          'Allow extra 15 minutes for train travel',
          'Bring umbrella for station walk',
          'Consider indoor warm-up routine'
        ]
      });
    }

    // Class cancellation backup
    if (existingEvents.some(e => e.event_type === 'class')) {
      backupPlans.push({
        scenario: 'Class cancelled or moved online',
        alternative_schedule: {
          task_blocks: [
            ...taskBlocks,
            // Add extra study time in the freed slot
          ]
        },
        trigger_conditions: ['University announcement', 'Lecturer email', 'Timetable change'],
        implementation_steps: [
          'Check university portal for updates',
          'Use freed time for assignment work',
          'Consider moving gym session earlier',
          'Plan additional study session'
        ]
      });
    }

    return backupPlans;
  }

  /**
   * Store the optimized plan in the database
   */
  private async storeOptimizedPlan(plan: OptimizedDayPlan): Promise<void> {
    console.log('💾 Storing optimized daily plan...');
    
    const { error } = await this.supabaseClient
      .from('optimized_daily_plans')
      .upsert({
        user_id: plan.user_id,
        plan_date: plan.date.toISOString().split('T')[0],
        wake_up_time: plan.wake_up_time.toTimeString().split(' ')[0],
        sleep_duration: plan.sleep_schedule.recommended_duration,
        gym_session: plan.gym_session,
        meal_plan: plan.meal_plan,
        travel_optimization: plan.travel_optimization,
        task_scheduling: plan.task_blocks,
        optimization_score: plan.optimization_score / 100, // Store as decimal
        birmingham_context: plan.birmingham_context,
        weather_consideration: plan.birmingham_context.weather_forecast
      });

    if (error) {
      console.error('❌ Failed to store optimized plan:', error);
      throw new Error(`Failed to store optimized plan: ${error.message}`);
    }

    console.log('✅ Optimized plan stored successfully');
  }

  // Helper methods
  private timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && start2 < end1;
  }

  private calculateComplexityMatch(task: Task, slot: TimeSlot, energyProfile: any): number {
    const hour = slot.start.getHours();
    
    if (task.complexity === 'complex') {
      if ((hour >= 9 && hour <= 12) || (hour >= 14 && hour <= 17)) {
        return 90; // High energy periods
      }
      return 40; // Low energy periods
    } else if (task.complexity === 'simple') {
      return 80; // Simple tasks can be done anytime
    }
    
    return 70; // Moderate complexity
  }

  private calculateDeadlinePressure(deadline: string): number {
    const daysUntilDeadline = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDeadline <= 1) return 100;
    if (daysUntilDeadline <= 3) return 75;
    if (daysUntilDeadline <= 7) return 50;
    return 25;
  }

  private calculateMealPlanScore(mealPlan: MealPlan): number {
    let score = 50; // Base score
    
    // Macro balance
    const totalCalories = mealPlan.total_macros.calories;
    if (totalCalories >= 2000 && totalCalories <= 2500) score += 20;
    
    const proteinRatio = (mealPlan.total_macros.protein * 4) / totalCalories;
    if (proteinRatio >= 0.15 && proteinRatio <= 0.25) score += 15;
    
    // Cost efficiency
    if (mealPlan.total_cost_estimate <= 15) score += 10;
    
    // Preparation time efficiency
    const totalPrepTime = mealPlan.breakfast.preparation_time + 
                         mealPlan.lunch.preparation_time + 
                         mealPlan.dinner.preparation_time;
    if (totalPrepTime <= 60) score += 5;
    
    return Math.min(100, score);
  }

  private calculateTravelScore(travelPlans: TravelPlan[]): number {
    if (travelPlans.length === 0) return 80;
    
    let score = 0;
    for (const plan of travelPlans) {
      // Prefer cycling for cost and health
      if (plan.method === 'cycling') score += 30;
      else if (plan.method === 'walking') score += 20;
      else score += 10;
      
      // Efficiency bonus
      if (plan.duration <= 30) score += 10;
    }
    
    return Math.min(100, score / travelPlans.length);
  }

  private async identifyPotentialConflicts(
    userId: string,
    existingEvents: CalendarEvent[],
    gymSession: GymSession | undefined,
    taskBlocks: TaskBlock[]
  ): Promise<string[]> {
    
    const conflicts: string[] = [];
    
    // Check for tight scheduling
    const allScheduledItems = [
      ...existingEvents.map(e => ({ start: new Date(e.start_time), end: new Date(e.end_time), title: e.title })),
      ...(gymSession ? [{ 
        start: gymSession.scheduled_time.start, 
        end: gymSession.scheduled_time.end, 
        title: 'Gym Session' 
      }] : []),
      ...taskBlocks.map(b => ({ 
        start: b.scheduled_time.start, 
        end: b.scheduled_time.end, 
        title: b.task.title 
      }))
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    for (let i = 0; i < allScheduledItems.length - 1; i++) {
      const current = allScheduledItems[i];
      const next = allScheduledItems[i + 1];
      
      const gap = (next.start.getTime() - current.end.getTime()) / (1000 * 60);
      
      if (gap < 15) {
        conflicts.push(
          `Tight schedule: Only ${gap} minutes between "${current.title}" and "${next.title}"`
        );
      }
    }

    // Check for overloaded periods
    const hourlyLoad = new Map<number, number>();
    for (const item of allScheduledItems) {
      const hour = item.start.getHours();
      hourlyLoad.set(hour, (hourlyLoad.get(hour) || 0) + 1);
    }

    for (const [hour, load] of hourlyLoad) {
      if (load > 2) {
        conflicts.push(`Busy period: ${load} activities scheduled around ${hour}:00`);
      }
    }

    return conflicts;
  }
}

export const autoSchedulerService = new AutoSchedulerService();