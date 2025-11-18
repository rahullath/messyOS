import React, { useState, useEffect } from 'react';
import type { 
  TravelRoute, 
  Location, 
  WeatherData, 
  TravelPreferences,
  TravelPlan,
  TravelConditions 
} from '../../types/uk-student-travel';
import { TravelService } from '../../lib/uk-student/travel-service';

interface TravelOptimizerProps {
  userId: string;
  currentLocation?: Location;
  destinations: Location[];
  preferences: TravelPreferences;
  className?: string;
}

export const TravelOptimizer: React.FC<TravelOptimizerProps> = ({
  userId,
  currentLocation,
  destinations,
  preferences,
  className = ''
}) => {
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TravelRoute | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number>(3);

  const travelService = new TravelService();

  useEffect(() => {
    if (destinations.length > 0) {
      generateTravelPlan();
    }
  }, [destinations, preferences, energyLevel]);

  const generateTravelPlan = async () => {
    setLoading(true);
    try {
      // Mock weather data - in real implementation, fetch from weather API
      const mockWeather: WeatherData = {
        temperature: 12,
        condition: 'cloudy',
        windSpeed: 15,
        humidity: 70,
        precipitation: 0,
        visibility: 10,
        timestamp: new Date(),
        forecast: false
      };
      
      setWeather(mockWeather);
      
      const plan = await travelService.generateDailyTravelPlan(
        userId,
        destinations,
        preferences,
        mockWeather
      );
      
      setTravelPlan(plan);
    } catch (error) {
      console.error('Failed to generate travel plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOptimalRoute = async (from: Location, to: Location) => {
    if (!weather) return;
    
    const conditions: TravelConditions = {
      weather,
      userEnergy: energyLevel,
      timeConstraints: {
        departure: new Date(),
        arrival: new Date(Date.now() + 60 * 60 * 1000),
        flexibility: 15
      }
    };

    try {
      const route = await travelService.getOptimalRoute(from, to, conditions, preferences);
      setSelectedRoute(route);
    } catch (error) {
      console.error('Failed to get optimal route:', error);
    }
  };

  const formatCost = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'bike': return '🚴';
      case 'train': return '🚂';
      case 'walk': return '🚶';
      case 'bus': return '🚌';
      default: return '🚶';
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny': return '☀️';
      case 'cloudy': return '☁️';
      case 'rainy': return '🌧️';
      case 'snowy': return '❄️';
      case 'stormy': return '⛈️';
      default: return '☁️';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Travel Optimizer</h2>
        {weather && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>{getWeatherIcon(weather.condition)}</span>
            <span>{weather.temperature}°C</span>
            <span className="capitalize">{weather.condition}</span>
          </div>
        )}
      </div>

      {/* Energy Level Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Energy Level
        </label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setEnergyLevel(level)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                energyLevel === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          1 = Very tired, 5 = Very energetic
        </p>
      </div>

      {/* Travel Plan Summary */}
      {travelPlan && (
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total Cost</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatCost(travelPlan.totalCost)}
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Total Time</div>
              <div className="text-lg font-semibold text-green-600">
                {formatDuration(travelPlan.totalTime)}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Distance</div>
              <div className="text-lg font-semibold text-purple-600">
                {(travelPlan.totalDistance / 1000).toFixed(1)}km
              </div>
            </div>
          </div>

          {/* Budget Alert */}
          {travelPlan.totalCost > preferences.budgetConstraints.dailyLimit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">⚠️</span>
                <span className="text-red-700 text-sm">
                  Daily travel cost exceeds budget limit of {formatCost(preferences.budgetConstraints.dailyLimit)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Route List */}
      {travelPlan && travelPlan.routes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800">Recommended Routes</h3>
          {travelPlan.routes.map((route, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedRoute(route)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getMethodIcon(route.method)}</span>
                  <div>
                    <div className="font-medium text-gray-800">
                      {route.from.name} → {route.to.name}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {route.method} • {formatDuration(route.duration)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">
                    {formatCost(route.cost)}
                  </div>
                  <div className={`text-sm ${getDifficultyColor(route.difficulty)}`}>
                    {route.difficulty}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Energy: {route.energyRequired}/5</span>
                  <span>Weather: {Math.round(route.weatherSuitability * 100)}%</span>
                  <span>Safety: {route.safetyRating}/5</span>
                </div>
                {route.elevation > 0 && (
                  <span>↗️ {route.elevation}m elevation</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Weather Considerations */}
      {travelPlan && travelPlan.weatherConsiderations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Weather Considerations</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <ul className="space-y-1">
              {travelPlan.weatherConsiderations.map((consideration, index) => (
                <li key={index} className="text-sm text-yellow-800 flex items-start">
                  <span className="mr-2">•</span>
                  <span>{consideration}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {travelPlan && travelPlan.recommendations.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">Recommendations</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <ul className="space-y-1">
              {travelPlan.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-blue-800 flex items-start">
                  <span className="mr-2">💡</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 flex space-x-3">
        <button
          onClick={generateTravelPlan}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Refresh Plan
        </button>
        <button
          onClick={() => {/* Handle save plan */}}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Save Plan
        </button>
      </div>
    </div>
  );
};

export default TravelOptimizer;