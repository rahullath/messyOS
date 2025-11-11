// UK Student Shopping List Optimization Service
// Optimizes shopping lists based on store locations, prices, and travel time

import type {
  ShoppingItem,
  Store,
  OptimizedShoppingList,
  StoreRecommendation,
  Location
} from '../../types/uk-student';
import { UKLocationService } from './location-service';

export interface ShoppingConstraints {
  maxBudget?: number;
  maxTravelTime?: number;
  preferredStores?: string[];
  prioritizePrice?: boolean;
  prioritizeTime?: boolean;
}

export interface StoreInventory {
  store: Store;
  availableItems: string[];
  priceMultiplier: number;
  stockLevels: Record<string, 'high' | 'medium' | 'low'>;
}

export class ShoppingOptimizer {
  private locationService: UKLocationService;
  private storeInventories: Map<string, StoreInventory> = new Map();

  constructor(locationService: UKLocationService) {
    this.locationService = locationService;
    this.initializeStoreData();
  }

  /**
   * Optimize shopping list across multiple stores
   */
  async optimizeShoppingList(
    items: ShoppingItem[],
    stores: Store[],
    constraints: ShoppingConstraints = {}
  ): Promise<OptimizedShoppingList> {
    try {
      // Categorize items for efficient shopping
      const categorizedItems = this.categorizeItems(items);
      
      // Calculate store recommendations
      const storeRecommendations = await this.calculateOptimalStores(
        categorizedItems,
        stores,
        constraints
      );

      // Apply constraints and filters
      const filteredRecommendations = this.applyConstraints(
        storeRecommendations,
        constraints
      );

      // Calculate totals
      const totalCost = filteredRecommendations.reduce((sum, store) => sum + store.subtotal, 0);
      const totalTime = this.calculateTotalTime(filteredRecommendations);

      return {
        items: categorizedItems,
        stores: filteredRecommendations,
        total_estimated_cost: totalCost,
        estimated_time: totalTime
      };
    } catch (error) {
      console.error('Error optimizing shopping list:', error);
      throw new Error('Failed to optimize shopping list');
    }
  }

  /**
   * Find the most cost-effective store combination
   */
  async findCheapestCombination(
    items: ShoppingItem[],
    stores: Store[]
  ): Promise<StoreRecommendation[]> {
    const combinations = this.generateStoreCombinations(stores, 3); // Max 3 stores
    let bestCombination: StoreRecommendation[] = [];
    let lowestCost = Infinity;

    for (const combination of combinations) {
      const recommendations = await this.calculateStoreRecommendations(
        items,
        combination
      );
      
      const totalCost = recommendations.reduce((sum, rec) => sum + rec.subtotal, 0);
      
      if (totalCost < lowestCost) {
        lowestCost = totalCost;
        bestCombination = recommendations;
      }
    }

    return bestCombination;
  }

  /**
   * Find the fastest shopping route
   */
  async findFastestRoute(
    items: ShoppingItem[],
    stores: Store[],
    startLocation: Location
  ): Promise<StoreRecommendation[]> {
    // Group items by store availability
    const storeItems = this.distributeItemsToStores(items, stores);
    
    // Calculate travel times between stores
    const travelMatrix = await this.calculateTravelMatrix(stores, startLocation);
    
    // Find optimal route using nearest neighbor algorithm
    const optimalRoute = this.findOptimalRoute(storeItems, travelMatrix);
    
    return optimalRoute;
  }

