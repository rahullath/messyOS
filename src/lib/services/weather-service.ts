/**
 * Weather Service for Birmingham UK
 * Provides weather data and cycling recommendations
 */

import type { WeatherImpact } from '../task-management/auto-scheduler';

export interface WeatherData {
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'foggy';
  temperature: number; // celsius
  precipitation_chance: number; // percentage
  wind_speed: number; // mph
  humidity: number; // percentage
  visibility: number; // km
  uv_index: number;
}

export interface WeatherForecast {
  current: WeatherData;
  hourly: Array<WeatherData & { time: string }>;
  daily: Array<WeatherData & { date: string; high: number; low: number }>;
}

export class WeatherService {
  private static readonly BIRMINGHAM_COORDS = {
    lat: 52.4862,
    lng: -1.8904
  };

  /**
   * Get current weather for Birmingham UK
   * In a real implementation, this would call a weather API like OpenWeatherMap
   */
  static async getCurrentWeather(): Promise<WeatherData> {
    // Mock weather data for Birmingham
    // In production, replace with actual API call
    return {
      condition: 'cloudy',
      temperature: 12,
      precipitation_chance: 40,
      wind_speed: 8,
      humidity: 75,
      visibility: 10,
      uv_index: 3
    };
  }

  /**
   * Get weather forecast for Birmingham UK
   */
  static async getWeatherForecast(days: number = 7): Promise<WeatherForecast> {
    const current = await this.getCurrentWeather();
    
    // Mock forecast data
    const hourly = Array.from({ length: 24 }, (_, i) => ({
      ...current,
      time: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
      temperature: current.temperature + Math.random() * 4 - 2,
      precipitation_chance: Math.max(0, Math.min(100, current.precipitation_chance + Math.random() * 20 - 10))
    }));

    const daily = Array.from({ length: days }, (_, i) => ({
      ...current,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      high: current.temperature + Math.random() * 6,
      low: current.temperature - Math.random() * 4,
      precipitation_chance: Math.max(0, Math.min(100, current.precipitation_chance + Math.random() * 30 - 15))
    }));

    return {
      current,
      hourly,
      daily
    };
  }

  /**
   * Convert weather data to WeatherImpact for auto-scheduler
   */
  static weatherDataToImpact(weather: WeatherData): WeatherImpact {
    const cyclingRecommendation = this.getCyclingRecommendation(weather);
    const alternativeTransport = this.getAlternativeTransport(weather);

    return {
      condition: weather.condition,
      temperature: weather.temperature,
      precipitation_chance: weather.precipitation_chance,
      cycling_recommendation: cyclingRecommendation,
      alternative_transport_suggested: alternativeTransport
    };
  }

  /**
   * Get cycling recommendation based on weather conditions
   */
  private static getCyclingRecommendation(weather: WeatherData): 'ideal' | 'acceptable' | 'challenging' | 'avoid' {
    // Temperature considerations
    if (weather.temperature < 0 || weather.temperature > 30) {
      return 'challenging';
    }

    // Precipitation considerations
    if (weather.precipitation_chance > 80) {
      return 'avoid';
    } else if (weather.precipitation_chance > 60) {
      return 'challenging';
    }

    // Wind considerations
    if (weather.wind_speed > 25) {
      return 'avoid';
    } else if (weather.wind_speed > 15) {
      return 'challenging';
    }

    // Visibility considerations
    if (weather.visibility < 2) {
      return 'avoid';
    } else if (weather.visibility < 5) {
      return 'challenging';
    }

    // Condition-specific recommendations
    switch (weather.condition) {
      case 'sunny':
        return weather.temperature >= 5 && weather.temperature <= 25 ? 'ideal' : 'acceptable';
      case 'cloudy':
        return 'acceptable';
      case 'rainy':
        return weather.precipitation_chance > 50 ? 'challenging' : 'acceptable';
      case 'snowy':
        return 'avoid';
      case 'windy':
        return weather.wind_speed > 20 ? 'challenging' : 'acceptable';
      case 'foggy':
        return weather.visibility < 3 ? 'challenging' : 'acceptable';
      default:
        return 'acceptable';
    }
  }

  /**
   * Get alternative transport suggestion
   */
  private static getAlternativeTransport(weather: WeatherData): 'train' | 'walking' | undefined {
    if (weather.precipitation_chance > 70 || weather.wind_speed > 20 || weather.temperature < 2) {
      return 'train';
    }

    if (weather.condition === 'sunny' && weather.temperature >= 10 && weather.temperature <= 20) {
      return 'walking';
    }

    return 'train'; // Default alternative for Birmingham
  }

