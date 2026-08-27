// UK Student User Initialization Service
// Sets up new users with default preferences, budgets, and Birmingham data

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

interface UserInitializationData {
  userId: string;
  homeLocation?: 'five-ways' | 'selly-oak' | 'edgbaston';
  transportPreference?: 'bike' | 'train' | 'mixed';
  weeklyBudget?: number;
}

export class UserInitializationService {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl!, supabaseKey!);
  }

  /**
   * Check if user has completed UK Student setup
   */
  async isUserInitialized(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('uk_student_preferences')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking initialization:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in isUserInitialized:', error);
      return false;
    }
  }

  /**
   * Initialize new UK Student user with default data
   */
  async initializeUser(data: UserInitializationData): Promise<boolean> {
    const { userId, homeLocation = 'five-ways', transportPreference = 'mixed', weeklyBudget = 200 } = data;

    try {
      // 1. Create user preferences
      await this.createUserPreferences(userId, homeLocation, transportPreference);

      // 2. Create default budget categories
      await this.createDefaultBudgets(userId, weeklyBudget);

      // 3. Create common routine templates
      await this.createDefaultRoutines(userId);

      // 4. Add starter inventory items (optional)
      await this.createStarterInventory(userId);

      console.log(`Successfully initialized UK Student user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error initializing user:', error);
      return false;
    }
  }

  private async createUserPreferences(
    userId: string,
    homeLocation: string,
    transportPreference: string
  ) {
    const { error } = await this.supabase
      .from('uk_student_preferences')
      .insert({
        user_id: userId,
        home_location: homeLocation,
        transport_preference: transportPreference,
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
      });

    if (error) throw error;
  }

  private async createDefaultBudgets(userId: string, weeklyBudget: number) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const categories = [
      { category: 'groceries', weeklyLimit: weeklyBudget * 0.4, monthlyLimit: weeklyBudget * 4 * 0.4 },
      { category: 'transport', weeklyLimit: weeklyBudget * 0.15, monthlyLimit: weeklyBudget * 4 * 0.15 },
      { category: 'entertainment', weeklyLimit: weeklyBudget * 0.25, monthlyLimit: weeklyBudget * 4 * 0.25 },
      { category: 'personal-care', weeklyLimit: weeklyBudget * 0.1, monthlyLimit: weeklyBudget * 4 * 0.1 },
      { category: 'misc', weeklyLimit: weeklyBudget * 0.1, monthlyLimit: weeklyBudget * 4 * 0.1 }
    ];

    const budgets = categories.map(cat => ({
      user_id: userId,
      category: cat.category,
      weekly_limit: cat.weeklyLimit,
      monthly_limit: cat.monthlyLimit,
      current_weekly_spent: 0,
      current_monthly_spent: 0,
      week_start_date: weekStart.toISOString().split('T')[0],
      month_start_date: monthStart.toISOString().split('T')[0],
      alert_threshold: 0.8,
      is_active: true
    }));

    const { error } = await this.supabase
      .from('uk_student_budgets')
      .insert(budgets);

    if (error) throw error;
  }

  private async createDefaultRoutines(userId: string) {
    const routines = [
      {
        user_id: userId,
        routine_type: 'morning',
        name: 'Quick Morning Routine',
        steps: [
          { id: '1', name: 'Shower', estimated_duration: 10, order: 1, required: true },
          { id: '2', name: 'Brush teeth', estimated_duration: 3, order: 2, required: true },
          { id: '3', name: 'Skincare', estimated_duration: 5, order: 3, required: false },
          { id: '4', name: 'Get dressed', estimated_duration: 5, order: 4, required: true },
          { id: '5', name: 'Quick breakfast', estimated_duration: 10, order: 5, required: true }
        ],
        estimated_duration: 33,
        frequency: 'daily',
        is_active: true
      },
      {
        user_id: userId,
        routine_type: 'skincare',
        name: 'Evening Skincare',
        steps: [
          { id: '1', name: 'Remove makeup/sunscreen', estimated_duration: 3, order: 1, required: true },
          { id: '2', name: 'Cleanser (Cetaphil)', estimated_duration: 2, order: 2, required: true },
          { id: '3', name: 'Toner', estimated_duration: 1, order: 3, required: false },
          { id: '4', name: 'Essence (snail mucin)', estimated_duration: 2, order: 4, required: false },
          { id: '5', name: 'Moisturizer', estimated_duration: 2, order: 5, required: true }
        ],
        estimated_duration: 10,
        frequency: 'daily',
        is_active: true
      },
      {
        user_id: userId,
        routine_type: 'laundry',
        name: 'Weekly Laundry',
        steps: [
          { id: '1', name: 'Sort clothes', estimated_duration: 5, order: 1, required: true },
          { id: '2', name: 'Load washer', estimated_duration: 5, order: 2, required: true },
          { id: '3', name: 'Wait (90 min)', estimated_duration: 90, order: 3, required: true },
          { id: '4', name: 'Transfer to dryer', estimated_duration: 5, order: 4, required: true },
          { id: '5', name: 'Wait (60 min)', estimated_duration: 60, order: 5, required: true },
          { id: '6', name: 'Fold and put away', estimated_duration: 15, order: 6, required: true }
        ],
        estimated_duration: 180,
        frequency: 'weekly',
        is_active: true
      }
    ];

    const { error } = await this.supabase
      .from('uk_student_routines')
      .insert(routines);

    if (error) throw error;
  }

  private async createStarterInventory(userId: string) {
    // Optional: Add some common starter items to help users understand the system
    const starterItems = [
      {
        user_id: userId,
        item_name: 'Milk',
        quantity: 1,
        unit: 'pint',
        category: 'dairy',
        location: 'fridge',
        expiry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3 days
      },
      {
        user_id: userId,
        item_name: 'Bread',
        quantity: 1,
        unit: 'loaf',
        category: 'bakery',
        location: 'pantry',
        expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 5 days
      }
    ];

    // Don't throw error if this fails - it's optional
    try {
      await this.supabase
        .from('uk_student_inventory')
        .insert(starterItems);
    } catch (error) {
      console.warn('Could not add starter inventory:', error);
    }
  }

  /**
   * Get user's initialization progress
   */
  async getInitializationProgress(userId: string): Promise<{
    hasPreferences: boolean;
    hasBudgets: boolean;
    hasRoutines: boolean;
    hasInventory: boolean;
    percentComplete: number;
  }> {
    try {
      const [prefsResult, budgetsResult, routinesResult, inventoryResult] = await Promise.all([
        this.supabase.from('uk_student_preferences').select('id').eq('user_id', userId).single(),
        this.supabase.from('uk_student_budgets').select('id').eq('user_id', userId).limit(1),
        this.supabase.from('uk_student_routines').select('id').eq('user_id', userId).limit(1),
        this.supabase.from('uk_student_inventory').select('id').eq('user_id', userId).limit(1)
      ]);

      const hasPreferences = !prefsResult.error && !!prefsResult.data;
      const hasBudgets = !budgetsResult.error && budgetsResult.data.length > 0;
      const hasRoutines = !routinesResult.error && routinesResult.data.length > 0;
      const hasInventory = !inventoryResult.error && inventoryResult.data.length > 0;

      const completed = [hasPreferences, hasBudgets, hasRoutines, hasInventory].filter(Boolean).length;
      const percentComplete = (completed / 4) * 100;

      return {
        hasPreferences,
        hasBudgets,
        hasRoutines,
        hasInventory,
        percentComplete
      };
    } catch (error) {
      console.error('Error getting initialization progress:', error);
      return {
        hasPreferences: false,
        hasBudgets: false,
        hasRoutines: false,
        hasInventory: false,
        percentComplete: 0
      };
    }
  }
}

export const userInitService = new UserInitializationService();