  /**
   * Get store-specific recommendations
   */
  async getStoreRecommendations(
    store: Store,
    items: ShoppingItem[]
  ): Promise<{
    availableItems: ShoppingItem[];
    unavailableItems: ShoppingItem[];
    estimatedCost: number;
    estimatedTime: number;
    alternatives: { item: string; alternative: string; store: string }[];
  }> {
    const storeInventory = this.storeInventories.get(store.name.toLowerCase());
    
    const availableItems: ShoppingItem[] = [];
    const unavailableItems: ShoppingItem[] = [];
    const alternatives: { item: string; alternative: string; store: string }[] = [];

    items.forEach(item => {
      if (storeInventory?.availableItems.includes(item.name.toLowerCase())) {
        availableItems.push(item);
      } else {
        unavailableItems.push(item);
        // Find alternatives at other stores
        const alternative = this.findAlternativeStores(item, [store]);
        if (alternative) {
          alternatives.push(alternative);
        }
      }
    });

    const estimatedCost = this.calculateStoreCost(availableItems, store);
    const estimatedTime = this.estimateShoppingTime(availableItems, store);

    return {
      availableItems,
      unavailableItems,
      estimatedCost,
      estimatedTime,
      alternatives
    };
  }

  // Private helper methods

  private categorizeItems(items: ShoppingItem[]): ShoppingItem[] {
    return items.map(item => ({
      ...item,
      category: item.category || this.categorizeItem(item.name)
    }));
  }

