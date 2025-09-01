// src/lib/auth/types.ts - TypeScript interfaces for auth state management
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

// Core user profile type from database
export type UserProfile = Database['public']['Tables']['profiles']['Row'];

// Enhanced user type with profile data
export interface User {
  id: string;
  email: string;
  profile: UserProfile;
  session: Session;
}

// Token balance information
export interface TokenBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  trial_start_date?: string;
  trial_end_date?: string;
}

// Trial status information
export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  tokensRemaining: number;
  expiresAt: Date;
}

// Authentication state interface
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tokenBalance: TokenBalance | null;
  trialStatus: TrialStatus | null;
  error: string | null;
}

// Authentication context interface
export interface AuthContextType extends AuthState {
  // Authentication methods
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<User | null>;
  signInWithOAuth: (provider: 'google' | 'github' | 'apple') => Promise<{ url: string } | null>;
  signOut: () => Promise<boolean>;
  
  // Token management
  refreshTokenBalance: () => Promise<void>;
  deductTokens: (amount: number, description: string, metadata?: any) => Promise<boolean>;
  
  // User data management
  refreshUserData: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
}

// Authentication error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

// Sign up data interface
export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  metadata?: Record<string, any>;
}

// Sign in data interface
export interface SignInData {
  email: string;
  password: string;
}

// OAuth provider options
export type OAuthProvider = 'google' | 'github' | 'apple';

// Session storage interface
export interface SessionStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

// Auth configuration interface
export interface AuthConfig {
  autoRefreshToken?: boolean;
  persistSession?: boolean;
  detectSessionInUrl?: boolean;
  flowType?: 'implicit' | 'pkce';
  storage?: SessionStorage;
}

// Waitlist data interface
export interface WaitlistData {
  email: string;
  referrer?: string;
  interestArea?: string;
  metadata?: Record<string, any>;
}

// Waitlist status interface
export interface WaitlistStatus {
  exists: boolean;
  activated: boolean;
  signupDate: Date;
}

// User preferences interface
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  timezone?: string;
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  dashboard?: {
    layout: string;
    modules: string[];
  };
}

// Onboarding state interface
export interface OnboardingState {
  currentStep: 'profile' | 'preferences' | 'modules' | 'complete';
  completedSteps: string[];
  isComplete: boolean;
  profileData?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}