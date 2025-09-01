// src/lib/waitlist/service.ts - Waitlist service for database operations
import { authClient } from '../auth/config';
import type { Database } from '../../types/supabase';

export interface WaitlistFormData {
  email: string;
  interest_area?: string;
  referrer?: string;
}

export interface WaitlistStatus {
  exists: boolean;
  activated: boolean;
  signup_date: Date;
}

export interface WaitlistResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: {
    id: string;
    position?: string;
  };
}

class WaitlistService {
  private client = authClient;

  /**
   * Add email to waitlist
   */
  async addToWaitlist(data: WaitlistFormData): Promise<WaitlistResponse> {
    try {
      // Validate email format
      if (!this.isValidEmail(data.email)) {
        return {
          success: false,
          message: 'Please enter a valid email address',
          error: 'INVALID_EMAIL'
        };
      }

      // Check if email already exists
      const existingStatus = await this.checkWaitlistStatus(data.email);
      if (existingStatus.exists) {
        return {
          success: false,
          message: 'This email is already on our waitlist!',
          error: 'EMAIL_EXISTS'
        };
      }

      // Add to waitlist
      const { data: insertData, error } = await this.client
        .from('waitlist')
        .insert({
          email: data.email.toLowerCase().trim(),
          interest_area: data.interest_area || 'everything',
          referrer: data.referrer || 'direct',
          activated: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding to waitlist:', error);
        return {
          success: false,
          message: 'Failed to join waitlist. Please try again.',
          error: 'DATABASE_ERROR'
        };
      }

      return {
        success: true,
        message: 'Successfully joined the waitlist! You\'ll be redirected to sign up.',
        data: {
          id: insertData.id,
          position: 'We\'ll let you know your position soon!'
        }
      };
    } catch (error) {
      console.error('Waitlist service error:', error);
      return {
        success: false,
        message: 'Something went wrong. Please try again.',
        error: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Check if email exists in waitlist
   */
  async checkWaitlistStatus(email: string): Promise<WaitlistStatus> {
    try {
      const { data, error } = await this.client
        .from('waitlist')
        .select('email, activated, signup_date')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error && error.code === 'PGRST116') {
        // No record found
        return {
          exists: false,
          activated: false,
          signup_date: new Date()
        };
      }

      if (error || !data) {
        console.error('Error checking waitlist status:', error);
        return {
          exists: false,
          activated: false,
          signup_date: new Date()
        };
      }

      return {
        exists: true,
        activated: data.activated || false,
        signup_date: new Date(data.signup_date || Date.now())
      };
    } catch (error) {
      console.error('Error checking waitlist status:', error);
      return {
        exists: false,
        activated: false,
        signup_date: new Date()
      };
    }
  }

  /**
   * Mark email as activated (when user signs up)
   */
  async markAsActivated(email: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('waitlist')
        .update({
          activated: true,
          activation_date: new Date().toISOString()
        })
        .eq('email', email.toLowerCase().trim());

      if (error) {
        console.error('Error marking as activated:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking as activated:', error);
      return false;
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Get waitlist statistics (for admin use)
   */
  async getWaitlistStats(): Promise<{
    total: number;
    activated: number;
    pending: number;
  } | null> {
    try {
      const { data, error } = await this.client
        .from('waitlist')
        .select('activated');

      if (error || !data) {
        console.error('Error getting waitlist stats:', error);
        return null;
      }

      const total = data.length;
      const activated = data.filter(item => item.activated === true).length;
      const pending = total - activated;

      return { total, activated, pending };
    } catch (error) {
      console.error('Error getting waitlist stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const waitlistService = new WaitlistService();
export default waitlistService;