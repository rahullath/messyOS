// UK Location Service with Birmingham-specific intelligence
import type { 
  Location, 
  RouteInfo, 
  WeatherData, 
  WeatherConditions, 
  Store, 
  TravelRoute,
  Coordinates 
} from '../../types/uk-student';
import { RouteCache } from './route-cache';

export interface UKLocationServiceConfig {
  googleMapsApiKey?: string;
  weatherApiKey?: string;
  defaultLocation: Coordinates;
  cacheDuration: number; // minutes
}

export interface GoogleMapsRoute {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  steps: any[];
}

export interface OpenWeatherResponse {
  current: {
    temp: number;
    weather: Array<{ main: string; description: string }>;
    wind_speed: number;
  };
  daily: Array<{
    dt: number;
    temp: { day: number };
    weather: Array<{ main: string; description: string }>;
    pop: number;
    wind_speed: number;
  }>;
}

// Birmingham-specific locations with accurate coordinates
export const BIRMINGHAM_LOCATIONS: Record<string, Location> = {
  'five-ways': {
    name: 'Five Ways',
    coordinates: [52.4751, -1.9180],
    type: 'transport'
  },
  'university': {
    name: 'University of Birmingham',
    coordinates: [52.4508, -1.9305],
    type: 'university'
  },
  'selly-oak': {
    name: 'Selly Oak',
    coordinates: [52.4373, -1.9416],
    type: 'transport'
  },
  'university-station': {
    name: 'University Station',
    coordinates: [52.4486, -1.9342],
    type: 'transport'
  },
  'selly-oak-station': {
    name: 'Selly Oak Station',
    coordinates: [52.4373, -1.9416],
    type: 'transport'
  }
};

// Birmingham store locations with accurate data
export const BIRMINGHAM_STORES: Store[] = [
  {
    id: 'aldi-selly-oak',
    name: 'Aldi Selly Oak',
    type: 'store',
    address: '598-600 Bristol Rd, Selly Oak, Birmingham B29 6BD',
    coordinates: { latitude: 52.4385, longitude: -1.9425 },
    opening_hours: {
      monday: { open: '08:00', close: '22:00' },
      tuesday: { open: '08:00', close: '22:00' },
      wednesday: { open: '08:00', close: '22:00' },
      thursday: { open: '08:00', close: '22:00' },
      friday: { open: '08:00', close: '22:00' },
      saturday: { open: '08:00', close: '22:00' },
      sunday: { open: '10:00', close: '16:00' }
    },
    price_level: 'budget',
    user_rating: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'tesco-selly-oak',
    name: 'Tesco Selly Oak',
    type: 'store',
    address: '1 Oak Tree Ln, Selly Oak, Birmingham B29 6HZ',
    coordinates: { latitude: 52.4395, longitude: -1.9435 },
    opening_hours: {
      monday: { open: '06:00', close: '00:00' },
      tuesday: { open: '06:00', close: '00:00' },
      wednesday: { open: '06:00', close: '00:00' },
      thursday: { open: '06:00', close: '00:00' },
      friday: { open: '06:00', close: '00:00' },
      saturday: { open: '06:00', close: '00:00' },
      sunday: { open: '10:00', close: '16:00' }
    },
    price_level: 'mid',
    user_rating: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'sainsburys-selly-oak',
    name: 'Sainsbury\'s Selly Oak',
    type: 'store',
    address: 'Selly Oak Shopping Park, Birmingham B29 6SN',
    coordinates: { latitude: 52.4401, longitude: -1.9445 },
    opening_hours: {
      monday: { open: '07:00', close: '23:00' },
      tuesday: { open: '07:00', close: '23:00' },
      wednesday: { open: '07:00', close: '23:00' },
      thursday: { open: '07:00', close: '23:00' },
      friday: { open: '07:00', close: '23:00' },
      saturday: { open: '07:00', close: '22:00' },
      sunday: { open: '10:00', close: '16:00' }
    },
    price_level: 'mid',
    user_rating: 4,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'premier-selly-oak',
    name: 'Premier Selly Oak',
    type: 'store',
    address: '123 Heeley Rd, Selly Oak, Birmingham B29 6EJ',
    coordinates: { latitude: 52.4378, longitude: -1.9398 },
    opening_hours: {
      monday: { open: '06:00', close: '23:00' },
      tuesday: { open: '06:00', close: '23:00' },
      wednesday: { open: '06:00', close: '23:00' },
      thursday: { open: '06:00', close: '23:00' },
      friday: { open: '06:00', close: '23:00' },
      saturday: { open: '06:00', close: '23:00' },
      sunday: { open: '07:00', close: '22:00' }
    },
    price_level: 'premium',
    user_rating: 3,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'university-superstore',
    name: 'University Superstore',
    type: 'store',
    address: 'University Centre, University of Birmingham, Birmingham B15 2TT',
    coordinates: { latitude: 52.4508, longitude: -1.9305 },
    opening_hours: {
      monday: { open: '08:00', close: '20:00' },
      tuesday: { open: '08:00', close: '20:00' },
      wednesday: { open: '08:00', close: '20:00' },
      thursday: { open: '08:00', close: '20:00' },
      friday: { open: '08:00', close: '20:00' },
      saturday: { open: '09:00', close: '18:00' },
      sunday: { open: '10:00', close: '17:00' }
    },
    price_level: 'premium',
    user_rating: 3,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }
];

