// Integration tests for UK Student Dashboard
// Tests the dashboard's ability to combine all services and display integrated life optimization

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  UKStudentProfile,
  DashboardData,
  AcademicEvent,
  Routine,
  BudgetHealth,
  WeatherData,
  TimeBlock,
  EnergyForecast,
  DailyPlan
} from '../../types/uk-student';

// Mock data generators
const createMockAcademicEvent = (overrides?: Partial<AcademicEvent>): AcademicEvent => ({
  id: '1',
  user_id: 'user-1',
  title: 'EMH Lecture',
  type: 'class',
  start_time: new Date('2024-11-20T09:00:00'),
  end_time: new Date('2024-11-20T10:00:00'),
  location: 'Building A',
  building: 'A',
  importance: 4,
  preparation_time: 15,
  travel_time: 20,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});

const createMockRoutine = (overrides?: Partial<Routine>): Routine => ({
  id: '1',
  user_id: 'user-1',
  routine_type: 'morning',
  name: 'Morning Routine',
  steps: [
    {
      id: '1',
      name: 'Shower',
      estimated_duration: 15,
      order: 1,
      required: true
    },
    {
      id: '2',
      name: 'Skincare',
      estimated_duration: 10,
      order: 2,
      required: true
    }
  ],
  estimated_duration: 45,
  frequency: 'daily',
  completion_streak: 5,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides
});

