// UK Student Inventory Management Service
// Handles fridge, pantry, and freezer inventory tracking

import { supabase } from '../supabase/client';
import type {
  InventoryItem,
  InventoryStatus,
  APIResponse,
  Alert
} from '../../types/uk-student';

export interface InventoryUpdateRequest {
  item_name: string;
  quantity: number;
  unit: string;
  location: 'fridge' | 'pantry' | 'freezer';
  category?: string;
  expiry_date?: Date;
  purchase_date?: Date;
  store?: string;
  cost?: number;
}

export interface ExpiryAlert {
  item: InventoryItem;
  days_until_expiry: number;
  urgency: 'low' | 'medium' | 'high';
}

export class InventoryService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get all inventory items for the user
   */
  async getAllInventory(): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw new Error('Failed to fetch inventory');
    }
  }

  /**
   * Get inventory by location (fridge, pantry, freezer)
   */
  async getInventoryByLocation(location: 'fridge' | 'pantry' | 'freezer'): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', this.userId)
        .eq('location', location)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${location} inventory:`, error);
      throw new Error(`Failed to fetch ${location} inventory`);
    }
  }

  /**
   * Add new inventory item
   */
  async addInventoryItem(item: InventoryUpdateRequest): Promise<InventoryItem> {
    try {
      const { data, error } = await supabase
        .from('uk_student_inventory')
        .insert({
          user_id: this.userId,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          category: item.category || this.categorizeItem(item.item_name),
          expiry_date: item.expiry_date?.toISOString().split('T')[0],
          purchase_date: item.purchase_date?.toISOString().split('T')[0],
          store: item.store,
          cost: item.cost
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw new Error('Failed to add inventory item');
    }
  }

  /**
   * Update existing inventory item
   */
  async updateInventoryItem(id: string, updates: Partial<InventoryUpdateRequest>): Promise<InventoryItem> {
    try {
      const updateData: any = { ...updates };
      
      // Convert dates to ISO strings if provided
      if (updates.expiry_date) {
        updateData.expiry_date = updates.expiry_date.toISOString().split('T')[0];
      }
      if (updates.purchase_date) {
        updateData.purchase_date = updates.purchase_date.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('uk_student_inventory')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', this.userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw new Error('Failed to update inventory item');
    }
  }

  /**
   * Remove inventory item or reduce quantity
   */
  async consumeInventoryItem(id: string, quantityUsed: number): Promise<InventoryItem | null> {
    try {
      // First get the current item
      const { data: currentItem, error: fetchError } = await supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('id', id)
        .eq('user_id', this.userId)
        .single();

      if (fetchError) throw fetchError;

      const newQuantity = currentItem.quantity - quantityUsed;

      if (newQuantity <= 0) {
        // Remove item if quantity reaches zero or below
        const { error: deleteError } = await supabase
          .from('uk_student_inventory')
          .delete()
          .eq('id', id)
          .eq('user_id', this.userId);

        if (deleteError) throw deleteError;
        return null;
      } else {
        // Update quantity
        const { data, error } = await supabase
          .from('uk_student_inventory')
          .update({ quantity: newQuantity })
          .eq('id', id)
          .eq('user_id', this.userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error consuming inventory item:', error);
      throw new Error('Failed to consume inventory item');
    }
  }

  /**
   * Delete inventory item completely
   */
  async deleteInventoryItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('uk_student_inventory')
        .delete()
        .eq('id', id)
        .eq('user_id', this.userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw new Error('Failed to delete inventory item');
    }
  }

  /**
   * Get inventory status with alerts and summaries
   */
  async getInventoryStatus(): Promise<InventoryStatus> {
    try {
      const inventory = await this.getAllInventory();
      const now = new Date();
      
      // Items expiring within 3 days
      const expiringSoon = inventory.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
      });

      // Items with low stock (quantity <= 1)
      const lowStock = inventory.filter(item => item.quantity <= 1);

      // Category breakdown
      const categories: Record<string, number> = {};
      inventory.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
      });

      return {
        total_items: inventory.length,
        expiring_soon: expiringSoon,
        low_stock: lowStock,
        categories
      };
    } catch (error) {
      console.error('Error getting inventory status:', error);
      throw new Error('Failed to get inventory status');
    }
  }

  /**
   * Get expiry alerts with urgency levels
   */
  async getExpiryAlerts(): Promise<ExpiryAlert[]> {
    try {
      const inventory = await this.getAllInventory();
      const now = new Date();
      const alerts: ExpiryAlert[] = [];

      inventory.forEach(item => {
        if (!item.expiry_date) return;
        
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
          let urgency: 'low' | 'medium' | 'high' = 'low';
          
          if (daysUntilExpiry <= 1) urgency = 'high';
          else if (daysUntilExpiry <= 3) urgency = 'medium';
          
          alerts.push({
            item,
            days_until_expiry: daysUntilExpiry,
            urgency
          });
        }
      });

      return alerts.sort((a, b) => a.days_until_expiry - b.days_until_expiry);
    } catch (error) {
      console.error('Error getting expiry alerts:', error);
      return [];
    }
  }

  /**
   * Search inventory by name or category
   */
  async searchInventory(query: string): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', this.userId)
        .or(`item_name.ilike.%${query}%,category.ilike.%${query}%`)
        .gt('quantity', 0)
        .order('item_name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching inventory:', error);
      return [];
    }
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(category: string): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', this.userId)
        .eq('category', category)
        .gt('quantity', 0)
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${category} items:`, error);
      return [];
    }
  }

  /**
   * Bulk update inventory (useful for shopping list integration)
   */
  async bulkUpdateInventory(items: InventoryUpdateRequest[]): Promise<InventoryItem[]> {
    try {
      const results: InventoryItem[] = [];
      
      for (const item of items) {
        // Check if item already exists
        const { data: existing } = await supabase
          .from('uk_student_inventory')
          .select('*')
          .eq('user_id', this.userId)
          .eq('item_name', item.item_name)
          .eq('location', item.location)
          .single();

        if (existing) {
          // Update existing item quantity
          const updated = await this.updateInventoryItem(existing.id, {
            quantity: existing.quantity + item.quantity,
            purchase_date: item.purchase_date,
            store: item.store,
            cost: item.cost
          });
          results.push(updated);
        } else {
          // Add new item
          const newItem = await this.addInventoryItem(item);
          results.push(newItem);
        }
      }

      return results;
    } catch (error) {
      console.error('Error bulk updating inventory:', error);
      throw new Error('Failed to bulk update inventory');
    }
  }

  /**
   * Get available ingredients for recipe suggestions
   */
  async getAvailableIngredients(): Promise<string[]> {
    try {
      const inventory = await this.getAllInventory();
      return inventory
        .filter(item => item.quantity > 0)
        .map(item => item.item_name);
    } catch (error) {
      console.error('Error getting available ingredients:', error);
      return [];
    }
  }

  /**
   * Calculate total inventory value
   */
  async calculateInventoryValue(): Promise<number> {
    try {
      const inventory = await this.getAllInventory();
      return inventory.reduce((total, item) => {
        return total + ((item.cost || 0) * item.quantity);
      }, 0);
    } catch (error) {
      console.error('Error calculating inventory value:', error);
      return 0;
    }
  }

  // Private helper methods

  private categorizeItem(itemName: string): string {
    const name = itemName.toLowerCase();
    
    if (['chicken', 'beef', 'pork', 'fish', 'lamb', 'turkey'].some(meat => name.includes(meat))) {
      return 'meat';
    }
    if (['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'].some(dairy => name.includes(dairy))) {
      return 'dairy';
    }
    if (['rice', 'pasta', 'bread', 'flour', 'oats', 'cereal'].some(grain => name.includes(grain))) {
      return 'grains';
    }
    if (['tomato', 'onion', 'carrot', 'potato', 'pepper', 'lettuce', 'spinach'].some(veg => name.includes(veg))) {
      return 'vegetables';
    }
    if (['apple', 'banana', 'orange', 'berry', 'grape', 'lemon'].some(fruit => name.includes(fruit))) {
      return 'fruits';
    }
    if (['salt', 'pepper', 'garlic', 'herb', 'spice', 'oil', 'vinegar'].some(spice => name.includes(spice))) {
      return 'condiments';
    }
    if (['juice', 'soda', 'water', 'tea', 'coffee'].some(drink => name.includes(drink))) {
      return 'beverages';
    }
    
    return 'other';
  }
}