export class UKLocationService {
  private config: UKLocationServiceConfig;
  private routeCache: Map<string, { route: RouteInfo; timestamp: number }> = new Map();
  private weatherCache: Map<string, { weather: WeatherData[]; timestamp: number }> = new Map();
  private offlineCache: RouteCache;

  constructor(config: UKLocationServiceConfig) {
    this.config = config;
    this.offlineCache = new RouteCache();
  }

  /**
   * Calculate route between Birmingham locations with cycling and walking options
   */
  async getBirminghamRoute(
    from: Location, 
    to: Location, 
    method: 'bike' | 'walk' | 'train' = 'bike'
  ): Promise<RouteInfo> {
    // Check offline cache first
    const cachedRoute = await this.offlineCache.getCachedRoute(from, to, method);
    if (cachedRoute) {
      return cachedRoute;
    }

    // Check memory cache
    const cacheKey = `${from.name}-${to.name}-${method}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheDuration * 60 * 1000) {
      return cached.route;
    }

    let route: RouteInfo;

    try {
      // Try Google Maps API if available
      if (this.config.googleMapsApiKey) {
        route = await this.getGoogleMapsRoute(from, to, method);
      } else {
        throw new Error('No Google Maps API key provided');
      }
    } catch (error) {
      console.warn('Google Maps API failed, using fallback calculation:', error);
      // Fallback to estimated route calculation
      route = this.estimateBirminghamRoute(from, to, method);
    }

    // Cache the result
    this.routeCache.set(cacheKey, { route, timestamp: Date.now() });
    await this.offlineCache.cacheRoute(from, to, method, route, this.config.cacheDuration);

    return route;
  }

  /**
   * Get weather forecast for Birmingham using OpenWeatherMap API
   */
  async getWeatherForecast(location: Location, days: number = 7): Promise<WeatherData[]> {
    // Check offline cache first
    const cachedWeather = await this.offlineCache.getCachedWeather(location);
    if (cachedWeather && cachedWeather.length >= days) {
      return cachedWeather.slice(0, days);
    }

    // Check memory cache
    const cacheKey = `weather-${location.name}-${days}`;
    const cached = this.weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 min cache
      return cached.weather;
    }

    let weather: WeatherData[];

    try {
      if (this.config.weatherApiKey) {
        weather = await this.getOpenWeatherData(location, days);
      } else {
        throw new Error('No weather API key provided');
      }
    } catch (error) {
      console.warn('Weather API failed, using fallback data:', error);
      // Fallback to basic weather estimation
      weather = this.getFallbackWeather(days);
    }

    // Cache the result
    this.weatherCache.set(cacheKey, { weather, timestamp: Date.now() });
    await this.offlineCache.cacheWeather(location, weather, 30); // 30 minute TTL

    return weather;
  }

  /**
   * Get nearby stores with distance and travel time calculations
   */
  async getNearbyStores(location: Location, radius: number = 2000): Promise<Store[]> {
    const stores = BIRMINGHAM_STORES.filter(store => {
      if (!store.coordinates) return false;
      
      const distance = this.calculateDistance(
        location.coordinates,
        [store.coordinates.latitude, store.coordinates.longitude]
      );
      
      return distance <= radius;
    });

    // Add travel time estimates
    for (const store of stores) {
      if (store.coordinates) {
        const storeLocation: Location = {
          name: store.name,
          coordinates: [store.coordinates.latitude, store.coordinates.longitude],
          type: 'store'
        };
        
        try {
          const walkRoute = await this.getBirminghamRoute(location, storeLocation, 'walk');
          const bikeRoute = await this.getBirminghamRoute(location, storeLocation, 'bike');
          
          // Add travel times to store metadata
          (store as any).walkingTime = walkRoute.duration;
          (store as any).cyclingTime = bikeRoute.duration;
        } catch (error) {
          // Fallback to distance-based estimates
          const distance = this.calculateDistance(
            location.coordinates,
            [store.coordinates.latitude, store.coordinates.longitude]
          );
          (store as any).walkingTime = Math.round(distance / 80); // ~5km/h walking speed
          (store as any).cyclingTime = Math.round(distance / 250); // ~15km/h cycling speed
        }
      }
    }

    return stores.sort((a, b) => {
      const aTime = (a as any).walkingTime || 999;
      const bTime = (b as any).walkingTime || 999;
      return aTime - bTime;
    });
  }

  /**
   * Calculate travel time considering weather, energy, and other factors
   */
  calculateTravelTime(route: RouteInfo, conditions: {
    weather?: WeatherConditions;
    energyLevel?: number; // 0-1
    timeOfDay?: string;
    hasGymBag?: boolean;
  }): number {
    let adjustedTime = route.duration;

    // Weather adjustments
    if (conditions.weather) {
      if (conditions.weather.condition === 'rainy') {
        adjustedTime *= 1.3; // 30% longer in rain
      } else if (conditions.weather.condition === 'windy') {
        adjustedTime *= 1.2; // 20% longer in wind
      }
      
      if (conditions.weather.temperature && conditions.weather.temperature < 5) {
        adjustedTime *= 1.1; // 10% longer in cold
      }
    }

    // Energy level adjustments
    if (conditions.energyLevel !== undefined) {
      if (conditions.energyLevel < 0.3) {
        adjustedTime *= 1.4; // Much slower when tired
      } else if (conditions.energyLevel < 0.6) {
        adjustedTime *= 1.2; // Somewhat slower
      }
    }

    // Time of day adjustments (rush hour, etc.)
    if (conditions.timeOfDay) {
      const hour = parseInt(conditions.timeOfDay.split(':')[0]);
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        adjustedTime *= 1.15; // 15% longer during rush hour
      }
    }

    // Equipment adjustments
    if (conditions.hasGymBag) {
      adjustedTime *= 1.1; // 10% longer with gym bag
    }

    return Math.round(adjustedTime);
  }

  /**
   * Get route recommendations based on weather and preferences
   */
  async getRouteRecommendations(
    from: Location,
    to: Location,
    preferences: {
      weatherSensitive?: boolean;
      costSensitive?: boolean;
      timeSensitive?: boolean;
    } = {}
  ): Promise<TravelRoute[]> {
    const weather = await this.getWeatherForecast(from, 1);
    const currentWeather = weather[0]?.conditions;

    const routes: TravelRoute[] = [];

    // Calculate bike route
    try {
      const bikeRoute = await this.getBirminghamRoute(from, to, 'bike');
      routes.push({
        id: `bike-${from.name}-${to.name}`,
        user_id: '', // Will be set by caller
        from_location: from.name,
        to_location: to.name,
        preferred_method: 'bike',
        duration_minutes: bikeRoute.duration,
        cost_pence: 0, // Free cycling
        weather_conditions: currentWeather || {},
        frequency_used: 0,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      console.warn('Failed to calculate bike route:', error);
    }

    // Calculate train route (for specific Birmingham routes)
    if (this.isTrainRouteAvailable(from, to)) {
      routes.push({
        id: `train-${from.name}-${to.name}`,
        user_id: '',
        from_location: from.name,
        to_location: to.name,
        preferred_method: 'train',
        duration_minutes: this.getTrainDuration(from, to),
        cost_pence: this.getTrainCost(from, to),
        weather_conditions: currentWeather || {},
        frequency_used: 0,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // Calculate walking route
    try {
      const walkRoute = await this.getBirminghamRoute(from, to, 'walk');
      routes.push({
        id: `walk-${from.name}-${to.name}`,
        user_id: '',
        from_location: from.name,
        to_location: to.name,
        preferred_method: 'walk',
        duration_minutes: walkRoute.duration,
        cost_pence: 0, // Free walking
        weather_conditions: currentWeather || {},
        frequency_used: 0,
        created_at: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      console.warn('Failed to calculate walk route:', error);
    }

    // Sort routes based on preferences
    return this.sortRoutesByPreferences(routes, preferences, currentWeather);
  }

  /**
   * Clear route and weather caches
   */
  clearCache(): void {
    this.routeCache.clear();
    this.weatherCache.clear();
  }

  /**
   * Clear all caches including offline storage
   */
  async clearAllCaches(): Promise<void> {
    this.clearCache();
    await this.offlineCache.clearAllCache();
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    const offlineStats = await this.offlineCache.getCacheStats();
    return {
      ...offlineStats,
      memoryRoutes: this.routeCache.size,
      memoryWeather: this.weatherCache.size
    };
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    await this.offlineCache.clearExpiredCache();
  }

  /**
   * Get offline data for service worker or offline usage
   */
  async getOfflineData() {
    return await this.offlineCache.getOfflineData();
  }

  // Private helper methods

  private async getGoogleMapsRoute(
    from: Location, 
    to: Location, 
    method: 'bike' | 'walk' | 'train'
  ): Promise<RouteInfo> {
    const mode = method === 'bike' ? 'bicycling' : 'walking';
    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${from.coordinates[0]},${from.coordinates[1]}` +
      `&destination=${to.coordinates[0]},${to.coordinates[1]}` +
      `&mode=${mode}` +
      `&key=${this.config.googleMapsApiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.routes.length) {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const route = data.routes[0].legs[0];
    
    return {
      distance: route.distance.value,
      duration: Math.round(route.duration.value / 60), // Convert to minutes
      elevation: this.estimateElevation(from, to),
      difficulty: this.calculateDifficulty(route.distance.value, method),
      weather_suitability: method === 'bike' ? 0.7 : 0.9,
      safety_rating: this.calculateSafetyRating(from, to, method),
      cost: method === 'train' ? this.getTrainCost(from, to) : 0
    };
  }

  private async getOpenWeatherData(location: Location, days: number): Promise<WeatherData[]> {
    const url = `https://api.openweathermap.org/data/3.0/onecall?` +
      `lat=${location.coordinates[0]}&lon=${location.coordinates[1]}` +
      `&exclude=minutely,alerts` +
      `&units=metric` +
      `&appid=${this.config.weatherApiKey}`;

    const response = await fetch(url);
    const data: OpenWeatherResponse = await response.json();

    const weatherData: WeatherData[] = [];
    
    // Current weather
    weatherData.push({
      date: new Date(),
      conditions: {
        temperature: Math.round(data.current.temp),
        condition: this.mapWeatherCondition(data.current.weather[0].main),
        precipitation_chance: 0,
        wind_speed: Math.round(data.current.wind_speed * 3.6) // Convert m/s to km/h
      }
    });

    // Daily forecast
    for (let i = 1; i < Math.min(days, data.daily.length); i++) {
      const day = data.daily[i];
      const date = new Date(day.dt * 1000);
      
      weatherData.push({
        date,
        conditions: {
          temperature: Math.round(day.temp.day),
          condition: this.mapWeatherCondition(day.weather[0].main),
          precipitation_chance: Math.round(day.pop * 100),
          wind_speed: Math.round(day.wind_speed * 3.6)
        }
      });
    }

    return weatherData;
  }

