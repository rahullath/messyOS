// Integration tests for UK Location API endpoints
import { describe, test, expect, vi } from 'vitest';

// Mock environment variables
vi.mock('astro:env', () => ({
  GOOGLE_MAPS_API_KEY: 'test-google-key',
  OPENWEATHER_API_KEY: 'test-weather-key'
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('UK Location API Endpoints', () => {
  describe('Route API', () => {
    test('validates required parameters', async () => {
      const { POST } = await import('../../pages/api/uk-student/location/route');
      
      const mockRequest = {
        json: () => Promise.resolve({})
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameters');
    });

    test('validates method parameter', async () => {
      const { POST } = await import('../../pages/api/uk-student/location/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          from: 'five-ways',
          to: 'university',
          method: 'invalid-method'
        })
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid method');
    });

    test('handles unknown locations', async () => {
      const { POST } = await import('../../pages/api/uk-student/location/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          from: 'unknown-location',
          to: 'university',
          method: 'bike'
        })
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unknown from location');
    });

    test('calculates route successfully', async () => {
      const { POST } = await import('../../pages/api/uk-student/location/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          from: 'five-ways',
          to: 'university',
          method: 'bike'
        })
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('distance');
      expect(data.data).toHaveProperty('duration');
      expect(data.data).toHaveProperty('from');
      expect(data.data).toHaveProperty('to');
      expect(data.data.method).toBe('bike');
    });
  });

  describe('Weather API', () => {
    test('validates required location parameter', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/weather');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/weather');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameter: location');
    });

    test('validates days parameter', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/weather');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/weather?location=university&days=20');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid days parameter');
    });

    test('handles unknown location', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/weather');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/weather?location=unknown-place');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unknown location');
    });

    test('returns weather forecast successfully', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/weather');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/weather?location=university&days=5');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('location');
      expect(data.data).toHaveProperty('forecast');
      expect(data.data.days).toBe(5);
      expect(Array.isArray(data.data.forecast)).toBe(true);
    });
  });

  describe('Stores API', () => {
    test('validates required location parameter', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/stores');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/stores');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameter: location');
    });

    test('validates radius parameter', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/stores');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/stores?location=university&radius=50000');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid radius parameter');
    });

    test('returns nearby stores successfully', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/stores');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/stores?location=selly-oak&radius=2000');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('location');
      expect(data.data).toHaveProperty('stores');
      expect(data.data.radius).toBe(2000);
      expect(Array.isArray(data.data.stores)).toBe(true);
      expect(data.data.count).toBeGreaterThan(0);
    });

    test('includes travel time estimates', async () => {
      const { GET } = await import('../../pages/api/uk-student/location/stores');
      
      const mockUrl = new URL('http://localhost/api/uk-student/location/stores?location=selly-oak');
      const response = await GET({ url: mockUrl.toString() } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.stores.length).toBeGreaterThan(0);
      
      data.data.stores.forEach((store: any) => {
        expect(store).toHaveProperty('walkingTime');
        expect(store).toHaveProperty('cyclingTime');
        expect(typeof store.walkingTime).toBe('number');
        expect(typeof store.cyclingTime).toBe('number');
      });
    });
  });

  describe('Recommendations API', () => {
    test('validates required parameters', async () => {
      const { POST } = await import('../../pages/api/uk-student/location/recommendations');
      
      const mockRequest = {
        json: () => Promise.resolve({})
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required parameters');
    });

    test('returns route recommendations successfully', async () => {
      const { POST } = await import('../../pages/api/uk-student/location/recommendations');
      
      const mockRequest = {
        json: () => Promise.resolve({
          from: 'five-ways',
          to: 'university',
          preferences: {
            weatherSensitive: true,
            costSensitive: false,
            timeSensitive: true
          }
        })
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('from');
      expect(data.data).toHaveProperty('to');
      expect(data.data).toHaveProperty('preferences');
      expect(data.data).toHaveProperty('routes');
      expect(Array.isArray(data.data.routes)).toBe(true);
      expect(data.data.routes.length).toBeGreaterThan(0);
    });

    test('includes recommendation reasons', async () => {
      const { POST } = await import('../../pages/api/uk-student/location/recommendations');
      
      const mockRequest = {
        json: () => Promise.resolve({
          from: 'five-ways',
          to: 'university',
          preferences: {
            weatherSensitive: true,
            costSensitive: true
          }
        })
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      data.data.routes.forEach((route: any) => {
        expect(route).toHaveProperty('reasons');
        expect(route).toHaveProperty('costFormatted');
        expect(Array.isArray(route.reasons)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('handles service errors gracefully', async () => {
      // Mock a service that throws an error
      vi.doMock('../../../../lib/uk-student/location-service', () => ({
        UKLocationService: class {
          constructor() {}
          async getBirminghamRoute() {
            throw new Error('Service unavailable');
          }
        },
        BIRMINGHAM_LOCATIONS: {
          'five-ways': { name: 'Five Ways', coordinates: [52.4751, -1.9180], type: 'transport' }
        }
      }));

      const { POST } = await import('../../pages/api/uk-student/location/route');
      
      const mockRequest = {
        json: () => Promise.resolve({
          from: 'five-ways',
          to: 'university',
          method: 'bike'
        })
      };

      const response = await POST({ request: mockRequest as any } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });
  });
});