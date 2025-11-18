// UK Student Dashboard Component
// Main dashboard that integrates all UK student life optimization services
// Combines meal planning, travel optimization, budget management, academic tracking, and routine management

import React, { useState, useEffect } from 'react';
import type {
  DashboardData,
  UKStudentProfile,
  AcademicEvent,
  Routine,
  Recipe,
  Alert,
  Location,
  TransportPreferences,
  UKStudentPreferences,
  CookingTimeLimits
} from '../../types/uk-student';
import type {
  BudgetHealth,
  UKStudentExpense
} from '../../types/uk-student-finance';
import type {
  TravelRoute,
  WeatherData,
  TravelPreferences
} from '../../types/uk-student-travel';
import { BudgetManager } from './BudgetManager';
import { MealPlanningDashboard } from './MealPlanningDashboard';
import { TravelOptimizer } from './TravelOptimizer';
import { AcademicDashboard } from './AcademicDashboard';
import { RoutineTracker } from './RoutineTracker';

interface UKStudentDashboardProps {
  userId: string;
  profile: UKStudentProfile;
  onProfileUpdate?: (profile: UKStudentProfile) => void;
}

interface EnergyForecast {
  hour: number;
  energyLevel: number; // 0-10 scale
  recommendation: string;
  activities: string[];
}

interface TimeBlock {
  startTime: Date;
  endTime: Date;
  activity: string;
  type: 'class' | 'meal' | 'travel' | 'study' | 'routine' | 'leisure' | 'gym';
  priority: 'high' | 'medium' | 'low';
  location?: string;
  energyRequired: number; // 0-10 scale
}

interface SimpleBudgetStatus {
  score: number;
  status: 'good' | 'warning' | 'critical';
  recommendations: string[];
}

interface DailyPlan {
  date: Date;
  timeBlocks: TimeBlock[];
  energyForecast: EnergyForecast[];
  travelRecommendations: TravelRoute[];
  mealSuggestions: Recipe[];
  budgetStatus: SimpleBudgetStatus;
  upcomingDeadlines: any[];
  routineReminders: Routine[];
  alerts: Alert[];
  totalCost: number;
  estimatedEnergy: number;
}

