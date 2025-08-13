// src/lib/auth/preferences-client.ts - Client-side Preferences Management
export interface UserPreferences {
  id?: string;
  user_id?: string;
  theme: string;
  accent_color: string;
  enabled_modules: string[];
  module_order: string[];
  dashboard_layout: any;
  ai_personality: string;
  ai_proactivity_level: number;
  data_retention_days: number;
  share_analytics: boolean;
  subscription_status: string;
  trial_end_date?: string;
  subscription_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SubscriptionInfo {
  status: string;
  trialEndDate?: string;
  daysLeft: number;
  isTrialActive: boolean;
  isExpired: boolean;
}

export class PreferencesClient {
  private baseUrl = '/api/auth';

  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const response = await fetch(`${this.baseUrl}/preferences`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to get preferences:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting preferences:', error);
      return null;
    }
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Preferences updated successfully');
        return true;
      } else {
        console.error('Failed to update preferences:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    }
  }

  async resetToDefaults(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/preferences`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Preferences reset to defaults');
        return true;
      } else {
        console.error('Failed to reset preferences:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error resetting preferences:', error);
      return false;
    }
  }

  async getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to get subscription info:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting subscription info:', error);
      return null;
    }
  }

  async updateSubscription(action: string, subscriptionData?: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, subscriptionData })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Subscription updated successfully:', action);
        return true;
      } else {
        console.error('Failed to update subscription:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      return false;
    }
  }

  // Convenience methods
  async updateTheme(theme: string, accentColor?: string): Promise<boolean> {
    const updates: any = { theme };
    if (accentColor) updates.accent_color = accentColor;
    return this.updatePreferences(updates);
  }

  async updateModules(enabledModules: string[]): Promise<boolean> {
    return this.updatePreferences({ 
      enabled_modules: enabledModules,
      module_order: enabledModules 
    });
  }

  async updateAISettings(personality: string, proactivityLevel: number): Promise<boolean> {
    return this.updatePreferences({
      ai_personality: personality,
      ai_proactivity_level: proactivityLevel
    });
  }

  async extendTrial(): Promise<boolean> {
    return this.updateSubscription('extend_trial');
  }

  async activatePremium(subscriptionId: string): Promise<boolean> {
    return this.updateSubscription('activate_premium', { subscriptionId });
  }
}

// Create a singleton instance
export const preferencesClient = new PreferencesClient();