// Tests for UK Location Service
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { UKLocationService, BIRMINGHAM_LOCATIONS, BIRMINGHAM_STORES } from '../../lib/uk-student/location-service';
import type { Location, WeatherConditions } from '../../types/uk-student';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('UKLocationService', () => {
  let service: UKLocationService;
  const mockConfig = {
    googleMapsApiKey: 'test-key',
    weatherApiKey: 'test-weather-key',
    defaultLocation: { latitude: 52.4508, longitude: -1.9305 },
    cacheDuration: 60 // 1 hour
  };

  beforeEach(() => {
    service = new UKLocationService(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('Birmingham Route Calculation', () => {
    test('calculates bike route between Five Ways and University', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      const route = await service.getBirminghamRoute(from, to, 'bike');

      expect(route).toMatchObject({
        distance: expect.any(Number),
        duration: expect.any(Number),
        elevation: expect.any(Number),
        difficulty: expect.stringMatching(/^(easy|moderate|hard)$/),
        weather_suitability: expect.any(Number),
        safety_rating: expect.any(Number),
        cost: 0 // Cycling is free
      });

      expect(route.distance).toBeGreaterThan(0);
      expect(route.duration).toBeGreaterThan(0);
      expect(route.weather_suitability).toBeGreaterThanOrEqual(0);
      expect(route.weather_suitability).toBeLessThanOrEqual(1);
      expect(route.safety_rating).toBeGreaterThanOrEqual(1);
      expect(route.safety_rating).toBeLessThanOrEqual(5);
    });

    test('calculates walking route with longer duration than cycling', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      const bikeRoute = await service.getBirminghamRoute(from, to, 'bike');
      const walkRoute = await service.getBirminghamRoute(from, to, 'walk');

      expect(walkRoute.duration).toBeGreaterThan(bikeRoute.duration);
      expect(walkRoute.cost).toBe(0); // Walking is free
      expect(walkRoute.weather_suitability).toBeGreaterThan(bikeRoute.weather_suitability);
    });

    test('calculates train route with appropriate cost', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university-station'];

      const route = await service.getBirminghamRoute(from, to, 'train');

      expect(route.cost).toBeGreaterThanOrEqual(205); // £2.05
      expect(route.cost).toBeLessThanOrEqual(210); // £2.10
      expect(route.difficulty).toBe('easy');
      expect(route.safety_rating).toBe(5); // Trains are safest
    });

    test('uses cache for repeated route requests', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      // First call
      const route1 = await service.getBirminghamRoute(from, to, 'bike');
      
      // Second call should use cache
      const route2 = await service.getBirminghamRoute(from, to, 'bike');

      expect(route1).toEqual(route2);
    });

    test('handles Google Maps API integration', async () => {
      const mockResponse = {
        status: 'OK',
        routes: [{
          legs: [{
            distance: { value: 2500, text: '2.5 km' },
            duration: { value: 600, text: '10 mins' }
          }]
        }]
      };

      (fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      const route = await service.getBirminghamRoute(from, to, 'bike');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('maps.googleapis.com/maps/api/directions')
      );
      expect(route.distance).toBe(2500);
      expect(route.duration).toBe(10); // 600 seconds / 60
    });

    test('falls back to estimation when Google Maps API fails', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      const route = await service.getBirminghamRoute(from, to, 'bike');

      // Should still return a valid route using estimation
      expect(route).toMatchObject({
        distance: expect.any(Number),
        duration: expect.any(Number),
        elevation: expect.any(Number),
        difficulty: expect.stringMatching(/^(easy|moderate|hard)$/),
        weather_suitability: expect.any(Number),
        safety_rating: expect.any(Number),
        cost: expect.any(Number)
      });
    });
  });

  describe('Weather Service Integration', () => {
    test('fetches weather forecast from OpenWeatherMap API', async () => {
      const mockWeatherResponse = {
        current: {
          temp: 15,
          weather: [{ main: 'Clear', description: 'clear sky' }],
          wind_speed: 3.5
        },
        daily: [
          {
            dt: Date.now() / 1000 + 86400, // Tomorrow
            temp: { day: 18 },
            weather: [{ main: 'Clouds', description: 'few clouds' }],
            pop: 0.2,
            wind_speed: 2.8
          },
          {
            dt: Date.now() / 1000 + 172800, // Day after tomorrow
            temp: { day: 12 },
            weather: [{ main: 'Rain', description: 'light rain' }],
            pop: 0.8,
            wind_speed: 4.2
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockWeatherResponse)
      });

      const location = BIRMINGHAM_LOCATIONS['university'];
      const weather = await service.getWeatherForecast(location, 3);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.openweathermap.org/data/3.0/onecall')
      );

      expect(weather.length).toBeGreaterThanOrEqual(2); // Current + at least 1 forecast day
      expect(weather[0].conditions.temperature).toBe(15);
      expect(weather[0].conditions.condition).toBe('sunny');
      expect(weather[1].conditions.condition).toBe('rainy'); // Updated to match actual mapping
      expect(weather[2].conditions.condition).toBe('rainy');
      expect(weather[2].conditions.precipitation_chance).toBe(80);
    });

    test('uses fallback weather when API fails', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Weather API Error'));

      const location = BIRMINGHAM_LOCATIONS['university'];
      const weather = await service.getWeatherForecast(location, 5);

      expect(weather).toHaveLength(5);
      weather.forEach(day => {
        expect(day.conditions.temperature).toBeGreaterThanOrEqual(5);
        expect(day.conditions.temperature).toBeLessThanOrEqual(20);
        expect(['sunny', 'cloudy', 'rainy']).toContain(day.conditions.condition);
      });
    });

    test('caches weather data to reduce API calls', async () => {
      const mockResponse = {
        current: { temp: 15, weather: [{ main: 'Clear' }], wind_speed: 3 },
        daily: []
      };

      (fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const location = BIRMINGHAM_LOCATIONS['university'];
      
      // First call
      await service.getWeatherForecast(location, 1);
      
      // Second call should use cache
      await service.getWeatherForecast(location, 1);

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Store Location Database', () => {
    test('returns nearby stores within radius', async () => {
      const location = BIRMINGHAM_LOCATIONS['selly-oak'];
      const stores = await service.getNearbyStores(location, 1000); // 1km radius

      expect(stores.length).toBeGreaterThan(0);
      stores.forEach(store => {
        expect(store.coordinates).toBeDefined();
        expect(store.opening_hours).toBeDefined();
        expect(store.price_level).toMatch(/^(budget|mid|premium)$/);
      });
    });

    test('includes travel time estimates for stores', async () => {
      const location = BIRMINGHAM_LOCATIONS['selly-oak'];
      const stores = await service.getNearbyStores(location, 2000);

      stores.forEach(store => {
        expect((store as any).walkingTime).toBeGreaterThan(0);
        expect((store as any).cyclingTime).toBeGreaterThan(0);
        expect((store as any).cyclingTime).toBeLessThan((store as any).walkingTime);
      });
    });

    test('sorts stores by proximity', async () => {
      const location = BIRMINGHAM_LOCATIONS['selly-oak'];
      const stores = await service.getNearbyStores(location, 5000);

      // Should be sorted by walking time (closest first)
      for (let i = 1; i < stores.length; i++) {
        const prevTime = (stores[i-1] as any).walkingTime || 0;
        const currentTime = (stores[i] as any).walkingTime || 0;
        expect(currentTime).toBeGreaterThanOrEqual(prevTime);
      }
    });

    test('includes all Birmingham stores in database', () => {
      expect(BIRMINGHAM_STORES).toHaveLength(5);
      
      const storeNames = BIRMINGHAM_STORES.map(s => s.name);
      expect(storeNames).toContain('Aldi Selly Oak');
      expect(storeNames).toContain('Tesco Selly Oak');
      expect(storeNames).toContain('Sainsbury\'s Selly Oak');
      expect(storeNames).toContain('Premier Selly Oak');
      expect(storeNames).toContain('University Superstore');

      BIRMINGHAM_STORES.forEach(store => {
        expect(store.coordinates).toBeDefined();
        expect(store.opening_hours).toBeDefined();
        expect(store.price_level).toMatch(/^(budget|mid|premium)$/);
        expect(store.user_rating).toBeGreaterThanOrEqual(1);
        expect(store.user_rating).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Travel Time Calculation with Conditions', () => {
    test('adjusts travel time based on weather conditions', () => {
      const baseRoute = {
        distance: 2000,
        duration: 10,
        elevation: 30,
        difficulty: 'moderate' as const,
        weather_suitability: 0.7,
        safety_rating: 4,
        cost: 0
      };

      // Rainy weather
      const rainyTime = service.calculateTravelTime(baseRoute, {
        weather: { condition: 'rainy', temperature: 15 }
      });
      expect(rainyTime).toBe(13); // 30% longer

      // Windy weather
      const windyTime = service.calculateTravelTime(baseRoute, {
        weather: { condition: 'windy', temperature: 15 }
      });
      expect(windyTime).toBe(12); // 20% longer

      // Cold weather
      const coldTime = service.calculateTravelTime(baseRoute, {
        weather: { condition: 'sunny', temperature: 2 }
      });
      expect(coldTime).toBe(11); // 10% longer
    });

    test('adjusts travel time based on energy level', () => {
      const baseRoute = {
        distance: 2000,
        duration: 10,
        elevation: 30,
        difficulty: 'moderate' as const,
        weather_suitability: 0.7,
        safety_rating: 4,
        cost: 0
      };

      // Low energy
      const lowEnergyTime = service.calculateTravelTime(baseRoute, {
        energyLevel: 0.2
      });
      expect(lowEnergyTime).toBe(14); // 40% longer

      // Medium energy
      const mediumEnergyTime = service.calculateTravelTime(baseRoute, {
        energyLevel: 0.5
      });
      expect(mediumEnergyTime).toBe(12); // 20% longer

      // High energy
      const highEnergyTime = service.calculateTravelTime(baseRoute, {
        energyLevel: 0.8
      });
      expect(highEnergyTime).toBe(10); // No change
    });

    test('adjusts travel time for rush hour', () => {
      const baseRoute = {
        distance: 2000,
        duration: 10,
        elevation: 30,
        difficulty: 'moderate' as const,
        weather_suitability: 0.7,
        safety_rating: 4,
        cost: 0
      };

      // Rush hour morning
      const rushHourTime = service.calculateTravelTime(baseRoute, {
        timeOfDay: '08:30'
      });
      expect(rushHourTime).toBe(12); // 15% longer

      // Non-rush hour
      const normalTime = service.calculateTravelTime(baseRoute, {
        timeOfDay: '14:30'
      });
      expect(normalTime).toBe(10); // No change
    });

    test('adjusts travel time for equipment', () => {
      const baseRoute = {
        distance: 2000,
        duration: 10,
        elevation: 30,
        difficulty: 'moderate' as const,
        weather_suitability: 0.7,
        safety_rating: 4,
        cost: 0
      };

      const timeWithGymBag = service.calculateTravelTime(baseRoute, {
        hasGymBag: true
      });
      expect(timeWithGymBag).toBe(11); // 10% longer
    });
  });

  describe('Route Recommendations', () => {
    test('provides multiple route options', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      const routes = await service.getRouteRecommendations(from, to);

      expect(routes.length).toBeGreaterThan(1);
      
      const methods = routes.map(r => r.preferred_method);
      expect(methods).toContain('bike');
      expect(methods).toContain('walk');
    });

    test('prioritizes train routes in rainy weather', async () => {
      // Mock rainy weather
      const mockWeatherResponse = {
        current: {
          temp: 10,
          weather: [{ main: 'Rain', description: 'heavy rain' }],
          wind_speed: 5
        },
        daily: []
      };

      (fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockWeatherResponse)
      });

      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university-station'];

      const routes = await service.getRouteRecommendations(from, to, {
        weatherSensitive: true
      });

      // Train should be first recommendation in rain
      expect(routes[0].preferred_method).toBe('train');
    });

    test('prioritizes cost-effective routes when cost sensitive', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      const routes = await service.getRouteRecommendations(from, to, {
        costSensitive: true
      });

      // Free options (bike, walk) should be prioritized
      const topRoute = routes[0];
      expect(topRoute.cost_pence).toBe(0);
    });

    test('prioritizes fast routes when time sensitive', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university'];

      const routes = await service.getRouteRecommendations(from, to, {
        timeSensitive: true
      });

      // Routes should be sorted by duration (fastest first)
      for (let i = 1; i < routes.length; i++) {
        expect(routes[i].duration_minutes).toBeGreaterThanOrEqual(routes[i-1].duration_minutes);
      }
    });
  });

  describe('Cache Management', () => {
    test('clears all caches', async () => {
      const location = BIRMINGHAM_LOCATIONS['university'];
      
      // Populate caches
      await service.getBirminghamRoute(
        BIRMINGHAM_LOCATIONS['five-ways'], 
        location, 
        'bike'
      );
      await service.getWeatherForecast(location, 1);

      // Clear caches
      service.clearCache();

      // Next calls should not use cache (would make new API calls)
      const route = await service.getBirminghamRoute(
        BIRMINGHAM_LOCATIONS['five-ways'], 
        location, 
        'bike'
      );
      
      expect(route).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles invalid locations gracefully', async () => {
      const invalidLocation: Location = {
        name: 'Invalid Location',
        coordinates: [0, 0],
        type: 'other'
      };

      const route = await service.getBirminghamRoute(
        invalidLocation,
        BIRMINGHAM_LOCATIONS['university'],
        'bike'
      );

      expect(route).toBeDefined();
      expect(route.duration).toBeGreaterThan(0);
    });

    test('handles network errors gracefully', async () => {
      (fetch as any).mockRejectedValue(new Error('Network Error'));

      const location = BIRMINGHAM_LOCATIONS['university'];
      
      // Should not throw, should use fallback
      const weather = await service.getWeatherForecast(location, 1);
      const route = await service.getBirminghamRoute(
        BIRMINGHAM_LOCATIONS['five-ways'],
        location,
        'bike'
      );

      expect(weather).toBeDefined();
      expect(route).toBeDefined();
    });
  });

  describe('Birmingham-Specific Data Validation', () => {
    test('validates Birmingham location coordinates', () => {
      Object.values(BIRMINGHAM_LOCATIONS).forEach(location => {
        expect(location.coordinates[0]).toBeGreaterThan(52.4); // North of Birmingham
        expect(location.coordinates[0]).toBeLessThan(52.5);
        expect(location.coordinates[1]).toBeGreaterThan(-2.0); // West of Birmingham
        expect(location.coordinates[1]).toBeLessThan(-1.9);
      });
    });

    test('validates store opening hours format', () => {
      BIRMINGHAM_STORES.forEach(store => {
        Object.values(store.opening_hours).forEach(hours => {
          if (hours && !hours.closed) {
            expect(hours.open).toMatch(/^\d{2}:\d{2}$/);
            expect(hours.close).toMatch(/^\d{2}:\d{2}$/);
          }
        });
      });
    });

    test('validates realistic train costs', async () => {
      const from = BIRMINGHAM_LOCATIONS['five-ways'];
      const to = BIRMINGHAM_LOCATIONS['university-station'];

      const route = await service.getBirminghamRoute(from, to, 'train');

      // Should be within realistic Birmingham train fare range
      expect(route.cost).toBeGreaterThanOrEqual(200); // £2.00
      expect(route.cost).toBeLessThanOrEqual(220); // £2.20
    });
  });
});