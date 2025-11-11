// UK Student Shopping List Optimizer Component
// Optimize shopping lists based on store locations, prices, and travel time

import React, { useState, useEffect } from 'react';
import type {
  ShoppingItem,
  Store,
  OptimizedShoppingList,
  StoreRecommendation,
  ShoppingConstraints
} from '../../types/uk-student';
import { ShoppingOptimizer } from '../../lib/uk-student/shopping-optimizer';
import { UKLocationService } from '../../lib/uk-student/location-service';

interface ShoppingListOptimizerProps {
  shoppingList: ShoppingItem[];
  userId: string;
  onOptimizedListChange?: (optimizedList: OptimizedShoppingList) => void;
}

export const ShoppingListOptimizer: React.FC<ShoppingListOptimizerProps> = ({
  shoppingList,
  userId,
  onOptimizedListChange
}) => {
  const [optimizedList, setOptimizedList] = useState<OptimizedShoppingList | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [constraints, setConstraints] = useState<ShoppingConstraints>({
    maxBudget: 50,
    maxTravelTime: 60,
    prioritizePrice: true,
    prioritizeTime: false,
    preferredStores: []
  });
  const [loading, setLoading] = useState(false);
  const [selectedOptimization, setSelectedOptimization] = useState<'balanced' | 'cheapest' | 'fastest'>('balanced');

  const locationService = new UKLocationService();
  const shoppingOptimizer = new ShoppingOptimizer(locationService);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (shoppingList.length > 0 && stores.length > 0) {
      optimizeShoppingList();
    }
  }, [shoppingList, stores, constraints, selectedOptimization]);

  const loadStores = async () => {
    // In a real implementation, this would load from the database
    const birminghamStores: Store[] = [
      {
        id: 'aldi-five-ways',
        name: 'Aldi Five Ways',
        type: 'store',
        address: 'Five Ways, Birmingham',
        coordinates: { latitude: 52.4751, longitude: -1.9180 },
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
        address: 'Selly Oak, Birmingham',
        coordinates: { latitude: 52.4376, longitude: -1.9358 },
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
        id: 'sainsburys-university',
        name: 'Sainsburys University',
        type: 'store',
        address: 'University of Birmingham',
        coordinates: { latitude: 52.4508, longitude: -1.9305 },
        opening_hours: {
          monday: { open: '07:00', close: '23:00' },
          tuesday: { open: '07:00', close: '23:00' },
          wednesday: { open: '07:00', close: '23:00' },
          thursday: { open: '07:00', close: '23:00' },
          friday: { open: '07:00', close: '23:00' },
          saturday: { open: '07:00', close: '23:00' },
          sunday: { open: '11:00', close: '17:00' }
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
        address: 'Selly Oak High Street',
        coordinates: { latitude: 52.4376, longitude: -1.9358 },
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
      }
    ];

    setStores(birminghamStores);
  };

  const optimizeShoppingList = async () => {
    if (shoppingList.length === 0) return;

    setLoading(true);
    try {
      let optimized: OptimizedShoppingList;

      switch (selectedOptimization) {
        case 'cheapest':
          const cheapestStores = await shoppingOptimizer.findCheapestCombination(shoppingList, stores);
          optimized = {
            items: shoppingList,
            stores: cheapestStores,
            total_estimated_cost: cheapestStores.reduce((sum, store) => sum + store.subtotal, 0),
            estimated_time: cheapestStores.reduce((sum, store) => sum + store.travel_time, 0) + (cheapestStores.length * 20)
          };
          break;

        case 'fastest':
          const homeLocation = { name: 'Home', coordinates: [52.4751, -1.9180] as [number, number], type: 'home' as const };
          const fastestStores = await shoppingOptimizer.findFastestRoute(shoppingList, stores, homeLocation);
          optimized = {
            items: shoppingList,
            stores: fastestStores,
            total_estimated_cost: fastestStores.reduce((sum, store) => sum + store.subtotal, 0),
            estimated_time: fastestStores.reduce((sum, store) => sum + store.travel_time, 0) + (fastestStores.length * 15)
          };
          break;

        default: // balanced
          optimized = await shoppingOptimizer.optimizeShoppingList(shoppingList, stores, constraints);
          break;
      }

      setOptimizedList(optimized);
      if (onOptimizedListChange) {
        onOptimizedListChange(optimized);
      }
    } catch (error) {
      console.error('Error optimizing shopping list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConstraintChange = (key: keyof ShoppingConstraints, value: any) => {
    setConstraints(prev => ({ ...prev, [key]: value }));
  };

  const getPriceIcon = (priceLevel: string) => {
    switch (priceLevel) {
      case 'budget': return '💰';
      case 'mid': return '💳';
      case 'premium': return '💎';
      default: return '🏪';
    }
  };

  const getStoreDistance = (store: Store) => {
    // Simplified distance calculation for Birmingham locations
    const distances: Record<string, string> = {
      'aldi-five-ways': '0.5 miles',
      'tesco-selly-oak': '1.2 miles',
      'sainsburys-university': '0.8 miles',
      'premier-selly-oak': '1.0 miles'
    };
    return distances[store.id] || '1.0 miles';
  };

  if (shoppingList.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Shopping List Optimizer</h2>
        <p className="text-gray-500">Add items to your meal plan to see shopping optimization.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping List Optimizer</h1>
        <p className="text-gray-600">
          Find the best stores and routes for your shopping based on price, time, and convenience.
        </p>
      </div>

      {/* Optimization Controls */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Optimization Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <button
            onClick={() => setSelectedOptimization('balanced')}
            className={`p-3 rounded-lg border-2 transition-colors ${
              selectedOptimization === 'balanced'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">⚖️</div>
              <div className="font-medium">Balanced</div>
              <div className="text-sm text-gray-500">Best overall value</div>
            </div>
          </button>

          <button
            onClick={() => setSelectedOptimization('cheapest')}
            className={`p-3 rounded-lg border-2 transition-colors ${
              selectedOptimization === 'cheapest'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">💰</div>
              <div className="font-medium">Cheapest</div>
              <div className="text-sm text-gray-500">Lowest total cost</div>
            </div>
          </button>

          <button
            onClick={() => setSelectedOptimization('fastest')}
            className={`p-3 rounded-lg border-2 transition-colors ${
              selectedOptimization === 'fastest'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">⚡</div>
              <div className="font-medium">Fastest</div>
              <div className="text-sm text-gray-500">Shortest time</div>
            </div>
          </button>
        </div>

        {selectedOptimization === 'balanced' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Budget (£)
              </label>
              <input
                type="number"
                value={constraints.maxBudget || ''}
                onChange={(e) => handleConstraintChange('maxBudget', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
                step="5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Travel Time (min)
              </label>
              <input
                type="number"
                value={constraints.maxTravelTime || ''}
                onChange={(e) => handleConstraintChange('maxTravelTime', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="0"
                step="5"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="prioritize-price"
                checked={constraints.prioritizePrice}
                onChange={(e) => handleConstraintChange('prioritizePrice', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="prioritize-price" className="text-sm font-medium text-gray-700">
                Prioritize Price
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="prioritize-time"
                checked={constraints.prioritizeTime}
                onChange={(e) => handleConstraintChange('prioritizeTime', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="prioritize-time" className="text-sm font-medium text-gray-700">
                Prioritize Time
              </label>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Optimizing shopping list...</span>
        </div>
      ) : optimizedList ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Optimization Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  £{optimizedList.total_estimated_cost.toFixed(2)}
                </div>
                <div className="text-sm text-green-700">Total Cost</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {optimizedList.estimated_time} min
                </div>
                <div className="text-sm text-blue-700">Total Time</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {optimizedList.stores.length}
                </div>
                <div className="text-sm text-purple-700">Stores</div>
              </div>
            </div>
          </div>

          {/* Store Recommendations */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recommended Shopping Route</h2>
            {optimizedList.stores.map((storeRec, index) => (
              <StoreRecommendationCard
                key={storeRec.store.id}
                storeRecommendation={storeRec}
                routeIndex={index + 1}
                distance={getStoreDistance(storeRec.store)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// Store recommendation card component
interface StoreRecommendationCardProps {
  storeRecommendation: StoreRecommendation;
  routeIndex: number;
  distance: string;
}

const StoreRecommendationCard: React.FC<StoreRecommendationCardProps> = ({
  storeRecommendation,
  routeIndex,
  distance
}) => {
  const { store, items, subtotal, travel_time } = storeRecommendation;

  const getPriceIcon = (priceLevel: string) => {
    switch (priceLevel) {
      case 'budget': return '💰';
      case 'mid': return '💳';
      case 'premium': return '💎';
      default: return '🏪';
    }
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return '⭐⭐⭐';
    return '⭐'.repeat(rating);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
            {routeIndex}
          </div>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {store.name}
              <span className="text-lg">{getPriceIcon(store.price_level)}</span>
            </h3>
            <p className="text-sm text-gray-600">
              {store.address} • {distance} • {getRatingStars(store.user_rating)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-600">£{subtotal.toFixed(2)}</div>
          <div className="text-sm text-gray-500">{travel_time} min travel</div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Items to buy here ({items.length}):</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">
                {item.name} ({item.quantity} {item.unit})
              </span>
              <span className="text-sm font-medium text-gray-600">
                {item.priority === 'essential' ? '🔴' : item.priority === 'preferred' ? '🟡' : '🟢'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Opening hours for today */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm">
          <span className="font-medium">Today's hours: </span>
          <span className="text-blue-700">
            {store.opening_hours.monday?.open} - {store.opening_hours.monday?.close}
          </span>
        </div>
      </div>
    </div>
  );
};