// Dashboard Data Aggregation Service
// Combines data from all UK Student services for unified dashboard view

import { createClient } from '@supabase/supabase-js';
import type {
  DashboardData,
  WeatherData,
  BudgetHealth,
  AcademicEvent,
  Routine,
  Alert,
  TravelRoute,
  Recipe
} from '../../types/uk-student';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

interface DashboardStats {
  weeklySpent: number;
  weeklyBudget: number;
  inventoryItems: number;
  expiringItems: number;
  upcomingDeadlines: number;
  todayEvents: number;
}

export class DashboardService {
  private supabase;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.supabase = createClient(supabaseUrl!, supabaseKey!);
  }

  /**
   * Get comprehensive dashboard data for a user
   */
  async getDashboardData(userId: string, date: Date = new Date()): Promise<any> {
    try {
      const [
        weather,
        budgetStats,
        inventoryStats,
        todaySchedule,
        upcomingDeadlines,
        activeRoutines,
        alerts
      ] = await Promise.all([
        this.getWeather(),
        this.getBudgetStats(userId),
        this.getInventoryStats(userId),
        this.getTodaySchedule(userId, date),
        this.getUpcomingDeadlines(userId),
        this.getActiveRoutines(userId),
        this.getAlerts(userId)
      ]);

      return {
        weather,
        stats: {
          ...budgetStats,
          ...inventoryStats,
          todayEvents: todaySchedule.length,
          upcomingDeadlines: upcomingDeadlines.length
        },
        today_schedule: todaySchedule,
        upcoming_deadlines: upcomingDeadlines,
        routine_reminders: activeRoutines,
        alerts,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get weather data with caching
   */
  private async getWeather(): Promise<WeatherData> {
    const cached = this.getFromCache('weather');
    if (cached) return cached;

    try {
      // Birmingham coordinates
      const lat = 52.4862;
      const lon = -1.8904;
      const apiKey = import.meta.env.OPENWEATHER_API_KEY;

      if (!apiKey) {
        console.warn('No OpenWeather API key configured');
        return this.getFallbackWeather();
      }

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('Weather API failed');
      }

      const data = await response.json();

      const weather: WeatherData = {
        date: new Date(),
        conditions: {
          temperature: Math.round(data.main.temp),
          condition: this.mapWeatherCondition(data.weather[0].main),
          precipitation_chance: data.rain ? 100 : 0,
          wind_speed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        }
      };

      this.setCache('weather', weather, 30 * 60 * 1000); // 30 min cache
      return weather;
    } catch (error) {
      console.error('Error fetching weather:', error);
      return this.getFallbackWeather();
    }
  }

  private getFallbackWeather(): WeatherData {
    return {
      date: new Date(),
      conditions: {
        temperature: 12,
        condition: 'cloudy',
        precipitation_chance: 0,
        wind_speed: 15
      }
    };
  }

  private mapWeatherCondition(condition: string): 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' {
    const map: Record<string, 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy'> = {
      'Clear': 'sunny',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'rainy',
      'Snow': 'snowy',
      'Thunderstorm': 'rainy',
      'Mist': 'cloudy',
      'Fog': 'cloudy'
    };
    return map[condition] || 'cloudy';
  }

  /**
   * Get budget statistics
   */
  private async getBudgetStats(userId: string): Promise<{ weeklySpent: number; weeklyBudget: number }> {
    try {
      // Get current week's budget
      const { data: budgets, error: budgetError } = await this.supabase
        .from('uk_student_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (budgetError) throw budgetError;

      const weeklyBudget = budgets?.reduce((sum, b) => sum + (b.weekly_limit || 0), 0) || 200;
      const weeklySpent = budgets?.reduce((sum, b) => sum + (b.current_weekly_spent || 0), 0) || 0;

      return { weeklySpent, weeklyBudget };
    } catch (error) {
      console.error('Error fetching budget stats:', error);
      return { weeklySpent: 0, weeklyBudget: 200 };
    }
  }

  /**
   * Get inventory statistics
   */
  private async getInventoryStats(userId: string): Promise<{ inventoryItems: number; expiringItems: number }> {
    try {
      const { data: items, error } = await this.supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const expiringItems = items?.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        return expiryDate <= threeDaysFromNow && expiryDate > now;
      }).length || 0;

      return {
        inventoryItems: items?.length || 0,
        expiringItems
      };
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return { inventoryItems: 0, expiringItems: 0 };
    }
  }

  /**
   * Get today's academic schedule
   */
  private async getTodaySchedule(userId: string, date: Date): Promise<AcademicEvent[]> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await this.supabase
        .from('uk_student_academic_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching today schedule:', error);
      return [];
    }
  }

  /**
   * Get upcoming deadlines (next 7 days)
   */
  private async getUpcomingDeadlines(userId: string): Promise<AcademicEvent[]> {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await this.supabase
        .from('uk_student_academic_events')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['deadline', 'assignment', 'exam'])
        .gte('start_time', now.toISOString())
        .lte('start_time', sevenDaysFromNow.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching deadlines:', error);
      return [];
    }
  }

  /**
   * Get active routines
   */
  private async getActiveRoutines(userId: string): Promise<Routine[]> {
    try {
      const { data, error } = await this.supabase
        .from('uk_student_routines')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('frequency', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching routines:', error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  private async getAlerts(userId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Check budget alerts
      const { data: budgets } = await this.supabase
        .from('uk_student_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      budgets?.forEach(budget => {
        if (budget.weekly_limit && budget.current_weekly_spent) {
          const percentage = (budget.current_weekly_spent / budget.weekly_limit) * 100;
          if (percentage >= budget.alert_threshold * 100) {
            alerts.push({
              id: `budget-${budget.id}`,
              type: 'budget_exceeded',
              title: `${budget.category} budget alert`,
              message: `You've used ${percentage.toFixed(0)}% of your ${budget.category} budget`,
              severity: percentage >= 100 ? 'error' : 'warning',
              created_at: new Date(),
              dismissed: false
            });
          }
        }
      });

      // Check expiry alerts
      const { data: items } = await this.supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', userId);

      const now = new Date();
      const expiringSoon = items?.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 2;
      });

      if (expiringSoon && expiringSoon.length > 0) {
        alerts.push({
          id: 'expiry-alert',
          type: 'expiry_warning',
          title: 'Items expiring soon',
          message: `${expiringSoon.length} item(s) expire in the next 2 days`,
          severity: 'warning',
          created_at: new Date(),
          dismissed: false
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error generating alerts:', error);
      return alerts;
    }
  }

  /**
   * Simple cache implementation
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, duration: number = this.cacheDuration) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const dashboardService = new DashboardService();