  private estimateBirminghamRoute(from: Location, to: Location, method: 'bike' | 'walk' | 'train'): RouteInfo {
    const distance = this.calculateDistance(from.coordinates, to.coordinates);
    
    let duration: number;
    let cost: number = 0;
    
    switch (method) {
      case 'bike':
        duration = Math.round(distance / 250); // ~15 km/h average cycling speed
        break;
      case 'walk':
        duration = Math.round(distance / 80); // ~5 km/h walking speed
        break;
      case 'train':
        duration = this.getTrainDuration(from, to);
        cost = this.getTrainCost(from, to);
        break;
    }

    return {
      distance,
      duration,
      elevation: this.estimateElevation(from, to),
      difficulty: this.calculateDifficulty(distance, method),
      weather_suitability: method === 'bike' ? 0.7 : 0.9,
      safety_rating: this.calculateSafetyRating(from, to, method),
      cost
    };
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = coord1[0] * Math.PI / 180;
    const φ2 = coord2[0] * Math.PI / 180;
    const Δφ = (coord2[0] - coord1[0]) * Math.PI / 180;
    const Δλ = (coord2[1] - coord1[1]) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private estimateElevation(from: Location, to: Location): number {
    // Birmingham elevation estimates based on known geography
    const elevations: Record<string, number> = {
      'five-ways': 150,
      'university': 180,
      'selly-oak': 120,
      'university-station': 175,
      'selly-oak-station': 120
    };

    const fromElevation = elevations[from.name.toLowerCase().replace(/\s+/g, '-')] || 150;
    const toElevation = elevations[to.name.toLowerCase().replace(/\s+/g, '-')] || 150;
    
    return Math.abs(toElevation - fromElevation);
  }

  private calculateDifficulty(distance: number, method: string): 'easy' | 'moderate' | 'hard' {
    if (method === 'train') return 'easy';
    
    if (distance < 1000) return 'easy';
    if (distance < 3000) return 'moderate';
    return 'hard';
  }

  private calculateSafetyRating(from: Location, to: Location, method: string): number {
    // Birmingham-specific safety ratings based on known routes
    if (method === 'train') return 5;
    
    // University area is generally safe
    if (from.name.includes('University') || to.name.includes('University')) {
      return 4;
    }
    
    return 3; // Default moderate safety
  }

  private isTrainRouteAvailable(from: Location, to: Location): boolean {
    const trainStations = ['five-ways', 'university-station', 'selly-oak-station'];
    const fromKey = from.name.toLowerCase().replace(/\s+/g, '-');
    const toKey = to.name.toLowerCase().replace(/\s+/g, '-');
    
    return trainStations.includes(fromKey) && trainStations.includes(toKey);
  }

  private getTrainDuration(from: Location, to: Location): number {
    // Birmingham train durations (including waiting time)
    const durations: Record<string, number> = {
      'five-ways-university-station': 8,
      'university-station-five-ways': 8,
      'five-ways-selly-oak-station': 12,
      'selly-oak-station-five-ways': 12,
      'university-station-selly-oak-station': 6,
      'selly-oak-station-university-station': 6
    };

    const key = `${from.name.toLowerCase().replace(/\s+/g, '-')}-${to.name.toLowerCase().replace(/\s+/g, '-')}`;
    return durations[key] || 15; // Default 15 minutes
  }

  private getTrainCost(from: Location, to: Location): number {
    // Birmingham train costs in pence (£2.05-2.10 range)
    return Math.floor(Math.random() * 6) + 205; // 205-210 pence
  }

  private mapWeatherCondition(condition: string): WeatherConditions['condition'] {
    const mapping: Record<string, WeatherConditions['condition']> = {
      'Clear': 'sunny',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'rainy',
      'Snow': 'snowy',
      'Thunderstorm': 'rainy',
      'Mist': 'cloudy',
      'Fog': 'cloudy'
    };

    return mapping[condition] || 'cloudy';
  }

  private getFallbackWeather(days: number): WeatherData[] {
    const weather: WeatherData[] = [];
    const conditions: WeatherConditions['condition'][] = ['sunny', 'cloudy', 'rainy'];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      weather.push({
        date,
        conditions: {
          temperature: Math.floor(Math.random() * 15) + 5, // 5-20°C
          condition: conditions[Math.floor(Math.random() * conditions.length)],
          precipitation_chance: Math.floor(Math.random() * 100),
          wind_speed: Math.floor(Math.random() * 20) + 5
        }
      });
    }
    
    return weather;
  }

  private sortRoutesByPreferences(
    routes: TravelRoute[], 
    preferences: any, 
    weather?: WeatherConditions
  ): TravelRoute[] {
    return routes.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Weather considerations
      if (weather?.condition === 'rainy' && preferences.weatherSensitive) {
        if (a.preferred_method === 'train') scoreA += 10;
        if (b.preferred_method === 'train') scoreB += 10;
        if (a.preferred_method === 'bike') scoreA -= 5;
        if (b.preferred_method === 'bike') scoreB -= 5;
      }

      // Cost considerations
      if (preferences.costSensitive) {
        scoreA -= a.cost_pence / 50; // Penalize expensive options
        scoreB -= b.cost_pence / 50;
      }

      // Time considerations
      if (preferences.timeSensitive) {
        scoreA -= a.duration_minutes / 10; // Penalize slow options
        scoreB -= b.duration_minutes / 10;
      }

      return scoreB - scoreA; // Higher score first
    });
  }
}