  private categorizeItem(itemName: string): string {
    const name = itemName.toLowerCase();
    
    const categories = {
      'meat': ['chicken', 'beef', 'pork', 'fish', 'lamb', 'turkey'],
      'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs'],
      'produce': ['tomato', 'onion', 'carrot', 'potato', 'apple', 'banana'],
      'pantry': ['rice', 'pasta', 'flour', 'oil', 'salt', 'sugar'],
      'frozen': ['frozen', 'ice cream', 'frozen peas'],
      'bakery': ['bread', 'rolls', 'cake', 'pastry'],
      'beverages': ['juice', 'soda', 'water', 'tea', 'coffee']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  private async calculateOptimalStores(
    items: ShoppingItem[],
    stores: Store[],
    constraints: ShoppingConstraints
  ): Promise<StoreRecommendation[]> {
    const recommendations: StoreRecommendation[] = [];

    for (const store of stores) {
      const storeItems = this.getItemsAvailableAtStore(items, store);
      if (storeItems.length === 0) continue;

      const subtotal = this.calculateStoreCost(storeItems, store);
      const travelTime = await this.estimateTravelTime(store);
      const priorityScore = this.calculatePriorityScore(
        store,
        storeItems,
        constraints
      );

      recommendations.push({
        store,
        items: storeItems,
        subtotal,
        travel_time: travelTime,
        priority_score: priorityScore
      });
    }

    return recommendations.sort((a, b) => b.priority_score - a.priority_score);
  }

  private getItemsAvailableAtStore(items: ShoppingItem[], store: Store): ShoppingItem[] {
    const storeInventory = this.storeInventories.get(store.name.toLowerCase());
    if (!storeInventory) return items; // Assume all items available if no data

    return items.filter(item => 
      storeInventory.availableItems.includes(item.name.toLowerCase()) ||
      storeInventory.availableItems.some(available => 
        item.name.toLowerCase().includes(available) || 
        available.includes(item.name.toLowerCase())
      )
    );
  }

  private calculateStoreCost(items: ShoppingItem[], store: Store): number {
    const storeInventory = this.storeInventories.get(store.name.toLowerCase());
    const priceMultiplier = storeInventory?.priceMultiplier || this.getStorePriceMultiplier(store);

    return items.reduce((total, item) => {
      const baseCost = item.estimated_cost || this.estimateItemCost(item);
      return total + (baseCost * priceMultiplier);
    }, 0);
  }

  private getStorePriceMultiplier(store: Store): number {
    const multipliers: Record<string, number> = {
      'aldi': 0.85,
      'lidl': 0.87,
      'tesco': 1.0,
      'sainsburys': 1.05,
      'waitrose': 1.25,
      'marks & spencer': 1.3,
      'premier': 1.15,
      'university-superstore': 1.1
    };

    return multipliers[store.name.toLowerCase()] || 1.0;
  }

  private estimateItemCost(item: ShoppingItem): number {
    const baseCosts: Record<string, number> = {
      'meat': 8.00,
      'dairy': 2.50,
      'produce': 2.00,
      'pantry': 1.50,
      'frozen': 3.00,
      'bakery': 1.20,
      'beverages': 2.00,
      'other': 2.50
    };

    const basePrice = baseCosts[item.category] || baseCosts['other'];
    return basePrice * Math.max(1, item.quantity / 2);
  }

  private async estimateTravelTime(store: Store): Promise<number> {
    // Simplified travel time estimation
    // In production, this would use the location service
    const travelTimes: Record<string, number> = {
      'aldi': 15,
      'tesco': 20,
      'sainsburys': 25,
      'premier': 10,
      'university-superstore': 5,
      'lidl': 18,
      'waitrose': 30
    };

    return travelTimes[store.name.toLowerCase()] || 20;
  }

  private calculatePriorityScore(
    store: Store,
    items: ShoppingItem[],
    constraints: ShoppingConstraints
  ): number {
    let score = 0;

    // Price factor
    if (constraints.prioritizePrice) {
      const priceMultiplier = this.getStorePriceMultiplier(store);
      score += (2.0 - priceMultiplier) * 50; // Lower prices = higher score
    }

    // Time factor
    if (constraints.prioritizeTime) {
      // Prefer stores with shorter travel times
      score += Math.max(0, 30 - (store.coordinates ? 15 : 25)); // Simplified
    }

    // Store preference
    if (constraints.preferredStores?.includes(store.name.toLowerCase())) {
      score += 25;
    }

    // Item availability
    score += items.length * 2;

    // Store rating
    score += (store.user_rating || 3) * 5;

    return Math.round(score);
  }

  private applyConstraints(
    recommendations: StoreRecommendation[],
    constraints: ShoppingConstraints
  ): StoreRecommendation[] {
    let filtered = recommendations;

    // Budget constraint
    if (constraints.maxBudget) {
      let runningTotal = 0;
      filtered = filtered.filter(rec => {
        if (runningTotal + rec.subtotal <= constraints.maxBudget!) {
          runningTotal += rec.subtotal;
          return true;
        }
        return false;
      });
    }

    // Travel time constraint
    if (constraints.maxTravelTime) {
      filtered = filtered.filter(rec => rec.travel_time <= constraints.maxTravelTime!);
    }

    return filtered;
  }

  private calculateTotalTime(recommendations: StoreRecommendation[]): number {
    const travelTime = recommendations.reduce((sum, rec) => sum + rec.travel_time, 0);
    const shoppingTime = recommendations.length * 20; // 20 minutes per store
    return travelTime + shoppingTime;
  }

  private generateStoreCombinations(stores: Store[], maxStores: number): Store[][] {
    const combinations: Store[][] = [];
    
    // Generate all possible combinations up to maxStores
    for (let i = 1; i <= Math.min(maxStores, stores.length); i++) {
      const combos = this.getCombinations(stores, i);
      combinations.push(...combos);
    }

    return combinations;
  }

  private getCombinations<T>(array: T[], size: number): T[][] {
    if (size === 1) return array.map(item => [item]);
    
    const combinations: T[][] = [];
    for (let i = 0; i <= array.length - size; i++) {
      const head = array[i];
      const tailCombos = this.getCombinations(array.slice(i + 1), size - 1);
      tailCombos.forEach(combo => combinations.push([head, ...combo]));
    }
    
    return combinations;
  }

  private async calculateStoreRecommendations(
    items: ShoppingItem[],
    stores: Store[]
  ): Promise<StoreRecommendation[]> {
    const recommendations: StoreRecommendation[] = [];

    for (const store of stores) {
      const storeItems = this.getItemsAvailableAtStore(items, store);
      if (storeItems.length === 0) continue;

      recommendations.push({
        store,
        items: storeItems,
        subtotal: this.calculateStoreCost(storeItems, store),
        travel_time: await this.estimateTravelTime(store),
        priority_score: 0
      });
    }

    return recommendations;
  }

  private distributeItemsToStores(items: ShoppingItem[], stores: Store[]): Map<Store, ShoppingItem[]> {
    const distribution = new Map<Store, ShoppingItem[]>();

    stores.forEach(store => {
      const storeItems = this.getItemsAvailableAtStore(items, store);
      if (storeItems.length > 0) {
        distribution.set(store, storeItems);
      }
    });

    return distribution;
  }

  private async calculateTravelMatrix(stores: Store[], startLocation: Location): Promise<number[][]> {
    const matrix: number[][] = [];
    const locations = [startLocation, ...stores.map(s => ({ 
      name: s.name, 
      coordinates: s.coordinates ? [s.coordinates.latitude, s.coordinates.longitude] as [number, number] : [0, 0] as [number, number],
      type: 'store' as const
    }))];

    for (let i = 0; i < locations.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < locations.length; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          // Simplified distance calculation
          matrix[i][j] = Math.random() * 20 + 5; // 5-25 minutes
        }
      }
    }