export const UKStudentDashboard: React.FC<UKStudentDashboardProps> = ({
  userId,
  profile,
  onProfileUpdate
}) => {
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'budget' | 'meals' | 'travel' | 'academic' | 'routines'>('overview');
  const [energyLevel, setEnergyLevel] = useState(5); // 0-10 scale
  const [showAlerts, setShowAlerts] = useState(true);

  // Load dashboard data on component mount and when date changes
  useEffect(() => {
    loadDashboardData();
  }, [userId, selectedDate]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the backend
      // For now, we'll construct the dashboard data from the profile
      const data = await generateDashboardData();
      setDashboardData(data);
      
      // Generate daily plan
      const plan = await generateDailyPlan(data);
      setDailyPlan(plan);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDashboardData = async (): Promise<any> => {
    // This would be replaced with actual API calls
    return {
      today_schedule: profile.academic_schedule.filter((event: AcademicEvent) => 
        new Date(event.start_time).toDateString() === selectedDate.toDateString()
      ),
      weather: {
        temperature: 12,
        condition: 'cloudy',
        windSpeed: 15,
        humidity: 70,
        precipitation: 0,
        visibility: 10,
        timestamp: selectedDate
      },
      budget_status: {
        score: 75,
        status: 'good',
        recommendations: ['Consider reducing entertainment spending']
      },
      upcoming_deadlines: [],
      routine_reminders: profile.active_routines,
      travel_recommendations: [],
      meal_suggestions: [],
      alerts: []
    };
  };

  const generateDailyPlan = async (data: any): Promise<DailyPlan> => {
    const timeBlocks = generateTimeBlocks(data);
    const energyForecast = generateEnergyForecast(timeBlocks);
    
    return {
      date: selectedDate,
      timeBlocks,
      energyForecast,
      travelRecommendations: data.travel_recommendations,
      mealSuggestions: data.meal_suggestions,
      budgetStatus: data.budget_status,
      upcomingDeadlines: data.upcoming_deadlines,
      routineReminders: data.routine_reminders,
      alerts: data.alerts,
      totalCost: calculateDailyCost(timeBlocks),
      estimatedEnergy: calculateEstimatedEnergy(energyForecast)
    };
  };

  const generateTimeBlocks = (data: any): TimeBlock[] => {
    const blocks: TimeBlock[] = [];
    
    // Add morning routine
    blocks.push({
      startTime: new Date(selectedDate.setHours(7, 0, 0, 0)),
      endTime: new Date(selectedDate.setHours(8, 30, 0, 0)),
      activity: 'Morning Routine',
      type: 'routine',
      priority: 'high',
      energyRequired: 3
    });

    // Add breakfast
    blocks.push({
      startTime: new Date(selectedDate.setHours(8, 0, 0, 0)),
      endTime: new Date(selectedDate.setHours(8, 30, 0, 0)),
      activity: 'Breakfast',
      type: 'meal',
      priority: 'high',
      energyRequired: 1
    });

    // Add academic events
    data.today_schedule.forEach((event: AcademicEvent) => {
      blocks.push({
        startTime: new Date(event.start_time),
        endTime: event.end_time ? new Date(event.end_time) : new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000),
        activity: event.title,
        type: 'class',
        priority: event.importance >= 4 ? 'high' : 'medium',
        location: event.location,
        energyRequired: 5
      });
    });

    // Add lunch
    blocks.push({
      startTime: new Date(selectedDate.setHours(12, 30, 0, 0)),
      endTime: new Date(selectedDate.setHours(13, 30, 0, 0)),
      activity: 'Lunch',
      type: 'meal',
      priority: 'high',
      energyRequired: 1
    });

    // Add gym session
    blocks.push({
      startTime: new Date(selectedDate.setHours(17, 0, 0, 0)),
      endTime: new Date(selectedDate.setHours(18, 30, 0, 0)),
      activity: 'Gym Session',
      type: 'gym',
      priority: 'medium',
      location: 'Selly Oak Gym',
      energyRequired: 7
    });

    // Add dinner
    blocks.push({
      startTime: new Date(selectedDate.setHours(19, 0, 0, 0)),
      endTime: new Date(selectedDate.setHours(20, 0, 0, 0)),
      activity: 'Dinner',
      type: 'meal',
      priority: 'high',
      energyRequired: 1
    });

    // Add evening routine
    blocks.push({
      startTime: new Date(selectedDate.setHours(21, 0, 0, 0)),
      endTime: new Date(selectedDate.setHours(22, 30, 0, 0)),
      activity: 'Evening Routine',
      type: 'routine',
      priority: 'medium',
      energyRequired: 2
    });

    return blocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  };

  const generateEnergyForecast = (timeBlocks: TimeBlock[]): EnergyForecast[] => {
    const forecast: EnergyForecast[] = [];
    
    for (let hour = 7; hour <= 22; hour++) {
      const blockAtHour = timeBlocks.find(block => 
        block.startTime.getHours() <= hour && block.endTime.getHours() > hour
      );
      
      let energyLevel = 5;
      let recommendation = 'Steady pace';
      let activities: string[] = [];

      if (blockAtHour) {
        energyLevel = Math.max(1, 10 - blockAtHour.energyRequired);
        activities = [blockAtHour.activity];
        
        if (blockAtHour.type === 'gym') {
          recommendation = 'High energy activity - stay hydrated';
        } else if (blockAtHour.type === 'class') {
          recommendation = 'Focus time - minimize distractions';
        } else if (blockAtHour.type === 'meal') {
          recommendation = 'Refuel and hydrate';
        } else if (blockAtHour.type === 'routine') {
          recommendation = 'Self-care time';
        }
      } else {
        recommendation = 'Free time - study or leisure';
      }

      forecast.push({
        hour,
        energyLevel,
        recommendation,
        activities
      });
    }

    return forecast;
  };

  const calculateDailyCost = (timeBlocks: TimeBlock[]): number => {
    let cost = 0;
    
    // Travel costs (estimate £2.05-2.10 per train journey)
    const travelBlocks = timeBlocks.filter(b => b.type === 'travel');
    cost += travelBlocks.length * 2.07;

    // Meal costs (estimate £3-5 per meal)
    const mealBlocks = timeBlocks.filter(b => b.type === 'meal');
    cost += mealBlocks.length * 4;

    return cost;
  };

  const calculateEstimatedEnergy = (forecast: EnergyForecast[]): number => {
    const totalEnergy = forecast.reduce((sum, f) => sum + f.energyLevel, 0);
    return Math.round(totalEnergy / forecast.length);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UK Student Dashboard</h1>
              <p className="text-gray-600 mt-1">{formatDate(selectedDate)}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600">Energy Level</div>
                <div className="flex items-center space-x-2 mt-1">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-lg font-semibold text-gray-900">{energyLevel}/10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {showAlerts && dailyPlan && dailyPlan.alerts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-yellow-900">Active Alerts</h3>
                <div className="mt-2 space-y-1">
                  {dailyPlan.alerts.map((alert, idx) => (
                    <p key={idx} className="text-sm text-yellow-800">• {alert.message}</p>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowAlerts(false)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-gray-200 mb-8">
          {(['overview', 'schedule', 'budget', 'meals', 'travel', 'academic', 'routines'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && dailyPlan && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Estimated Daily Cost</div>
                <div className="text-2xl font-bold text-gray-900 mt-2">£{dailyPlan.totalCost.toFixed(2)}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Budget Status</div>
                <div className={`text-2xl font-bold mt-2 ${
                  dailyPlan.budgetStatus?.status === 'good' ? 'text-green-600' :
                  dailyPlan.budgetStatus?.status === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {dailyPlan.budgetStatus?.status ? dailyPlan.budgetStatus.status.charAt(0).toUpperCase() + dailyPlan.budgetStatus.status.slice(1) : 'N/A'}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Energy Forecast</div>
                <div className="text-2xl font-bold text-gray-900 mt-2">{dailyPlan.estimatedEnergy}/10</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm text-gray-600">Upcoming Deadlines</div>
                <div className="text-2xl font-bold text-gray-900 mt-2">{dailyPlan.upcomingDeadlines.length}</div>
              </div>
            </div>

            {/* Energy Forecast Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Energy Forecast</h3>
              <div className="space-y-2">
                {dailyPlan.energyForecast.map((forecast) => (
                  <div key={forecast.hour} className="flex items-center space-x-3">
                    <div className="w-12 text-sm font-medium text-gray-600">{forecast.hour}:00</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(forecast.energyLevel / 10) * 100}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600">{forecast.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Recommendations */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Tips</h3>
              <ul className="space-y-2">
                {dailyPlan.budgetStatus.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700">• {rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && dailyPlan && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Daily Schedule</h3>
            <div className="space-y-4">
              {dailyPlan.timeBlocks.map((block, idx) => (
                <div key={idx} className="border-l-4 border-blue-600 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{block.activity}</h4>
                      <p className="text-sm text-gray-600">
                        {formatTime(block.startTime)} - {formatTime(block.endTime)}
                      </p>
                      {block.location && (
                        <p className="text-sm text-gray-500">📍 {block.location}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        block.type === 'class' ? 'bg-blue-100 text-blue-800' :
                        block.type === 'meal' ? 'bg-green-100 text-green-800' :
                        block.type === 'gym' ? 'bg-red-100 text-red-800' :
                        block.type === 'routine' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {block.type}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">Energy: {block.energyRequired}/10</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <BudgetManager
            userId={userId}
            budgets={[]}
            expenses={[]}
            budgetHealth={{
              overallScore: dailyPlan?.budgetStatus?.score || 0,
              status: dailyPlan?.budgetStatus?.status || 'good',
              totalBudget: 200,
              totalSpent: 150,
              remainingBudget: 50,
              categoryBreakdown: [],
              recommendations: dailyPlan?.budgetStatus?.recommendations || [],
              alerts: []
            }}
            onBudgetUpdate={() => {}}
            onExpenseAdd={() => {}}
          />
        )}

        {activeTab === 'meals' && (
          <MealPlanningDashboard
            userId={userId}
            cookingTimeLimits={profile.preferences.cooking_time_limits}
            budget={50}
            dietaryRestrictions={profile.preferences.dietary_restrictions}
          />
        )}

        {activeTab === 'travel' && (
          <TravelOptimizer
            userId={userId}
            destinations={[]}
            preferences={{
              preferredMethod: profile.transport_preferences.preferred_method as 'bike' | 'train' | 'mixed',
              maxWalkingDistance: 1000,
              weatherThreshold: {
                minTemperature: 5,
                maxWindSpeed: 25,
                maxPrecipitation: 50
              },
              fitnessLevel: 'medium',
              budgetConstraints: {
                dailyLimit: 410, // £4.10 per day
                weeklyLimit: 2870 // £28.70 per week
              },
              timePreferences: {
                bufferTime: 15,
                maxTravelTime: 60
              }
            }}
          />
        )}

        {activeTab === 'academic' && (
          <AcademicDashboard
            userId={userId}
          />
        )}

        {activeTab === 'routines' && (
          <div className="space-y-6">
            {profile.active_routines.map((routine) => (
              <RoutineTracker
                key={routine.id}
                routine={routine}
                onComplete={() => {}}
                onMiss={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