  /**
   * Get weather-appropriate clothing suggestions
   */
  static getClothingSuggestions(weather: WeatherData): string[] {
    const suggestions: string[] = [];

    if (weather.temperature < 5) {
      suggestions.push('Heavy jacket', 'Gloves', 'Warm hat');
    } else if (weather.temperature < 15) {
      suggestions.push('Light jacket', 'Long sleeves');
    } else if (weather.temperature > 25) {
      suggestions.push('Light clothing', 'Sun hat', 'Sunscreen');
    }

    if (weather.precipitation_chance > 50) {
      suggestions.push('Waterproof jacket', 'Umbrella');
    }

    if (weather.wind_speed > 15) {
      suggestions.push('Windproof jacket');
    }

    if (weather.uv_index > 6) {
      suggestions.push('Sunglasses', 'Sunscreen');
    }

    return suggestions;
  }

  /**
   * Get cycling-specific gear recommendations
   */
  static getCyclingGearRecommendations(weather: WeatherData): string[] {
    const gear: string[] = ['Helmet', 'Lights'];

    if (weather.precipitation_chance > 30) {
      gear.push('Waterproof jacket', 'Mudguards', 'Waterproof gloves');
    }

    if (weather.temperature < 10) {
      gear.push('Thermal layers', 'Warm gloves', 'Leg warmers');
    }

    if (weather.visibility < 5 || weather.condition === 'foggy') {
      gear.push('High-vis clothing', 'Extra lights', 'Reflective gear');
    }

    if (weather.wind_speed > 15) {
      gear.push('Windproof jacket', 'Eye protection');
    }

    return gear;
  }

  /**
   * Calculate estimated cycling time adjustment based on weather
   */
  static getCyclingTimeAdjustment(weather: WeatherData, baseTimeMinutes: number): number {
    let adjustment = 1.0; // Base multiplier

    // Wind adjustment
    if (weather.wind_speed > 20) {
      adjustment += 0.3; // 30% longer
    } else if (weather.wind_speed > 15) {
      adjustment += 0.15; // 15% longer
    }

    // Rain adjustment
    if (weather.precipitation_chance > 70) {
      adjustment += 0.25; // 25% longer for safety
    } else if (weather.precipitation_chance > 40) {
      adjustment += 0.1; // 10% longer
    }

    // Temperature adjustment
    if (weather.temperature < 0) {
      adjustment += 0.2; // 20% longer in freezing conditions
    } else if (weather.temperature > 30) {
      adjustment += 0.15; // 15% longer in hot conditions
    }

    // Visibility adjustment
    if (weather.visibility < 3) {
      adjustment += 0.3; // 30% longer in poor visibility
    }

    return Math.round(baseTimeMinutes * adjustment);
  }

  /**
   * Get weather impact on outdoor activities
   */
  static getActivityImpact(weather: WeatherData): {
    outdoor_exercise: 'ideal' | 'good' | 'challenging' | 'avoid';
    walking: 'ideal' | 'good' | 'challenging' | 'avoid';
    cycling: 'ideal' | 'good' | 'challenging' | 'avoid';
    recommendations: string[];
  } {
    const cycling = this.getCyclingRecommendation(weather);
    
    let outdoor_exercise: 'ideal' | 'good' | 'challenging' | 'avoid';
    let walking: 'ideal' | 'good' | 'challenging' | 'avoid';

    // Outdoor exercise assessment
    if (weather.temperature >= 10 && weather.temperature <= 25 && 
        weather.precipitation_chance < 30 && weather.wind_speed < 15) {
      outdoor_exercise = 'ideal';
    } else if (weather.precipitation_chance > 70 || weather.temperature < 0 || weather.temperature > 35) {
      outdoor_exercise = 'avoid';
    } else if (weather.precipitation_chance > 50 || weather.wind_speed > 20) {
      outdoor_exercise = 'challenging';
    } else {
      outdoor_exercise = 'good';
    }

    // Walking assessment (generally more tolerant than cycling)
    if (weather.temperature >= 5 && weather.temperature <= 30 && 
        weather.precipitation_chance < 50 && weather.wind_speed < 20) {
      walking = 'good';
    } else if (weather.precipitation_chance > 80 || weather.temperature < -5 || weather.temperature > 35) {
      walking = 'avoid';
    } else if (weather.precipitation_chance > 60 || weather.wind_speed > 25) {
      walking = 'challenging';
    } else {
      walking = 'good';
    }

    // Upgrade to ideal if conditions are perfect
    if (weather.condition === 'sunny' && weather.temperature >= 15 && weather.temperature <= 22 && 
        weather.precipitation_chance < 20 && weather.wind_speed < 10) {
      walking = 'ideal';
    }

    const recommendations: string[] = [];
    
    if (weather.precipitation_chance > 50) {
      recommendations.push('Consider indoor alternatives');
    }
    
    if (weather.temperature < 5) {
      recommendations.push('Dress warmly for outdoor activities');
    }
    
    if (weather.wind_speed > 15) {
      recommendations.push('Be cautious of strong winds');
    }

    return {
      outdoor_exercise,
      walking,
      cycling: cycling === 'ideal' ? 'ideal' : cycling === 'acceptable' ? 'good' : cycling,
      recommendations
    };
  }
}

export const weatherService = new WeatherService();