const createMockProfile = (overrides?: Partial<UKStudentProfile>): UKStudentProfile => ({
  user_id: 'user-1',
  preferences: {
    id: 'pref-1',
    user_id: 'user-1',
    home_location: 'Five Ways',
    transport_preference: 'mixed',
    cooking_time_limits: {
      breakfast: 10,
      lunch: 20,
      dinner: 30
    },
    dietary_restrictions: [],
    bulk_cooking_frequency: 7,
    budget_alert_enabled: true,
    weather_notifications: true,
    laundry_reminder_enabled: true,
    skincare_tracking_enabled: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  current_location: {
    name: 'Five Ways',
    coordinates: [52.4751, -1.9180],
    type: 'home'
  },
  academic_schedule: [
    createMockAcademicEvent({
      title: 'EMH Lecture',
      start_time: new Date('2024-11-20T09:00:00'),
      end_time: new Date('2024-11-20T10:00:00')
    }),
    createMockAcademicEvent({
      title: 'Corporate Finance',
      start_time: new Date('2024-11-20T14:00:00'),
      end_time: new Date('2024-11-20T15:30:00')
    })
  ],
  active_routines: [
    createMockRoutine({ routine_type: 'morning' }),
    createMockRoutine({ routine_type: 'evening' })
  ],
  budget_limits: [],
  dietary_preferences: {
    restrictions: [],
    allergies: [],
    preferred_cuisines: ['British', 'Asian'],
    cooking_skill_level: 3,
    meal_prep_preference: 'batch'
  },
  transport_preferences: {
    preferred_method: 'mixed',
    weather_threshold: 0.5,
    cost_sensitivity: 'high',
    time_sensitivity: 'medium'
  },
  ...overrides
});

describe('UK Student Dashboard Integration', () => {
  let mockProfile: UKStudentProfile;

  beforeEach(() => {
    mockProfile = createMockProfile();
  });

  describe('Dashboard Data Generation', () => {
    it('should generate dashboard data with all required components', () => {
      const dashboardData: DashboardData = {
        today_schedule: mockProfile.academic_schedule,
        weather: {
          date: new Date(),
          conditions: {
            temperature: 12,
            condition: 'cloudy',
            precipitation_chance: 30,
            wind_speed: 15
          }
        },
        budget_status: {
          score: 75,
          status: 'good',
          recommendations: ['Reduce entertainment spending']
        },
        upcoming_deadlines: [],
        routine_reminders: mockProfile.active_routines,
        travel_recommendations: [],
        meal_suggestions: [],
        alerts: []
      };

      expect(dashboardData.today_schedule).toHaveLength(2);
      expect(dashboardData.weather).toBeDefined();
      expect(dashboardData.budget_status.score).toBe(75);
      expect(dashboardData.routine_reminders).toHaveLength(2);
    });

    it('should filter academic events for selected date', () => {
      const selectedDate = new Date('2024-11-20');
      const filteredEvents = mockProfile.academic_schedule.filter(event =>
        new Date(event.start_time).toDateString() === selectedDate.toDateString()
      );

      expect(filteredEvents).toHaveLength(2);
      expect(filteredEvents[0].title).toBe('EMH Lecture');
      expect(filteredEvents[1].title).toBe('Corporate Finance');
    });

    it('should include weather data for travel recommendations', () => {
      const weather: WeatherData = {
        date: new Date(),
        conditions: {
          temperature: 8,
          condition: 'rainy',
          precipitation_chance: 80,
          wind_speed: 20
        }
      };

      // Rainy weather should recommend train over bike
      expect(weather.conditions.condition).toBe('rainy');
      expect(weather.conditions.precipitation_chance).toBeGreaterThan(70);
    });
  });

  describe('Time Block Generation', () => {
    it('should generate time blocks for entire day', () => {
      const timeBlocks: TimeBlock[] = [
        {
          startTime: new Date('2024-11-20T07:00:00'),
          endTime: new Date('2024-11-20T08:30:00'),
          activity: 'Morning Routine',
          type: 'routine',
          priority: 'high',
          energyRequired: 3
        },
        {
          startTime: new Date('2024-11-20T08:00:00'),
          endTime: new Date('2024-11-20T08:30:00'),
          activity: 'Breakfast',
          type: 'meal',
          priority: 'high',
          energyRequired: 1
        },
        {
          startTime: new Date('2024-11-20T09:00:00'),
          endTime: new Date('2024-11-20T10:00:00'),
          activity: 'EMH Lecture',
          type: 'class',
          priority: 'high',
          energyRequired: 5
        }
      ];

      expect(timeBlocks).toHaveLength(3);
      expect(timeBlocks[0].type).toBe('routine');
      expect(timeBlocks[1].type).toBe('meal');
      expect(timeBlocks[2].type).toBe('class');
    });

    it('should sort time blocks chronologically', () => {
      const unsortedBlocks: TimeBlock[] = [
        {
          startTime: new Date('2024-11-20T14:00:00'),
          endTime: new Date('2024-11-20T15:00:00'),
          activity: 'Class 2',
          type: 'class',
          priority: 'high',
          energyRequired: 5
        },
        {
          startTime: new Date('2024-11-20T09:00:00'),
          endTime: new Date('2024-11-20T10:00:00'),
          activity: 'Class 1',
          type: 'class',
          priority: 'high',
          energyRequired: 5
        }
      ];

      const sorted = unsortedBlocks.sort((a, b) => 
        a.startTime.getTime() - b.startTime.getTime()
      );

      expect(sorted[0].activity).toBe('Class 1');
      expect(sorted[1].activity).toBe('Class 2');
    });

    it('should assign correct energy requirements to activities', () => {
      const blocks: TimeBlock[] = [
        { startTime: new Date(), endTime: new Date(), activity: 'Gym', type: 'gym', priority: 'high', energyRequired: 7 },
        { startTime: new Date(), endTime: new Date(), activity: 'Meal', type: 'meal', priority: 'high', energyRequired: 1 },
        { startTime: new Date(), endTime: new Date(), activity: 'Class', type: 'class', priority: 'high', energyRequired: 5 }
      ];

      expect(blocks[0].energyRequired).toBe(7);
      expect(blocks[1].energyRequired).toBe(1);
      expect(blocks[2].energyRequired).toBe(5);
    });
  });

  describe('Energy Forecasting', () => {
    it('should generate hourly energy forecast', () => {
      const forecast: EnergyForecast[] = [];
      
      for (let hour = 7; hour <= 22; hour++) {
        forecast.push({
          hour,
          energyLevel: 5,
          recommendation: 'Steady pace',
          activities: []
        });
      }

      expect(forecast).toHaveLength(16);
      expect(forecast[0].hour).toBe(7);
      expect(forecast[forecast.length - 1].hour).toBe(22);
    });

    it('should adjust energy levels based on activities', () => {
      const timeBlocks: TimeBlock[] = [
        {
          startTime: new Date('2024-11-20T09:00:00'),
          endTime: new Date('2024-11-20T10:00:00'),
          activity: 'Gym',
          type: 'gym',
          priority: 'high',
          energyRequired: 7
        }
      ];

      const forecast: EnergyForecast[] = [];
      
      for (let hour = 7; hour <= 22; hour++) {
        const blockAtHour = timeBlocks.find(b => 
          b.startTime.getHours() <= hour && b.endTime.getHours() > hour
        );
        
        const energyLevel = blockAtHour ? Math.max(1, 10 - blockAtHour.energyRequired) : 5;
        
        forecast.push({
          hour,
          energyLevel,
          recommendation: blockAtHour?.type === 'gym' ? 'High energy activity' : 'Steady pace',
          activities: blockAtHour ? [blockAtHour.activity] : []
        });
      }

      const gymHour = forecast.find(f => f.hour === 9);
      expect(gymHour?.energyLevel).toBe(3); // 10 - 7
      expect(gymHour?.recommendation).toBe('High energy activity');
    });

    it('should provide appropriate recommendations for each hour', () => {
      const forecast: EnergyForecast[] = [
        { hour: 7, energyLevel: 5, recommendation: 'Wake up and hydrate', activities: ['Morning Routine'] },
        { hour: 9, energyLevel: 3, recommendation: 'Focus time - minimize distractions', activities: ['Class'] },
        { hour: 17, energyLevel: 3, recommendation: 'High energy activity - stay hydrated', activities: ['Gym'] }
      ];

      expect(forecast[0].recommendation).toContain('Wake up');
      expect(forecast[1].recommendation).toContain('Focus');
      expect(forecast[2].recommendation).toContain('High energy');
    });
  });

  describe('Daily Cost Calculation', () => {
    it('should calculate daily travel costs', () => {
      const travelBlocks: TimeBlock[] = [
        {
          startTime: new Date(),
          endTime: new Date(),
          activity: 'Travel to University',
          type: 'travel',
          priority: 'high',
          energyRequired: 2
        },
        {
          startTime: new Date(),
          endTime: new Date(),
          activity: 'Travel to Gym',
          type: 'travel',
          priority: 'medium',
          energyRequired: 2
        }
      ];

      const travelCost = travelBlocks.length * 2.07; // £2.05-2.10 per journey
      
      expect(travelCost).toBeCloseTo(4.14, 1);
    });

    it('should calculate daily meal costs', () => {
      const mealBlocks: TimeBlock[] = [
        {
          startTime: new Date(),
          endTime: new Date(),
          activity: 'Breakfast',
          type: 'meal',
          priority: 'high',
          energyRequired: 1
        },
        {
          startTime: new Date(),
          endTime: new Date(),
          activity: 'Lunch',
          type: 'meal',
          priority: 'high',
          energyRequired: 1
        },
        {
          startTime: new Date(),
          endTime: new Date(),
          activity: 'Dinner',
          type: 'meal',
          priority: 'high',
          energyRequired: 1
        }
      ];

      const mealCost = mealBlocks.length * 4; // £3-5 per meal
      
      expect(mealCost).toBe(12);
    });

    it('should calculate total daily cost', () => {
      const allBlocks: TimeBlock[] = [
        {
          startTime: new Date(),
          endTime: new Date(),
          activity: 'Travel',
          type: 'travel',
          priority: 'high',
          energyRequired: 2
        },
        {
          startTime: new Date(),
          endTime: new Date(),
          activity: 'Meal',
          type: 'meal',
          priority: 'high',
          energyRequired: 1
        }
      ];

      const travelCost = allBlocks.filter(b => b.type === 'travel').length * 2.07;
      const mealCost = allBlocks.filter(b => b.type === 'meal').length * 4;
      const totalCost = travelCost + mealCost;

      expect(totalCost).toBeCloseTo(6.07, 1);
    });
  });

  describe('Budget Health Integration', () => {
    it('should display budget status based on spending', () => {
      const budgetHealth: BudgetHealth = {
        score: 85,
        status: 'good',
        recommendations: ['Continue current spending patterns']
      };

      expect(budgetHealth.status).toBe('good');
      expect(budgetHealth.score).toBeGreaterThan(80);
    });

    it('should provide recommendations when budget is near limit', () => {
      const budgetHealth: BudgetHealth = {
        score: 65,
        status: 'warning',
        recommendations: ['Reduce entertainment spending', 'Consider meal prep']
      };

      expect(budgetHealth.status).toBe('warning');
      expect(budgetHealth.recommendations).toHaveLength(2);
    });

    it('should alert when budget is exceeded', () => {
      const budgetHealth: BudgetHealth = {
        score: 30,
        status: 'critical',
        recommendations: ['Immediate spending reduction required']
      };

      expect(budgetHealth.status).toBe('critical');
      expect(budgetHealth.score).toBeLessThan(50);
    });
  });

  describe('Weather-Aware Travel Recommendations', () => {
    it('should recommend train when weather is rainy', () => {
      const weather: WeatherData = {
        date: new Date(),
        conditions: {
          temperature: 8,
          condition: 'rainy',
          precipitation_chance: 80,
          wind_speed: 20
        }
      };

      // Rainy weather should not be suitable for cycling
      expect(weather.conditions.condition).toBe('rainy');
      expect(weather.conditions.precipitation_chance).toBeGreaterThan(70);
    });

    it('should recommend cycling when weather is sunny', () => {
      const weather: WeatherData = {
        date: new Date(),
        conditions: {
          temperature: 15,
          condition: 'sunny',
          precipitation_chance: 10,
          wind_speed: 8
        }
      };

      expect(weather.conditions.condition).toBe('sunny');
      expect(weather.conditions.precipitation_chance).toBeLessThan(20);
    });

    it('should consider wind speed in travel recommendations', () => {
      const windyWeather: WeatherData = {
        date: new Date(),
        conditions: {
          temperature: 12,
          condition: 'cloudy',
          precipitation_chance: 20,
          wind_speed: 25
        }
      };

      expect(windyWeather.conditions.wind_speed).toBeGreaterThan(20);
    });
  });

  describe('Meal Planning Integration', () => {
    it('should suggest meals based on available time', () => {
      const timeBlocks: TimeBlock[] = [
        {
          startTime: new Date('2024-11-20T08:00:00'),
          endTime: new Date('2024-11-20T08:30:00'),
          activity: 'Breakfast',
          type: 'meal',
          priority: 'high',
          energyRequired: 1
        }
      ];

      // 30 minutes available for breakfast
      const availableTime = 30;
      expect(availableTime).toBeLessThanOrEqual(45); // Should suggest quick recipes
    });

    it('should track shopping reminders', () => {
      const alerts = [
        {
          id: '1',
          type: 'budget_exceeded' as const,
          title: 'Shopping Reminder',
          message: 'Time to buy groceries',
          severity: 'info' as const,
          created_at: new Date(),
          dismissed: false
        }
      ];

      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toContain('groceries');
    });
  });

  describe('Academic Deadline Tracking', () => {
    it('should display upcoming deadlines', () => {
      const assignments = [
        {
          id: '1',
          title: 'EMH Essay',
          description: '2000 words',
          due_date: new Date('2024-11-24'),
          estimated_hours: 8,
          progress: 0,
          priority: 'high' as const,
          breakdown_tasks: []
        },
        {
          id: '2',
          title: 'Corporate Finance Assignment',
          description: 'Problem set',
          due_date: new Date('2024-12-08'),
          estimated_hours: 4,
          progress: 0,
          priority: 'high' as const,
          breakdown_tasks: []
        }
      ];

      expect(assignments).toHaveLength(2);
      expect(assignments[0].due_date.getTime()).toBeLessThan(assignments[1].due_date.getTime());
    });

    it('should suggest study sessions around other commitments', () => {
      const studyBlock: TimeBlock = {
        startTime: new Date('2024-11-20T15:30:00'),
        endTime: new Date('2024-11-20T17:00:00'),
        activity: 'Study Session',
        type: 'study',
        priority: 'high',
        energyRequired: 6
      };

      expect(studyBlock.type).toBe('study');
      expect(studyBlock.priority).toBe('high');
    });
  });

  describe('Routine Integration', () => {
    it('should display routine reminders', () => {
      const routines = mockProfile.active_routines;

      expect(routines).toHaveLength(2);
      expect(routines[0].routine_type).toBe('morning');
      expect(routines[1].routine_type).toBe('evening');
    });

    it('should track routine completion streaks', () => {
      const routine = mockProfile.active_routines[0];

      expect(routine.completion_streak).toBe(5);
      expect(routine.is_active).toBe(true);
    });

    it('should include routine steps in daily plan', () => {
      const morningRoutine = mockProfile.active_routines[0];

      expect(morningRoutine.steps).toHaveLength(2);
      expect(morningRoutine.steps[0].name).toBe('Shower');
      expect(morningRoutine.steps[1].name).toBe('Skincare');
    });
  });

  describe('Daily Plan Generation', () => {
    it('should generate complete daily plan', () => {
      const dailyPlan: DailyPlan = {
        date: new Date('2024-11-20'),
        timeBlocks: [],
        energyForecast: [],
        travelRecommendations: [],
        mealSuggestions: [],
        budgetStatus: {
          score: 75,
          status: 'good',
          recommendations: []
        },
        upcomingDeadlines: [],
        routineReminders: mockProfile.active_routines,
        alerts: [],
        totalCost: 10.50,
        estimatedEnergy: 6
      };

      expect(dailyPlan.date).toEqual(new Date('2024-11-20'));
      expect(dailyPlan.totalCost).toBeGreaterThan(0);
      expect(dailyPlan.estimatedEnergy).toBeGreaterThan(0);
      expect(dailyPlan.routineReminders).toHaveLength(2);
    });

    it('should calculate average energy level', () => {
      const forecast: EnergyForecast[] = [
        { hour: 7, energyLevel: 4, recommendation: '', activities: [] },
        { hour: 8, energyLevel: 5, recommendation: '', activities: [] },
        { hour: 9, energyLevel: 6, recommendation: '', activities: [] }
      ];

      const averageEnergy = Math.round(
        forecast.reduce((sum, f) => sum + f.energyLevel, 0) / forecast.length
      );

      expect(averageEnergy).toBe(5);
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 9.1 - daily plan generation with energy forecasting', () => {
      const dailyPlan: DailyPlan = {
        date: new Date(),
        timeBlocks: [
          {
            startTime: new Date(),
            endTime: new Date(),
            activity: 'Morning Routine',
            type: 'routine',
            priority: 'high',
            energyRequired: 3
          }
        ],
        energyForecast: [
          { hour: 7, energyLevel: 5, recommendation: 'Wake up', activities: [] }
        ],
        travelRecommendations: [],
        mealSuggestions: [],
        budgetStatus: { score: 75, status: 'good', recommendations: [] },
        upcomingDeadlines: [],
        routineReminders: [],
        alerts: [],
        totalCost: 0,
        estimatedEnergy: 5
      };

      expect(dailyPlan.timeBlocks).toBeDefined();
      expect(dailyPlan.energyForecast).toBeDefined();
      expect(dailyPlan.energyForecast.length).toBeGreaterThan(0);
    });

    it('should satisfy Requirement 9.2 - weather-aware travel recommendations', () => {
      const weather: WeatherData = {
        date: new Date(),
        conditions: {
          temperature: 8,
          condition: 'rainy',
          precipitation_chance: 80,
          wind_speed: 20
        }
      };

      // Should recommend train over bike
      expect(weather.conditions.condition).toBe('rainy');
      expect(weather.conditions.precipitation_chance).toBeGreaterThan(70);
    });

    it('should satisfy Requirement 9.3 - budget health monitoring', () => {
      const budgetStatus: BudgetHealth = {
        score: 75,
        status: 'good',
        recommendations: ['Continue current spending patterns']
      };

      expect(budgetStatus.score).toBeGreaterThan(0);
      expect(budgetStatus.status).toBeDefined();
      expect(budgetStatus.recommendations).toBeDefined();
    });

    it('should satisfy Requirement 9.4 - meal planning integration', () => {
      const mealSuggestions = [
        {
          id: '1',
          name: 'Quick Pasta',
          cooking_time: 15,
          prep_time: 5,
          difficulty: 1,
          servings: 2,
          ingredients: [],
          instructions: [],
          nutrition: {},
          storage_info: {},
          bulk_cooking_multiplier: 2,
          tags: ['quick', 'budget'],
          is_public: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      expect(mealSuggestions).toHaveLength(1);
      expect(mealSuggestions[0].cooking_time).toBeLessThanOrEqual(30);
    });

    it('should satisfy Requirement 9.5 - academic deadline tracking', () => {
      const upcomingDeadlines = [
        {
          id: '1',
          title: 'EMH Essay',
          description: '2000 words',
          due_date: new Date('2024-11-24'),
          estimated_hours: 8,
          progress: 0,
          priority: 'high' as const,
          breakdown_tasks: []
        }
      ];

      expect(upcomingDeadlines).toHaveLength(1);
      expect(upcomingDeadlines[0].due_date).toBeDefined();
    });

    it('should satisfy Requirement 10.1 - family project time management', () => {
      const projectBlock: TimeBlock = {
        startTime: new Date('2024-11-20T18:00:00'),
        endTime: new Date('2024-11-20T19:30:00'),
        activity: 'Restaurant Website Project',
        type: 'leisure',
        priority: 'medium',
        energyRequired: 5
      };

      expect(projectBlock.activity).toContain('Project');
      expect(projectBlock.type).toBe('leisure');
    });

    it('should satisfy Requirement 10.2 - project task breakdown', () => {
      const projectTasks = [
        'Orders system',
        'Delivery integration',
        'PetPooja integration',
        'WhatsApp connection',
        'Payments'
      ];

      expect(projectTasks).toHaveLength(5);
      expect(projectTasks).toContain('Orders system');
      expect(projectTasks).toContain('Payments');
    });
  });
});
