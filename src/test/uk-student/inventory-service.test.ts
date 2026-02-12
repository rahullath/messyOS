// Tests for UK Student Inventory Service
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from '../../lib/uk-student/inventory-service';
import type { InventoryItem, InventoryUpdateRequest } from '../../lib/uk-student/inventory-service';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockInventory, error: null }))
            }))
          })),
          gt: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockInventory, error: null }))
          })),
          or: vi.fn(() => ({
            gt: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockInventory, error: null }))
            }))
          })),
          order: vi.fn(() => Promise.resolve({ data: mockInventory, error: null })),
          single: vi.fn(() => Promise.resolve({ data: mockInventory[0], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockInventory[0], error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockInventory[0], error: null }))
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    }))
  }
}));

const mockInventory: InventoryItem[] = [
  {
    id: '1',
    user_id: 'test-user',
    item_name: 'eggs',
    quantity: 6,
    unit: 'pieces',
    category: 'dairy',
    location: 'fridge',
    expiry_date: new Date('2024-01-15'),
    purchase_date: new Date('2024-01-10'),
    store: 'Tesco',
    cost: 2.50,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    user_id: 'test-user',
    item_name: 'pasta',
    quantity: 500,
    unit: 'g',
    category: 'grains',
    location: 'pantry',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '3',
    user_id: 'test-user',
    item_name: 'milk',
    quantity: 1,
    unit: 'liter',
    category: 'dairy',
    location: 'fridge',
    expiry_date: new Date('2024-01-12'), // Expiring soon
    created_at: new Date(),
    updated_at: new Date()
  }
];

