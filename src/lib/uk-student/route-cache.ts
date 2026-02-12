// Route caching system for offline functionality
import type { RouteInfo, TravelRoute, WeatherData, Location } from '../../types/uk-student';

export interface CachedRoute {
  route: RouteInfo;
  timestamp: number;
  expiresAt: number;
}

export interface CachedWeather {
  weather: WeatherData[];
  timestamp: number;
  expiresAt: number;
}

export interface CachedTravelRoute {
  travelRoute: TravelRoute;
  timestamp: number;
  expiresAt: number;
}

export interface OfflineRouteData {
  routes: Record<string, CachedRoute>;
  weather: Record<string, CachedWeather>;
  travelRoutes: Record<string, CachedTravelRoute>;
  lastSync: number;
}

export class RouteCache {
  private dbName = 'uk-student-route-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB for offline storage
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('IndexedDB not available, using memory cache only');
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('routes')) {
          db.createObjectStore('routes', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('weather')) {
          db.createObjectStore('weather', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('travelRoutes')) {
          db.createObjectStore('travelRoutes', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Cache a route calculation
   */
  async cacheRoute(
    from: Location,
    to: Location,
    method: string,
    route: RouteInfo,
    ttlMinutes: number = 60
  ): Promise<void> {
    const key = this.generateRouteKey(from, to, method);
    const cachedRoute: CachedRoute = {
      route,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    };

    await this.storeData('routes', key, cachedRoute);
  }

  /**
   * Get cached route if available and not expired
   */
  async getCachedRoute(
    from: Location,
    to: Location,
    method: string
  ): Promise<RouteInfo | null> {
    const key = this.generateRouteKey(from, to, method);
    const cached = await this.getData<CachedRoute>('routes', key);

    if (!cached || Date.now() > cached.expiresAt) {
      if (cached) {
        await this.removeData('routes', key); // Clean up expired data
      }
      return null;
    }

    return cached.route;
  }

  /**
   * Cache weather data
   */
  async cacheWeather(
    location: Location,
    weather: WeatherData[],
    ttlMinutes: number = 30
  ): Promise<void> {
    const key = this.generateWeatherKey(location);
    const cachedWeather: CachedWeather = {
      weather,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    };

    await this.storeData('weather', key, cachedWeather);
  }

  /**
   * Get cached weather if available and not expired
   */
  async getCachedWeather(location: Location): Promise<WeatherData[] | null> {
    const key = this.generateWeatherKey(location);
    const cached = await this.getData<CachedWeather>('weather', key);

    if (!cached || Date.now() > cached.expiresAt) {
      if (cached) {
        await this.removeData('weather', key);
      }
      return null;
    }

    return cached.weather;
  }

  /**
   * Cache travel route recommendations
   */
  async cacheTravelRoute(
    from: Location,
    to: Location,
    travelRoute: TravelRoute,
    ttlMinutes: number = 120
  ): Promise<void> {
    const key = this.generateTravelRouteKey(from, to, travelRoute.preferred_method);
    const cachedTravelRoute: CachedTravelRoute = {
      travelRoute,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    };

    await this.storeData('travelRoutes', key, cachedTravelRoute);
  }

  /**
   * Get cached travel route
   */
  async getCachedTravelRoute(
    from: Location,
    to: Location,
    method: string
  ): Promise<TravelRoute | null> {
    const key = this.generateTravelRouteKey(from, to, method);
    const cached = await this.getData<CachedTravelRoute>('travelRoutes', key);

    if (!cached || Date.now() > cached.expiresAt) {
      if (cached) {
        await this.removeData('travelRoutes', key);
      }
      return null;
    }

    return cached.travelRoute;
  }

  /**
   * Get all cached data for offline use
   */
  async getOfflineData(): Promise<OfflineRouteData> {
    const routes = await this.getAllData<CachedRoute>('routes');
    const weather = await this.getAllData<CachedWeather>('weather');
    const travelRoutes = await this.getAllData<CachedTravelRoute>('travelRoutes');

    // Filter out expired data
    const now = Date.now();
    const validRoutes: Record<string, CachedRoute> = {};
    const validWeather: Record<string, CachedWeather> = {};
    const validTravelRoutes: Record<string, CachedTravelRoute> = {};

    Object.entries(routes).forEach(([key, cached]) => {
      if (cached.expiresAt > now) {
        validRoutes[key] = cached;
      }
    });

    Object.entries(weather).forEach(([key, cached]) => {
      if (cached.expiresAt > now) {
        validWeather[key] = cached;
      }
    });

    Object.entries(travelRoutes).forEach(([key, cached]) => {
      if (cached.expiresAt > now) {
        validTravelRoutes[key] = cached;
      }
    });

    return {
      routes: validRoutes,
      weather: validWeather,
      travelRoutes: validTravelRoutes,
      lastSync: await this.getLastSyncTime()
    };
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const now = Date.now();
    
    // Clear expired routes
    const routes = await this.getAllData<CachedRoute>('routes');
    for (const [key, cached] of Object.entries(routes)) {
      if (cached.expiresAt <= now) {
        await this.removeData('routes', key);
      }
    }

    // Clear expired weather
    const weather = await this.getAllData<CachedWeather>('weather');
    for (const [key, cached] of Object.entries(weather)) {
      if (cached.expiresAt <= now) {
        await this.removeData('weather', key);
      }
    }

    // Clear expired travel routes
    const travelRoutes = await this.getAllData<CachedTravelRoute>('travelRoutes');
    for (const [key, cached] of Object.entries(travelRoutes)) {
      if (cached.expiresAt <= now) {
        await this.removeData('travelRoutes', key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['routes', 'weather', 'travelRoutes'], 'readwrite');
    
    await Promise.all([
      this.clearObjectStore(transaction.objectStore('routes')),
      this.clearObjectStore(transaction.objectStore('weather')),
      this.clearObjectStore(transaction.objectStore('travelRoutes'))
    ]);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalRoutes: number;
    totalWeather: number;
    totalTravelRoutes: number;
    expiredRoutes: number;
    expiredWeather: number;
    expiredTravelRoutes: number;
    cacheSize: number;
  }> {
    const routes = await this.getAllData<CachedRoute>('routes');
    const weather = await this.getAllData<CachedWeather>('weather');
    const travelRoutes = await this.getAllData<CachedTravelRoute>('travelRoutes');

    const now = Date.now();
    
    const expiredRoutes = Object.values(routes).filter(r => r.expiresAt <= now).length;
    const expiredWeather = Object.values(weather).filter(w => w.expiresAt <= now).length;
    const expiredTravelRoutes = Object.values(travelRoutes).filter(tr => tr.expiresAt <= now).length;

    // Estimate cache size (rough calculation)
    const cacheSize = JSON.stringify({ routes, weather, travelRoutes }).length;

    return {
      totalRoutes: Object.keys(routes).length,
      totalWeather: Object.keys(weather).length,
      totalTravelRoutes: Object.keys(travelRoutes).length,
      expiredRoutes,
      expiredWeather,
      expiredTravelRoutes,
      cacheSize
    };
  }

  /**
   * Update last sync time
   */
  async updateLastSyncTime(): Promise<void> {
    await this.storeData('metadata', 'lastSync', { 
      key: 'lastSync', 
      value: Date.now() 
    });
  }

  // Private helper methods

  private generateRouteKey(from: Location, to: Location, method: string): string {
    return `route:${from.name}:${to.name}:${method}`;
  }

  private generateWeatherKey(location: Location): string {
    return `weather:${location.name}`;
  }

  private generateTravelRouteKey(from: Location, to: Location, method: string): string {
    return `travel:${from.name}:${to.name}:${method}`;
  }

  private async storeData(storeName: string, key: string, data: any): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({ key, ...data });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getData<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { key: _, ...data } = result;
          resolve(data as T);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllData<T>(storeName: string): Promise<Record<string, T>> {
    if (!this.db) return {};

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results: Record<string, T> = {};
        request.result.forEach((item: any) => {
          const { key, ...data } = item;
          results[key] = data as T;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async removeData(storeName: string, key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearObjectStore(store: IDBObjectStore): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getLastSyncTime(): Promise<number> {
    const metadata = await this.getData<{ value: number }>('metadata', 'lastSync');
    return metadata?.value || 0;
  }
}