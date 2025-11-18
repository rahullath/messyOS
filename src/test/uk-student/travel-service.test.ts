import { describe, test, expect, beforeEach } from 'vitest';
import { TravelService } from '../../lib/uk-student/travel-service';
import type { 
  Location, 
  WeatherData, 
  TravelPreferences, 
  TravelConditions 
} from '../../types/uk-student-travel';

describe('TravelService', () => {
  let travelService: TravelService;
  let mockLocations: { fiveWays: Location; university: Location; sellyOak: Location };
  let mockWeather: WeatherData;
  let mockPreferences: TravelPreferences;

  beforeEach(() => {
    travelService = new TravelService();
    
    mockLocations = {
      fiveWays: {
        name: 'Five Ways Station',
        coordinates: [52.4751, -1.9180],
        type: 'other',
        address: 'Five Ways Station, Birmingham B16 0SP'
      },
      university: {
        name: 'University of Birmingham',
        coordinates: [52.4508, -1.9305],
        type: 'university',
        address: 'University of Birmingham, Edgbaston, Birmingham B15 2TT'
      },
      sellyOak: {
        name: 'Selly Oak Station',
        coordinates: [52.4373, -1.9364],
        type: 'other',
        address: 'Selly Oak Station, Birmingham B29 6NA'
      }
    };

    mockWeather = {
      temperature: 15,
      condition: 'sunny',
      windSpeed: 10,
      humidity: 60,
      precipitation: 0,
      visibility: 10,
      timestamp: new Date(),
      forecast: false
    };

    mockPreferences = {
      preferredMethod: 'mixed',
      maxWalkingDistance: 1500,
      weatherThreshold: {
        minTemperature: 0,
        maxWindSpeed: 25,
        maxPrecipitation: 5
      },
      fitnessLevel: 'medium',
      budgetConstraints: {
        dailyLimit: 500, // £5.00
        weeklyLimit: 2500 // £25.00
      },
      timePreferences: {
        bufferTime: 10,
        maxTravelTime: 45
      }
    };
  });

  describe('getOptimalRoute', () => {
    test('should return a valid route between two locations', async () => {
      const conditions: TravelConditions = {
        weather: mockWeather,
        userEnergy: 4,
        timeConstraints: {
          departure: new Date(),
          arrival: new Date(Date.now() + 60 * 60 * 1000),
          flexibility: 15
        }
      };

      const route = await travelService.getOptimalRoute(
        mockLocations.fiveWays,
        mockLocations.university,
        conditions,
        mockPreferences
      );

      expect(route).toBeDefined();
      expect(route.from.name).toBe('Five Ways Station');
      expect(route.to.name).toBe('University of Birmingham');
      expect(['bike', 'train', 'walk']).toContain(route.method);
      expect(route.duration).toBeGreaterThan(0);
      expect(route.distance).toBeGreaterThan(0);
      expect(route.weatherSuitability).toBeGreaterThanOrEqual(0);
      expect(route.weatherSuitability).toBeLessThanOrEqual(1);
      expect(route.energyRequired).toBeGreaterThanOrEqual(1);
      expect(route.energyRequired).toBeLessThanOrEqual(5);
    });

    test('should consider weather conditions in route selection', async () => {
      const rainyWeather: WeatherData = {
        ...mockWeather,
        condition: 'rainy',
        precipitation: 8
      };

      const conditions: TravelConditions = {
        weather: rainyWeather,
        userEnergy: 3,
        timeConstraints: {
          departure: new Date(),
          arrival: new Date(Date.now() + 60 * 60 * 1000),
          flexibility: 15
        }
      };

      const route = await travelService.getOptimalRoute(
        mockLocations.fiveWays,
        mockLocations.university,
        conditions,
        mockPreferences
      );

      expect(route).toBeDefined();
      // In rainy weather, weather suitability should be lower for outdoor methods
      if (route.method === 'bike' || route.method === 'walk') {
        expect(route.weatherSuitability).toBeLessThan(0.5);
      }
    });

    test('should consider energy levels when recommending routes', async () => {
      const lowEnergyConditions: TravelConditions = {
        weather: mockWeather,
        userEnergy: 1, // Very low energy
        timeConstraints: {
          departure: new Date(),
          arrival: new Date(Date.now() + 60 * 60 * 1000),
          flexibility: 15
        }
      };

      const route = await travelService.getOptimalRoute(
        mockLocations.fiveWays,
        mockLocations.university,
        lowEnergyConditions,
        mockPreferences
      );

      expect(route).toBeDefined();
      // With low energy, should prefer low-energy methods
      if (route.method === 'train') {
        expect(route.energyRequired).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('generateDailyTravelPlan', () => {
    test('should generate a complete travel plan for multiple destinations', async () => {
      const destinations = [
        mockLocations.fiveWays,
        mockLocations.university,
        mockLocations.sellyOak
      ];

      const plan = await travelService.generateDailyTravelPlan(
        'test-user-id',
        destinations,
        mockPreferences,
        mockWeather
      );

      expect(plan).toBeDefined();
      expect(plan.userId).toBe('test-user-id');
      expect(plan.routes).toHaveLength(2); // 3 destinations = 2 routes
      expect(plan.totalCost).toBeGreaterThanOrEqual(0);
      expect(plan.totalTime).toBeGreaterThan(0);
      expect(plan.totalDistance).toBeGreaterThan(0);
      expect(Array.isArray(plan.recommendations)).toBe(true);
      expect(Array.isArray(plan.weatherConsiderations)).toBe(true);
    });

    test('should provide budget warnings when costs exceed limits', async () => {
      const expensivePreferences: TravelPreferences = {
        ...mockPreferences,
        budgetConstraints: {
          dailyLimit: 100, // Very low limit: £1.00
          weeklyLimit: 500
        }
      };

      const destinations = [
        mockLocations.fiveWays,
        mockLocations.university,
        mockLocations.sellyOak,
        mockLocations.fiveWays // Round trip to increase cost
      ];

      const plan = await travelService.generateDailyTravelPlan(
        'test-user-id',
        destinations,
        expensivePreferences,
        mockWeather
      );

      expect(plan).toBeDefined();
      // Should have budget-related recommendations if cost exceeds limit
      if (plan.totalCost > expensivePreferences.budgetConstraints.dailyLimit) {
        expect(plan.recommendations.some(r => r.includes('budget'))).toBe(true);
      }
    });
  });

  describe('getAlternativeRoutes', () => {
    test('should provide alternatives when train is disrupted', async () => {
      const conditions: TravelConditions = {
        weather: mockWeather,
        userEnergy: 3,
        timeConstraints: {
          departure: new Date(),
          arrival: new Date(Date.now() + 60 * 60 * 1000),
          flexibility: 15
        }
      };

      const alternatives = await travelService.getAlternativeRoutes(
        mockLocations.fiveWays,
        mockLocations.university,
        'train',
        conditions
      );

      expect(Array.isArray(alternatives)).toBe(true);
      // Should not include the disrupted method
      alternatives.forEach(route => {
        expect(route.method).not.toBe('train');
      });
    });
  });

  describe('getTrainServices', () => {
    test('should return train service information', async () => {
      const services = await travelService.getTrainServices('Five Ways', 'University');

      expect(Array.isArray(services)).toBe(true);
      if (services.length > 0) {
        const service = services[0];
        expect(service).toHaveProperty('line');
        expect(service).toHaveProperty('departure');
        expect(service).toHaveProperty('arrival');
        expect(service).toHaveProperty('cost');
        expect(service).toHaveProperty('duration');
        expect(service).toHaveProperty('cancelled');
        expect(service).toHaveProperty('delayed');
        expect(service).toHaveProperty('operator');
      }
    });
  });

  describe('trackTravelExpense', () => {
    test('should track travel expenses without errors', async () => {
      const mockRoute = {
        from: mockLocations.fiveWays,
        to: mockLocations.university,
        method: 'train' as const,
        distance: 3000,
        duration: 15,
        cost: 205,
        elevation: 0,
        difficulty: 'easy' as const,
        weatherSuitability: 0.9,
        energyRequired: 1,
        safetyRating: 5,
        alternatives: []
      };

      // Should not throw an error
      await expect(
        travelService.trackTravelExpense('test-user-id', mockRoute, 210)
      ).resolves.not.toThrow();
    });
  });

  describe('getDailyTravelCost', () => {
    test('should return daily travel cost', async () => {
      const cost = await travelService.getDailyTravelCost('test-user-id', new Date());
      
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThanOrEqual(0);
    });
  });
});