describe('InventoryService', () => {
  let service: InventoryService;
  const userId = 'test-user';

  beforeEach(() => {
    service = new InventoryService(userId);
    vi.clearAllMocks();
  });

  describe('getAllInventory', () => {
    it('should fetch all inventory items for user', async () => {
      const inventory = await service.getAllInventory();

      expect(inventory).toBeDefined();
      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0]).toHaveProperty('id');
      expect(inventory[0]).toHaveProperty('user_id');
      expect(inventory[0]).toHaveProperty('item_name');
    });

    it('should handle empty inventory', async () => {
      // Mock empty response
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      });

      const inventory = await service.getAllInventory();
      expect(inventory).toEqual([]);
    });
  });

  describe('getInventoryByLocation', () => {
    it('should fetch inventory items by location', async () => {
      const fridgeItems = await service.getInventoryByLocation('fridge');

      expect(fridgeItems).toBeDefined();
      expect(Array.isArray(fridgeItems)).toBe(true);
    });

    it('should handle invalid location gracefully', async () => {
      // This should be caught by TypeScript, but test runtime behavior
      const inventory = await service.getInventoryByLocation('invalid' as any);
      expect(Array.isArray(inventory)).toBe(true);
    });
  });

  describe('addInventoryItem', () => {
    it('should add new inventory item', async () => {
      const newItem: InventoryUpdateRequest = {
        item_name: 'chicken breast',
        quantity: 500,
        unit: 'g',
        location: 'fridge',
        category: 'meat',
        expiry_date: new Date('2024-01-20'),
        purchase_date: new Date(),
        store: 'Aldi',
        cost: 4.50
      };

      const addedItem = await service.addInventoryItem(newItem);

      expect(addedItem).toBeDefined();
      expect(addedItem.item_name).toBe(newItem.item_name);
      expect(addedItem.quantity).toBe(newItem.quantity);
      expect(addedItem.location).toBe(newItem.location);
    });

    it('should auto-categorize items when category not provided', async () => {
      const newItem: InventoryUpdateRequest = {
        item_name: 'chicken breast',
        quantity: 500,
        unit: 'g',
        location: 'fridge'
      };

      const addedItem = await service.addInventoryItem(newItem);
      expect(addedItem.category).toBeDefined();
    });
  });

  describe('updateInventoryItem', () => {
    it('should update existing inventory item', async () => {
      const updates = {
        quantity: 3,
        expiry_date: new Date('2024-01-18')
      };

      const updatedItem = await service.updateInventoryItem('1', updates);

      expect(updatedItem).toBeDefined();
      expect(updatedItem.id).toBe('1');
    });

    it('should handle partial updates', async () => {
      const updates = { quantity: 10 };

      const updatedItem = await service.updateInventoryItem('1', updates);
      expect(updatedItem).toBeDefined();
    });
  });

  describe('consumeInventoryItem', () => {
    it('should reduce quantity when consuming item', async () => {
      // Mock current item with quantity 6
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { ...mockInventory[0], quantity: 6 }, 
                error: null 
              }))
            }))
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { ...mockInventory[0], quantity: 4 }, 
                  error: null 
                }))
              }))
            }))
          }))
        }))
      });

      const result = await service.consumeInventoryItem('1', 2);

      expect(result).toBeDefined();
      expect(result!.quantity).toBe(4);
    });

    it('should remove item when quantity reaches zero', async () => {
      // Mock current item with quantity 2
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { ...mockInventory[0], quantity: 2 }, 
                error: null 
              }))
            }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }))
      });

      const result = await service.consumeInventoryItem('1', 2);
      expect(result).toBeNull();
    });
  });

  describe('getInventoryStatus', () => {
    it('should return comprehensive inventory status', async () => {
      const status = await service.getInventoryStatus();

      expect(status).toBeDefined();
      expect(status.total_items).toBeGreaterThan(0);
      expect(Array.isArray(status.expiring_soon)).toBe(true);
      expect(Array.isArray(status.low_stock)).toBe(true);
      expect(typeof status.categories).toBe('object');
    });

    it('should identify expiring items correctly', async () => {
      const status = await service.getInventoryStatus();
      
      // Should identify milk as expiring soon (expires 2024-01-12)
      expect(status.expiring_soon.length).toBeGreaterThan(0);
    });

    it('should identify low stock items', async () => {
      const status = await service.getInventoryStatus();
      
      // Should identify items with quantity <= 1
      const lowStockItems = status.low_stock;
      lowStockItems.forEach(item => {
        expect(item.quantity).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getExpiryAlerts', () => {
    it('should return expiry alerts with urgency levels', async () => {
      const alerts = await service.getExpiryAlerts();

      expect(Array.isArray(alerts)).toBe(true);
      
      if (alerts.length > 0) {
        const alert = alerts[0];
        expect(alert).toHaveProperty('item');
        expect(alert).toHaveProperty('days_until_expiry');
        expect(alert).toHaveProperty('urgency');
        expect(['low', 'medium', 'high']).toContain(alert.urgency);
      }
    });

    it('should sort alerts by urgency', async () => {
      const alerts = await service.getExpiryAlerts();
      
      if (alerts.length > 1) {
        for (let i = 0; i < alerts.length - 1; i++) {
          expect(alerts[i].days_until_expiry).toBeLessThanOrEqual(alerts[i + 1].days_until_expiry);
        }
      }
    });
  });

  describe('searchInventory', () => {
    it('should search inventory by item name', async () => {
      const results = await service.searchInventory('egg');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should search inventory by category', async () => {
      const results = await service.searchInventory('dairy');

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty search results', async () => {
      // Mock empty search results
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() => ({
              gt: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      });

      const results = await service.searchInventory('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('bulkUpdateInventory', () => {
    it('should handle bulk inventory updates', async () => {
      const items: InventoryUpdateRequest[] = [
        {
          item_name: 'tomatoes',
          quantity: 4,
          unit: 'pieces',
          location: 'fridge',
          category: 'vegetables'
        },
        {
          item_name: 'bread',
          quantity: 1,
          unit: 'loaf',
          location: 'pantry',
          category: 'grains'
        }
      ];

      const results = await service.bulkUpdateInventory(items);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(items.length);
    });

    it('should update existing items and add new ones', async () => {
      const items: InventoryUpdateRequest[] = [
        {
          item_name: 'eggs', // Existing item
          quantity: 6,
          unit: 'pieces',
          location: 'fridge'
        }
      ];

      const results = await service.bulkUpdateInventory(items);
      expect(results.length).toBe(1);
    });
  });

  describe('calculateInventoryValue', () => {
    it('should calculate total inventory value', async () => {
      const value = await service.calculateInventoryValue();

      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(0);
    });

    it('should handle items without cost', async () => {
      // Mock inventory with items without cost
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ 
              data: [{ ...mockInventory[0], cost: null }], 
              error: null 
            }))
          }))
        }))
      });

      const value = await service.calculateInventoryValue();
      expect(value).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const mockSupabase = vi.mocked(require('../../lib/supabase').supabase);
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Database error') }))
          }))
        }))
      });

      await expect(service.getAllInventory()).rejects.toThrow('Failed to fetch inventory');
    });

    it('should validate required fields', async () => {
      const invalidItem = {
        item_name: '', // Empty name
        quantity: -1, // Negative quantity
        unit: '',
        location: 'fridge' as const
      };

      // This should be caught by validation or database constraints
      await expect(service.addInventoryItem(invalidItem)).rejects.toThrow();
    });
  });

  describe('categorization', () => {
    it('should correctly categorize common items', () => {
      // Access private method for testing
      const categorizeItem = (service as any).categorizeItem;

      expect(categorizeItem('chicken breast')).toBe('meat');
      expect(categorizeItem('milk')).toBe('dairy');
      expect(categorizeItem('tomato')).toBe('vegetables');
      expect(categorizeItem('rice')).toBe('grains');
      expect(categorizeItem('apple')).toBe('fruits');
      expect(categorizeItem('salt')).toBe('condiments');
      expect(categorizeItem('orange juice')).toBe('beverages');
      expect(categorizeItem('unknown item')).toBe('other');
    });
  });
});