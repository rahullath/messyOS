// Weather Card Component with detailed forecast
import React from 'react';

interface WeatherConditions {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  precipitation_chance: number;
  wind_speed: number;
}

interface WeatherCardProps {
  conditions: WeatherConditions;
  location?: string;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({
  conditions,
  location = 'Birmingham'
}) => {
  const getWeatherIcon = (condition: string, size: 'sm' | 'lg' = 'lg') => {
    const icons: Record<string, string> = {
      'sunny': '☀️',
      'cloudy': '☁️',
      'rainy': '🌧️',
      'snowy': '❄️',
      'windy': '💨'
    };

    const icon = icons[condition.toLowerCase()] || '🌤️';
    return size === 'lg' ? <span className="text-6xl">{icon}</span> : <span className="text-2xl">{icon}</span>;
  };

  const getFeelsLike = (temp: number, windSpeed: number) => {
    // Simple wind chill approximation
    if (temp < 10 && windSpeed > 10) {
      return Math.round(temp - (windSpeed / 10) * 2);
    }
    return temp;
  };

  const getWeatherAdvice = () => {
    const { condition, temperature, precipitation_chance } = conditions;

    if (condition === 'rainy' || precipitation_chance > 60) {
      return { icon: '☔', text: 'Bring an umbrella', color: 'text-blue-600' };
    }
    if (condition === 'sunny' && temperature > 15) {
      return { icon: '😎', text: 'Perfect day out!', color: 'text-yellow-600' };
    }
    if (temperature < 5) {
      return { icon: '🧥', text: 'Bundle up warm', color: 'text-indigo-600' };
    }
    if (conditions.wind_speed > 30) {
      return { icon: '💨', text: 'Very windy today', color: 'text-gray-600' };
    }
    return { icon: '👍', text: 'Nice weather', color: 'text-green-600' };
  };

  const advice = getWeatherAdvice();
  const feelsLike = getFeelsLike(conditions.temperature, conditions.wind_speed);

  return (
    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-blue-100 mb-1">Weather in</h3>
          <h2 className="text-2xl font-bold">{location}</h2>
        </div>
        {getWeatherIcon(conditions.condition, 'lg')}
      </div>

      <div className="space-y-4">
        {/* Main Temperature */}
        <div className="flex items-baseline space-x-2">
          <span className="text-5xl font-bold">{Math.round(conditions.temperature)}°C</span>
          {feelsLike !== conditions.temperature && (
            <span className="text-lg text-blue-200">Feels like {feelsLike}°C</span>
          )}
        </div>

        {/* Condition */}
        <div className="text-xl capitalize text-blue-100">
          {conditions.condition}
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-400/30">
          <div>
            <div className="text-xs text-blue-200 mb-1">Precipitation</div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">💧</span>
              <span className="text-lg font-semibold">{conditions.precipitation_chance}%</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-blue-200 mb-1">Wind Speed</div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">💨</span>
              <span className="text-lg font-semibold">{Math.round(conditions.wind_speed)} km/h</span>
            </div>
          </div>
        </div>

        {/* Weather Advice */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{advice.icon}</span>
            <span className="font-medium">{advice.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
