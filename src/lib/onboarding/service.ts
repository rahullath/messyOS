// src/lib/onboarding/service.ts - User onboarding and profile setup service
import { authClient } from '../auth/config';
import type { Database } from '../../types/supabase';
import type { OnboardingState, UserPreferences } from '../auth/types';

type UserProfile = Database['public']['Tables']['profiles']['Row'];
type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row'];

export interface ProfileData {
  fullName: string;
  timezone: string;
  preferredModules: string[];
}

export interface OnboardingPreferences {
  enabledModules: string[];
  theme: string;
  accentColor: string;
  aiPersonality: string;
  aiProactivity: number;
  selectedIntegrations: string[];
}

class OnboardingService {
  private client = authClient;

  private parsePreferences(raw: unknown): Record<string, any> {
    return raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  }

  /**
   * Create user profile with essential information
   */
  async createUserProfile(userId: string, data: ProfileData): Promise<UserProfile | null> {
    try {
      const { data: profile, error } = await this.client
        .from('profiles')
        .upsert({
          id: userId,
          full_name: data.fullName,
          username: data.fullName.toLowerCase().replace(/\s+/g, '_'),
          settings: {
            timezone: data.timezone,
            preferredModules: data.preferredModules,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  }

  /**
   * Initialize user preferences with default settings
   */
  async initializePreferences(userId: string, preferences?: Partial<OnboardingPreferences>): Promise<UserPreferencesRow | null> {
    try {
      const defaultPreferencesPayload = {
        theme: preferences?.theme || 'dark',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'en',
        notifications: {
          email: true,
          push: true,
          marketing: false
        },
        dashboard: {
          layout: 'default',
          modules: preferences?.enabledModules || ['habits', 'tasks', 'health', 'finance'],
          moduleOrder: preferences?.enabledModules || ['habits', 'tasks', 'health', 'finance']
        },
        enabled_modules: preferences?.enabledModules || ['habits', 'tasks', 'health', 'finance'],
        module_order: preferences?.enabledModules || ['habits', 'tasks', 'health', 'finance'],
        accent_color: preferences?.accentColor || '#06b6d4',
        ai_personality: preferences?.aiPersonality || 'professional',
        ai_proactivity_level: preferences?.aiProactivity || 3,
        subscription_status: 'trial',
        trial_started: new Date().toISOString(),
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const defaultPreferences = {
        user_id: userId,
        preferences: defaultPreferencesPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: userPrefs, error } = await this.client
        .from('user_preferences')
        .upsert(defaultPreferences)
        .select()
        .single();

      if (error) {
        console.error('Error initializing user preferences:', error);
        return null;
      }

      return userPrefs;
    } catch (error) {
      console.error('Error initializing user preferences:', error);
      return null;
    }
  }

  /**
   * Setup AI preferences for the user
   */
  async setupAIPreferences(userId: string, preferences?: Partial<OnboardingPreferences>): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('user_ai_preferences')
        .upsert({
          user_id: userId,
          communication_style: preferences?.aiPersonality || 'motivational',
          notification_frequency: 'moderate',
          focus_areas: preferences?.enabledModules || ['habits'],
          privacy_level: 'selective',
          agent_name: 'Mesh',
          daily_briefing_time: '08:00:00',
          weekly_report_day: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error setting up AI preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting up AI preferences:', error);
      return false;
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(userId: string): Promise<boolean> {
    try {
      // Update profile to mark onboarding as complete
      const { error: profileError } = await this.client
        .from('profiles')
        .update({
          settings: {
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error completing onboarding:', profileError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  }

  /**
   * Get onboarding status for a user
   */
  async getOnboardingStatus(userId: string): Promise<OnboardingState> {
    try {
      // Check if user has preferences (indicates onboarding completion)
      const { data: preferences } = await this.client
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Check profile settings
      const { data: profile } = await this.client
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();

      const isComplete = !!preferences && profile?.settings?.onboardingCompleted;
      const normalizedPreferences = this.parsePreferences(preferences?.preferences);

      return {
        currentStep: isComplete ? 'complete' : 'profile',
        completedSteps: isComplete ? ['profile', 'preferences', 'modules'] : [],
        isComplete,
        profileData: profile ? {
          full_name: profile.full_name,
          username: profile.username,
          settings: profile.settings
        } : undefined,
        preferences: preferences ? {
          theme: normalizedPreferences.theme,
          timezone: normalizedPreferences.timezone,
          language: normalizedPreferences.language,
          notifications: normalizedPreferences.notifications,
          dashboard: normalizedPreferences.dashboard
        } : undefined
      };
    } catch (error) {
      console.error('Error getting onboarding status:', error);
      return {
        currentStep: 'profile',
        completedSteps: [],
        isComplete: false
      };
    }
  }

  /**
   * Initialize dashboard with tutorial elements
   */
  async initializeDashboard(userId: string): Promise<boolean> {
    try {
      // Create sample habits for new users
      const sampleHabits = [
        {
          user_id: userId,
          name: 'Morning Exercise',
          description: 'Start your day with 30 minutes of physical activity',
          category: 'Health',
          type: 'build',
          target_value: 1,
          target_unit: 'times',
          color: '#10b981',
          is_active: true,
          position: 1
        },
        {
          user_id: userId,
          name: 'Read for 20 minutes',
          description: 'Daily reading to expand knowledge and relax',
          category: 'Learning',
          type: 'build',
          target_value: 20,
          target_unit: 'minutes',
          color: '#3b82f6',
          is_active: true,
          position: 2
        },
        {
          user_id: userId,
          name: 'Drink 8 glasses of water',
          description: 'Stay hydrated throughout the day',
          category: 'Health',
          type: 'build',
          target_value: 8,
          target_unit: 'glasses',
          color: '#06b6d4',
          is_active: true,
          position: 3
        }
      ];

      const { error: habitsError } = await this.client
        .from('habits')
        .insert(sampleHabits);

      if (habitsError) {
        console.error('Error creating sample habits:', habitsError);
        // Don't fail onboarding if sample habits fail
      }

      // Create sample tasks
      const sampleTasks = [
        {
          user_id: userId,
          title: 'Complete MessyOS Setup',
          description: 'Explore all the features and customize your dashboard',
          category: 'Setup',
          priority: 'high',
          status: 'todo',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: userId,
          title: 'Set Your First Goals',
          description: 'Define what you want to achieve in the next 30 days',
          category: 'Planning',
          priority: 'medium',
          status: 'todo'
        }
      ];

      const { error: tasksError } = await this.client
        .from('tasks')
        .insert(sampleTasks);

      if (tasksError) {
        console.error('Error creating sample tasks:', tasksError);
        // Don't fail onboarding if sample tasks fail
      }

      return true;
    } catch (error) {
      console.error('Error initializing dashboard:', error);
      return false;
    }
  }

  /**
   * Save onboarding preferences from the flow
   */
  async saveOnboardingPreferences(userId: string, preferences: OnboardingPreferences): Promise<boolean> {
    try {
      // Initialize user preferences
      const userPrefs = await this.initializePreferences(userId, preferences);
      if (!userPrefs) {
        return false;
      }

      // Setup AI preferences
      const aiPrefsSuccess = await this.setupAIPreferences(userId, preferences);
      if (!aiPrefsSuccess) {
        console.warn('Failed to setup AI preferences, but continuing...');
      }

      // Initialize dashboard with sample data
      const dashboardSuccess = await this.initializeDashboard(userId);
      if (!dashboardSuccess) {
        console.warn('Failed to initialize dashboard, but continuing...');
      }

      // Mark onboarding as complete
      const completionSuccess = await this.completeOnboarding(userId);
      if (!completionSuccess) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving onboarding preferences:', error);
      return false;
    }
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();
export default onboardingService;