    return matrix;
  }

  private findOptimalRoute(
    storeItems: Map<Store, ShoppingItem[]>,
    travelMatrix: number[][]
  ): StoreRecommendation[] {
    // Simplified nearest neighbor algorithm
    const stores = Array.from(storeItems.keys());
    const recommendations: StoreRecommendation[] = [];

    stores.forEach((store, index) => {
      const items = storeItems.get(store) || [];
      recommendations.push({
        store,
        items,
        subtotal: this.calculateStoreCost(items, store),
        travel_time: travelMatrix[0][index + 1] || 15,
        priority_score: 0
      });
    });

    return recommendations;
  }

  private findAlternativeStores(
    item: ShoppingItem,
    excludeStores: Store[]
  ): { item: string; alternative: string; store: string } | null {
    const excludeNames = excludeStores.map(s => s.name.toLowerCase());
    
    // Simple alternative finding logic
    const alternatives = ['tesco', 'sainsburys', 'aldi'];
    const alternative = alternatives.find(alt => !excludeNames.includes(alt));
    
    if (alternative) {
      return {
        item: item.name,
        alternative: item.name,
        store: alternative
      };
    }

    return null;
  }

  private estimateShoppingTime(items: ShoppingItem[], store: Store): number {
    // Base time + time per item
    const baseTime = 10; // minutes
    const timePerItem = 1.5; // minutes per item
    
    return baseTime + (items.length * timePerItem);
  }

  private initializeStoreData(): void {
    // Initialize with Birmingham-specific store data
    const storeData: Record<string, StoreInventory> = {
      'aldi': {
        store: {} as Store,
        availableItems: ['bread', 'milk', 'eggs', 'chicken', 'vegetables', 'pasta', 'rice'],
        priceMultiplier: 0.85,
        stockLevels: {
          'bread': 'high',
          'milk': 'high',
          'eggs': 'medium',
          'chicken': 'high'
        }
      },
      'tesco': {
        store: {} as Store,
        availableItems: ['bread', 'milk', 'eggs', 'chicken', 'vegetables', 'pasta', 'rice', 'cheese', 'fish'],
        priceMultiplier: 1.0,
        stockLevels: {
          'bread': 'high',
          'milk': 'high',
          'eggs': 'high',
          'chicken': 'high'
        }
      },
      'sainsburys': {
        store: {} as Store,
        availableItems: ['bread', 'milk', 'eggs', 'chicken', 'vegetables', 'pasta', 'rice', 'cheese', 'fish', 'organic'],
        priceMultiplier: 1.05,
        stockLevels: {
          'bread': 'high',
          'milk': 'high',
          'eggs': 'high',
          'chicken': 'medium'
        }
      }
    };

    Object.entries(storeData).forEach(([name, data]) => {
      this.storeInventories.set(name, data);
    });
  }
}