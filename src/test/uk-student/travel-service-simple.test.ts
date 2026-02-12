import { describe, test, expect } from 'vitest';
import { TravelService } from '../../lib/uk-student/travel-service';

describe('TravelService Basic Tests', () => {
  test('should create TravelService instance', () => {
    const service = new TravelService();
    expect(service).toBeDefined();
  });

  test('should return daily travel cost', async () => {
    const service = new TravelService();
    const cost = await service.getDailyTravelCost('test-user', new Date());
    expect(typeof cost).toBe('number');
    expect(cost).toBeGreaterThanOrEqual(0);
  });
});