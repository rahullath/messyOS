// UK Student Database Utilities
import { supabase } from '../supabase/client';
import type {
  InventoryItem,
  Recipe,
  TravelRoute,
  UKStudentExpense,
  AcademicEvent,
  Routine,
  Budget,
  Store,
  UKStudentPreferences
} from '../../types/uk-student';

/**
 * Database utility functions for UK Student Life Optimization
 */
export class UKStudentDatabase {
  /**
   * Initialize UK student data for a new user
   * Creates default preferences, budgets, and copies template routes
   */
  async initializeUserData(userId: string): Promise<void> {
    try {
      // Create default preferences
      const defaultPreferences: Partial<UKStudentPreferences> = {
        user_id: userId,
        home_location: 'five-ways',
        transport_preference: 'mixed',
        cooking_time_limits: {
          breakfast: 10,
          lunch: 20,
          dinner: 30
        },
        dietary_restrictions: [],
        bulk_cooking_frequency: 2,
        budget_alert_enabled: true,
        weather_notifications: true,
        laundry_reminder_enabled: true,
        skincare_tracking_enabled: true
      };

      await supabase
        .from('uk_student_preferences')
        .insert(defaultPreferences);

      // Create default budget categories
      const defaultBudgets: Partial<Budget>[] = [
        {
          user_id: userId,
          category: 'groceries',
          weekly_limit: 40.00,
          monthly_limit: 160.00,
          current_weekly_spent: 0,
          current_monthly_spent: 0,
          week_start_date: this.getWeekStartDate(),
          month_start_date: this.getMonthStartDate(),
          alert_threshold: 0.8
        },
        {
          user_id: userId,
          category: 'transport',
          weekly_limit: 15.00,
          monthly_limit: 60.00,
          current_weekly_spent: 0,
          current_monthly_spent: 0,
          week_start_date: this.getWeekStartDate(),
          month_start_date: this.getMonthStartDate(),
          alert_threshold: 0.8
        },
        {
          user_id: userId,
          category: 'entertainment',
          weekly_limit: 25.00,
          monthly_limit: 100.00,
          current_weekly_spent: 0,
          current_monthly_spent: 0,
          week_start_date: this.getWeekStartDate(),
          month_start_date: this.getMonthStartDate(),
          alert_threshold: 0.8
        },
        {
          user_id: userId,
          category: 'utilities',
          weekly_limit: 0,
          monthly_limit: 80.00,
          current_weekly_spent: 0,
          current_monthly_spent: 0,
          week_start_date: this.getWeekStartDate(),
          month_start_date: this.getMonthStartDate(),
          alert_threshold: 0.8
        },
        {
          user_id: userId,
          category: 'emergency',
          weekly_limit: 0,
          monthly_limit: 50.00,
          current_weekly_spent: 0,
          current_monthly_spent: 0,
          week_start_date: this.getWeekStartDate(),
          month_start_date: this.getMonthStartDate(),
          alert_threshold: 0.9
        }
      ];

      await supabase
        .from('uk_student_budgets')
        .insert(defaultBudgets);

      // Copy template travel routes (replace template user_id with actual user_id)
      const { data: templateRoutes } = await supabase
        .from('uk_student_travel_routes')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000');

      if (templateRoutes && templateRoutes.length > 0) {
        const userRoutes = templateRoutes.map(route => ({
          ...route,
          id: undefined, // Let database generate new ID
          user_id: userId,
          frequency_used: 0,
          last_used: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        await supabase
          .from('uk_student_travel_routes')
          .insert(userRoutes);
      }

      // Copy template routines
      const { data: templateRoutines } = await supabase
        .from('uk_student_routines')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-000000000000');

      if (templateRoutines && templateRoutines.length > 0) {
        const userRoutines = templateRoutines.map(routine => ({
          ...routine,
          id: undefined, // Let database generate new ID
          user_id: userId,
          last_completed: null,
          completion_streak: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        await supabase
          .from('uk_student_routines')
          .insert(userRoutines);
      }

    } catch (error) {
      console.error('Error initializing UK student data:', error);
      throw error;
    }
  }

  /**
   * Get all Birmingham locations and stores
   */
  async getBirminghamLocations(): Promise<Store[]> {
    const { data, error } = await supabase
      .from('uk_student_locations')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get public recipes suitable for students
   */
  async getPublicRecipes(limit: number = 50): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('uk_student_recipes')
      .select('*')
      .eq('is_public', true)
      .order('name')
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Search recipes by tags or ingredients
   */
  async searchRecipes(query: string, tags?: string[]): Promise<Recipe[]> {
    let queryBuilder = supabase
      .from('uk_student_recipes')
      .select('*')
      .eq('is_public', true);

    if (tags && tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', tags);
    }

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder
      .order('name')
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's current budget status
   */
  async getUserBudgetStatus(userId: string): Promise<Budget[]> {
    const { data, error } = await supabase
      .from('uk_student_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('category');

    if (error) throw error;
    return data || [];
  }

  /**
   * Update budget spending when new expense is added
   */
  async updateBudgetSpending(userId: string, category: string, amount: number, transactionDate: Date): Promise<void> {
    const weekStart = this.getWeekStartDate(transactionDate);
    const monthStart = this.getMonthStartDate(transactionDate);

    // Get current budget for this category
    const { data: budget, error: fetchError } = await supabase
      .from('uk_student_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .single();

    if (fetchError) throw fetchError;
    if (!budget) return; // No budget set for this category

    // Calculate new spending amounts
    let newWeeklySpent = budget.current_weekly_spent;
    let newMonthlySpent = budget.current_monthly_spent;

    // Check if we need to reset weekly/monthly counters
    if (weekStart.getTime() !== new Date(budget.week_start_date).getTime()) {
      newWeeklySpent = 0;
    }
    if (monthStart.getTime() !== new Date(budget.month_start_date).getTime()) {
      newMonthlySpent = 0;
    }

    // Add new expense
    newWeeklySpent += amount;
    newMonthlySpent += amount;

    // Update budget
    const { error: updateError } = await supabase
      .from('uk_student_budgets')
      .update({
        current_weekly_spent: newWeeklySpent,
        current_monthly_spent: newMonthlySpent,
        week_start_date: weekStart.toISOString().split('T')[0],
        month_start_date: monthStart.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', budget.id);

    if (updateError) throw updateError;
  }

  /**
   * Get week start date (Monday)
   */
  private getWeekStartDate(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Get month start date (1st of month)
   */
  private getMonthStartDate(date: Date = new Date()): Date {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  /**
   * Check if user has UK student data initialized
   */
  async isUserInitialized(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('uk_student_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    return !!data;
  }

  /**
   * Get user's travel routes with usage statistics
   */
  async getUserTravelRoutes(userId: string): Promise<TravelRoute[]> {
    const { data, error } = await supabase
      .from('uk_student_travel_routes')
      .select('*')
      .eq('user_id', userId)
      .order('frequency_used', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update travel route usage
   */
  async updateRouteUsage(routeId: string): Promise<void> {
    const { error } = await supabase
      .from('uk_student_travel_routes')
      .update({
        frequency_used: supabase.raw('frequency_used + 1'),
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', routeId);

    if (error) throw error;
  }
}

// Export singleton instance
export const ukStudentDb = new UKStudentDatabase();