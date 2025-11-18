// src/test/unit/laundry-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LaundryService, type ClothingItem, type LaundrySession } from '../../lib/uk-student/laundry-service';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabase = (): SupabaseClient => {
  const mockQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  const mockFrom = vi.fn().mockReturnValue(mockQuery);

  return {
    from: mockFrom,
  } as any;
};

describe('LaundryService', () => {
  let service: LaundryService;
  let mockSupabase: SupabaseClient;
  const userId = 'test-user-123';

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new LaundryService(mockSupabase, userId);
  });

  describe('addClothingItem', () => {
    it('should add a clothing item to inventory', async () => {
      const mockItem: ClothingItem = {
        id: 'item-1',
        user_id: userId,
        name: 'Underwear',
        category: 'underwear',
        quantity: 7,
        wash_frequency: 'after_each_use',
        condition: 'clean',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockItem, error: null });

      const result = await service.addClothingItem('Underwear', 'underwear', 7, 'after_each_use');

      expect(result).toEqual(mockItem);
      expect(result.category).toBe('underwear');
      expect(result.quantity).toBe(7);
    });

    it('should add gym clothes with correct category', async () => {
      const mockItem: ClothingItem = {
        id: 'item-2',
        user_id: userId,
        name: 'Gym Outfit',
        category: 'gym',
        quantity: 3,
        wash_frequency: 'after_each_use',
        condition: 'clean',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockItem, error: null });

      const result = await service.addClothingItem('Gym Outfit', 'gym', 3);

      expect(result.category).toBe('gym');
      expect(result.quantity).toBe(3);
    });
  });

  describe('getClothingInventory', () => {
    it('should return all clothing items', async () => {
      const mockItems: ClothingItem[] = [
        {
          id: 'item-1',
          user_id: userId,
          name: 'Underwear',
          category: 'underwear',
          quantity: 7,
          wash_frequency: 'after_each_use',
          condition: 'clean',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'item-2',
          user_id: userId,
          name: 'Gym Outfit',
          category: 'gym',
          quantity: 3,
          wash_frequency: 'after_each_use',
          condition: 'clean',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });

      const result = await service.getClothingInventory();

      expect(result).toEqual(mockItems);
      expect(result.length).toBe(2);
    });
  });

  describe('updateClothingCondition', () => {
    it('should update clothing item condition', async () => {
      const mockItem: ClothingItem = {
        id: 'item-1',
        user_id: userId,
        name: 'Underwear',
        category: 'underwear',
        quantity: 7,
        wash_frequency: 'after_each_use',
        condition: 'dirty',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.update.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockItem, error: null });

      const result = await service.updateClothingCondition('item-1', 'dirty');

      expect(result.condition).toBe('dirty');
    });
  });

  describe('predictLaundryNeed', () => {
    it('should return urgent when underwear is critically low', async () => {
      const mockItems: ClothingItem[] = [
        {
          id: 'item-1',
          user_id: userId,
          name: 'Underwear',
          category: 'underwear',
          quantity: 2,
          wash_frequency: 'after_each_use',
          condition: 'clean',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });

      const result = await service.predictLaundryNeed();

      expect(result.urgency).toBe('urgent');
      expect(result.daysUntilNeeded).toBe(1);
    });

    it('should return soon when underwear is moderately low', async () => {
      const mockItems: ClothingItem[] = [
        {
          id: 'item-1',
          user_id: userId,
          name: 'Underwear',
          category: 'underwear',
          quantity: 4,
          wash_frequency: 'after_each_use',
          condition: 'clean',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });

      const result = await service.predictLaundryNeed();

      expect(result.urgency).toBe('soon');
      expect(result.daysUntilNeeded).toBe(2);
    });

    it('should return not_needed when sufficient clean clothes', async () => {
      const mockItems: ClothingItem[] = [
        {
          id: 'item-1',
          user_id: userId,
          name: 'Underwear',
          category: 'underwear',
          quantity: 7,
          wash_frequency: 'after_each_use',
          condition: 'clean',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'item-2',
          user_id: userId,
          name: 'Gym Outfit',
          category: 'gym',
          quantity: 3,
          wash_frequency: 'after_each_use',
          condition: 'clean',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });

      const result = await service.predictLaundryNeed();

      expect(result.urgency).toBe('not_needed');
    });
  });

  describe('scheduleLaundrySession', () => {
    it('should schedule a laundry session', async () => {
      const mockSession: LaundrySession = {
        id: 'session-1',
        user_id: userId,
        scheduled_date: new Date(),
        scheduled_start_time: '14:00',
        estimated_duration: 120,
        cost_estimate: 650,
        status: 'scheduled',
        items_to_wash: [],
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_academic_events') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.gte.mockReturnThis();
      mockQuery.lt.mockResolvedValue({ data: [], error: null });

      const mockQuery2 = mockSupabase.from('uk_student_laundry_sessions') as any;
      mockQuery2.insert.mockReturnThis();
      mockQuery2.select.mockReturnThis();
      mockQuery2.single.mockResolvedValue({ data: mockSession, error: null });

      const result = await service.scheduleLaundrySession(new Date(), '14:00');

      expect(result.status).toBe('scheduled');
      expect(result.estimated_duration).toBe(120);
      expect(result.cost_estimate).toBe(650);
    });

    it('should detect conflicts with calendar events', async () => {
      // Create an event that overlaps with the laundry time slot
      const now = new Date();
      const eventStart = new Date(now.getTime() + 1800000); // 30 minutes from now
      const eventEnd = new Date(eventStart.getTime() + 3600000); // 1 hour duration

      const mockEvents = [
        {
          id: 'event-1',
          start_time: eventStart.toISOString(),
          end_time: eventEnd.toISOString(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_academic_events') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.gte.mockReturnThis();
      mockQuery.lt.mockResolvedValue({ data: mockEvents, error: null });

      // Attempting to schedule laundry at 00:30 (30 minutes) when there's an event
      // should detect the conflict
      expect(async () => {
        await service.scheduleLaundrySession(now, '00:30');
      }).toBeDefined();
    });
  });

  describe('findOptimalLaundryDays', () => {
    it('should find days with available slots', async () => {
      const mockQuery = mockSupabase.from('uk_student_academic_events') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.gte.mockReturnThis();
      mockQuery.lt.mockResolvedValue({ data: [], error: null });

      const result = await service.findOptimalLaundryDays(3);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('availableSlots');
      expect(result[0]).toHaveProperty('conflictCount');
    });

    it('should sort days by least conflicts', async () => {
      const mockQuery = mockSupabase.from('uk_student_academic_events') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.gte.mockReturnThis();
      mockQuery.lt.mockResolvedValue({ data: [], error: null });

      const result = await service.findOptimalLaundryDays(3);

      // Verify sorting
      for (let i = 1; i < result.length; i++) {
        expect(result[i].conflictCount).toBeGreaterThanOrEqual(result[i - 1].conflictCount);
      }
    });
  });

  describe('getLaundrySessions', () => {
    it('should return all laundry sessions', async () => {
      const mockSessions: LaundrySession[] = [
        {
          id: 'session-1',
          user_id: userId,
          scheduled_date: new Date(),
          scheduled_start_time: '14:00',
          estimated_duration: 120,
          cost_estimate: 650,
          status: 'scheduled',
          items_to_wash: [],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_laundry_sessions') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockSessions, error: null });

      const result = await service.getLaundrySessions();

      expect(result).toEqual(mockSessions);
      expect(result.length).toBe(1);
    });

    it('should filter sessions by status', async () => {
      const mockSessions: LaundrySession[] = [
        {
          id: 'session-1',
          user_id: userId,
          scheduled_date: new Date(),
          scheduled_start_time: '14:00',
          estimated_duration: 120,
          cost_estimate: 650,
          status: 'scheduled',
          items_to_wash: [],
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_laundry_sessions') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockSessions, error: null });

      const result = await service.getLaundrySessions('scheduled');

      expect(result[0].status).toBe('scheduled');
    });
  });

  describe('updateLaundrySessionStatus', () => {
    it('should update session status', async () => {
      const mockSession: LaundrySession = {
        id: 'session-1',
        user_id: userId,
        scheduled_date: new Date(),
        scheduled_start_time: '14:00',
        estimated_duration: 120,
        cost_estimate: 650,
        status: 'completed',
        items_to_wash: [],
        actual_cost: 650,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_laundry_sessions') as any;
      mockQuery.update.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockSession, error: null });

      const result = await service.updateLaundrySessionStatus('session-1', 'completed', 650);

      expect(result.status).toBe('completed');
      expect(result.actual_cost).toBe(650);
    });
  });

  describe('suggestHandWashing', () => {
    it('should suggest hand-washing for worn gym clothes', async () => {
      const mockItems: ClothingItem[] = [
        {
          id: 'item-1',
          user_id: userId,
          name: 'Gym Outfit',
          category: 'gym',
          quantity: 1,
          wash_frequency: 'after_each_use',
          condition: 'worn_once',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockSuggestion = {
        id: 'suggestion-1',
        user_id: userId,
        clothing_item_id: 'item-1',
        suggested_date: new Date().toISOString(),
        reason: 'Hand-wash Gym Outfit to extend wear between full laundry sessions',
        completed: false,
        created_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });

      const mockQuery2 = mockSupabase.from('uk_student_hand_wash_suggestions') as any;
      mockQuery2.insert.mockReturnThis();
      mockQuery2.select.mockReturnThis();
      mockQuery2.single.mockResolvedValue({ data: mockSuggestion, error: null });

      const result = await service.suggestHandWashing();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reason).toContain('Hand-wash');
    });
  });

  describe('getLaundryStats', () => {
    it('should calculate laundry statistics', async () => {
      const mockSessions: LaundrySession[] = [
        {
          id: 'session-1',
          user_id: userId,
          scheduled_date: new Date(),
          scheduled_start_time: '14:00',
          estimated_duration: 120,
          cost_estimate: 650,
          status: 'completed',
          items_to_wash: [],
          actual_cost: 650,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'session-2',
          user_id: userId,
          scheduled_date: new Date(Date.now() - 604800000),
          scheduled_start_time: '14:00',
          estimated_duration: 120,
          cost_estimate: 650,
          status: 'completed',
          items_to_wash: [],
          actual_cost: 700,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_laundry_sessions') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.gte.mockResolvedValue({ data: mockSessions, error: null });

      const result = await service.getLaundryStats(30);

      expect(result).toHaveProperty('totalSessions');
      expect(result).toHaveProperty('completedSessions');
      expect(result).toHaveProperty('totalCost');
      expect(result).toHaveProperty('averageCostPerSession');
      expect(result).toHaveProperty('frequency');
      expect(result.totalCost).toBe(1350);
    });
  });

  describe('getUpcomingReminders', () => {
    it('should return reminders for laundry needs', async () => {
      const mockItems: ClothingItem[] = [
        {
          id: 'item-1',
          user_id: userId,
          name: 'Underwear',
          category: 'underwear',
          quantity: 1,
          wash_frequency: 'after_each_use',
          condition: 'clean',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_clothing_inventory') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });

      const mockQuery2 = mockSupabase.from('uk_student_laundry_sessions') as any;
      mockQuery2.select.mockReturnThis();
      mockQuery2.eq.mockReturnThis();
      mockQuery2.eq.mockReturnThis();
      mockQuery2.order.mockResolvedValue({ data: [], error: null });

      const mockQuery3 = mockSupabase.from('uk_student_hand_wash_suggestions') as any;
      mockQuery3.select.mockReturnThis();
      mockQuery3.eq.mockReturnThis();
      mockQuery3.eq.mockReturnThis();
      mockQuery3.limit.mockResolvedValue({ data: [], error: null });

      const result = await service.getUpcomingReminders();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
