-- database/privy-migration-corrected.sql - Corrected Privy Migration
-- Only includes existing tables and creates missing integration tables

-- =============================================
-- PRIVY USER MANAGEMENT
-- =============================================

-- Create table for Privy users (replaces auth.users references)
CREATE TABLE IF NOT EXISTS public.privy_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT UNIQUE NOT NULL, -- Privy DID (did:privy:abc123)
  
  -- User account information
  email TEXT,
  phone TEXT,
  wallet_address TEXT,
  
  -- Linked accounts from Privy
  linked_accounts JSONB DEFAULT '[]'::jsonb,
  
  -- User status
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_privy_users_privy_id ON privy_users(privy_id);
CREATE INDEX IF NOT EXISTS idx_privy_users_email ON privy_users(email);
CREATE INDEX IF NOT EXISTS idx_privy_users_wallet ON privy_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_privy_users_active ON privy_users(is_active, last_login);

-- Enable RLS
ALTER TABLE privy_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for privy_users
DROP POLICY IF EXISTS "Users can read own profile" ON privy_users;
CREATE POLICY "Users can read own profile" ON privy_users
  FOR SELECT USING (privy_id = current_setting('app.current_user_privy_id', true));

DROP POLICY IF EXISTS "Users can update own profile" ON privy_users;
CREATE POLICY "Users can update own profile" ON privy_users
  FOR UPDATE USING (privy_id = current_setting('app.current_user_privy_id', true));

-- =============================================
-- UPDATE EXISTING TOKEN SYSTEM TABLES
-- =============================================

-- Add privy_user_id to existing token tables (these should exist)
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE ai_usage_sessions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE user_token_earnings ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

-- Add indexes for privy_user_id columns on existing tables
CREATE INDEX IF NOT EXISTS idx_user_tokens_privy_user_id ON user_tokens(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_privy_user_id ON token_transactions(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_privy_user_id ON ai_usage_sessions(privy_user_id);

-- =============================================
-- CREATE INTEGRATION TABLES WITH PRIVY SUPPORT
-- =============================================

-- GitHub Integration Tables
CREATE TABLE IF NOT EXISTS public.github_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  github_id BIGINT NOT NULL,
  username TEXT NOT NULL,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  public_repos INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  github_created_at TIMESTAMPTZ,
  access_token TEXT, -- Store encrypted in production
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id),
  UNIQUE(github_id)
);

CREATE TABLE IF NOT EXISTS public.github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  github_repo_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  private BOOLEAN DEFAULT FALSE,
  language TEXT,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  size INTEGER DEFAULT 0,
  topics TEXT[] DEFAULT '{}',
  github_created_at TIMESTAMPTZ,
  github_updated_at TIMESTAMPTZ,
  github_pushed_at TIMESTAMPTZ,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id, github_repo_id)
);

CREATE TABLE IF NOT EXISTS public.github_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  committed_at TIMESTAMPTZ,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  repository_name TEXT,
  repository_full_name TEXT,
  repository_language TEXT,
  commit_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id, sha)
);

-- Outlook Integration Tables
CREATE TABLE IF NOT EXISTS public.outlook_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  outlook_id TEXT NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  given_name TEXT,
  surname TEXT,
  user_principal_name TEXT,
  job_title TEXT,
  office_location TEXT,
  access_token TEXT, -- Store encrypted in production
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id),
  UNIQUE(outlook_id)
);

CREATE TABLE IF NOT EXISTS public.outlook_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  outlook_email_id TEXT NOT NULL,
  subject TEXT,
  body_preview TEXT,
  importance TEXT DEFAULT 'normal',
  is_read BOOLEAN DEFAULT FALSE,
  received_date_time TIMESTAMPTZ,
  sent_date_time TIMESTAMPTZ,
  sender_name TEXT,
  sender_address TEXT,
  categories TEXT[] DEFAULT '{}',
  has_attachments BOOLEAN DEFAULT FALSE,
  inferred_classification TEXT,
  extracted_deadlines JSONB DEFAULT '[]',
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id, outlook_email_id)
);

CREATE TABLE IF NOT EXISTS public.outlook_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  outlook_event_id TEXT NOT NULL,
  subject TEXT,
  start_date_time TIMESTAMPTZ,
  start_time_zone TEXT,
  end_date_time TIMESTAMPTZ,
  end_time_zone TEXT,
  location_name TEXT,
  location_address TEXT,
  organizer_name TEXT,
  organizer_address TEXT,
  attendees JSONB DEFAULT '[]',
  body_preview TEXT,
  importance TEXT DEFAULT 'normal',
  is_online_meeting BOOLEAN DEFAULT FALSE,
  online_meeting_url TEXT,
  categories TEXT[] DEFAULT '{}',
  classification TEXT,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id, outlook_event_id)
);

-- Banking Integration Tables
CREATE TABLE IF NOT EXISTS public.bank_transaction_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  amount INTEGER NOT NULL, -- In pence
  category TEXT NOT NULL,
  subcategory TEXT,
  merchant TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  confidence DECIMAL(3,2) DEFAULT 0.8,
  tags TEXT[] DEFAULT '{}',
  bank TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id, transaction_id)
);

-- Fitness Integration Tables
CREATE TABLE IF NOT EXISTS public.fitness_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  metric_id TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  value DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.8,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id, metric_id)
);

CREATE TABLE IF NOT EXISTS public.fitness_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  workout_id TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  duration INTEGER, -- minutes
  calories INTEGER,
  distance INTEGER, -- meters
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  source TEXT NOT NULL,
  notes TEXT,
  metrics JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id, workout_id)
);

-- AI System Tables (if they don't exist)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  response_time_ms INTEGER,
  tokens_used INTEGER,
  actions_executed INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  reasoning TEXT,
  result JSONB DEFAULT '{}',
  conversation_id UUID REFERENCES ai_conversations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT NOT NULL,
  theme TEXT DEFAULT 'dark',
  timezone TEXT DEFAULT 'UTC',
  notifications JSONB DEFAULT '{"email": true, "push": true}',
  privacy JSONB DEFAULT '{"analytics": true, "personalization": true}',
  ai_settings JSONB DEFAULT '{"autonomous_actions": true, "confidence_threshold": 0.8}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(privy_user_id)
);

-- =============================================
-- CREATE INDEXES FOR INTEGRATION TABLES
-- =============================================

-- GitHub indexes
CREATE INDEX IF NOT EXISTS idx_github_profiles_privy_user_id ON github_profiles(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_privy_user_id ON github_repositories(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_privy_user_id ON github_commits(privy_user_id);

-- Outlook indexes
CREATE INDEX IF NOT EXISTS idx_outlook_profiles_privy_user_id ON outlook_profiles(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_emails_privy_user_id ON outlook_emails(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_events_privy_user_id ON outlook_calendar_events(privy_user_id);

-- Banking indexes
CREATE INDEX IF NOT EXISTS idx_bank_insights_privy_user_id ON bank_transaction_insights(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_bank_insights_date ON bank_transaction_insights(privy_user_id, date);

-- Fitness indexes
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_privy_user_id ON fitness_metrics(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_workouts_privy_user_id ON fitness_workouts(privy_user_id);

-- AI system indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_privy_user_id ON ai_conversations(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_actions_privy_user_id ON ai_actions(privy_user_id);

-- User preferences index
CREATE INDEX IF NOT EXISTS idx_user_preferences_privy_user_id ON user_preferences(privy_user_id);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

-- Enable RLS
ALTER TABLE github_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transaction_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CREATE RLS POLICIES
-- =============================================

-- Helper function to get current Privy user ID
CREATE OR REPLACE FUNCTION get_current_privy_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_privy_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for existing token tables
DROP POLICY IF EXISTS "Users can only access their own token balance" ON user_tokens;
CREATE POLICY "Users can only access their own token balance" ON user_tokens
  FOR ALL USING (privy_user_id = get_current_privy_user_id() OR privy_user_id IS NULL);

DROP POLICY IF EXISTS "Users can only access their own transactions" ON token_transactions;
CREATE POLICY "Users can only access their own transactions" ON token_transactions
  FOR ALL USING (privy_user_id = get_current_privy_user_id() OR privy_user_id IS NULL);

-- RLS policies for GitHub integration
CREATE POLICY "Users can only access their own GitHub data" ON github_profiles
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

CREATE POLICY "Users can only access their own repositories" ON github_repositories
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

CREATE POLICY "Users can only access their own commits" ON github_commits
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for Outlook integration
CREATE POLICY "Users can only access their own Outlook data" ON outlook_profiles
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

CREATE POLICY "Users can only access their own emails" ON outlook_emails
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

CREATE POLICY "Users can only access their own calendar events" ON outlook_calendar_events
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for Banking integration
CREATE POLICY "Users can only access their own banking data" ON bank_transaction_insights
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for Fitness integration
CREATE POLICY "Users can only access their own fitness data" ON fitness_metrics
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

CREATE POLICY "Users can only access their own workouts" ON fitness_workouts
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for AI system
CREATE POLICY "Users can only access their own conversations" ON ai_conversations
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

CREATE POLICY "Users can only access their own AI actions" ON ai_actions
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for user preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- =============================================
-- PRIVY-COMPATIBLE HELPER FUNCTIONS
-- =============================================

-- Function to create user tokens account when user signs up with Privy
CREATE OR REPLACE FUNCTION create_user_tokens_privy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_tokens (privy_user_id, balance, total_earned)
  VALUES (NEW.privy_id, 5000, 5000) -- ₹500 starting credit
  ON CONFLICT (privy_user_id) DO NOTHING;
  
  -- Log the welcome bonus transaction
  INSERT INTO public.token_transactions (
    privy_user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    related_entity_type,
    metadata
  ) VALUES (
    NEW.privy_id,
    'bonus',
    5000,
    'Welcome to meshOS! ₹500 starting credit',
    0,
    5000,
    'welcome_bonus',
    '{"bonus_type": "welcome", "amount_inr": 500}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new Privy users
DROP TRIGGER IF EXISTS on_privy_user_created_tokens ON privy_users;
CREATE TRIGGER on_privy_user_created_tokens
  AFTER INSERT ON privy_users
  FOR EACH ROW EXECUTE FUNCTION create_user_tokens_privy();

-- Update deduct_tokens function for Privy
CREATE OR REPLACE FUNCTION deduct_tokens_privy(
  p_privy_user_id TEXT,
  p_amount INTEGER,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM user_tokens
  WHERE privy_user_id = p_privy_user_id
  FOR UPDATE;
  
  -- Check if user exists and has sufficient balance
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User token account not found';
  END IF;
  
  IF current_balance < p_amount THEN
    RETURN FALSE; -- Insufficient balance
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - p_amount;
  
  -- Update balance and spending total
  UPDATE user_tokens
  SET 
    balance = new_balance,
    total_spent = total_spent + p_amount,
    last_transaction_at = NOW(),
    updated_at = NOW()
  WHERE privy_user_id = p_privy_user_id;
  
  -- Log the transaction
  INSERT INTO token_transactions (
    privy_user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    p_privy_user_id,
    'spend',
    -p_amount, -- Negative for spending
    p_description,
    current_balance,
    new_balance,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update add_tokens function for Privy
CREATE OR REPLACE FUNCTION add_tokens_privy(
  p_privy_user_id TEXT,
  p_amount INTEGER,
  p_description TEXT,
  p_transaction_type TEXT DEFAULT 'earn',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM user_tokens
  WHERE privy_user_id = p_privy_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User token account not found';
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance + p_amount;
  
  -- Update balance and earning total
  UPDATE user_tokens
  SET 
    balance = new_balance,
    total_earned = total_earned + p_amount,
    last_transaction_at = NOW(),
    updated_at = NOW()
  WHERE privy_user_id = p_privy_user_id;
  
  -- Log the transaction
  INSERT INTO token_transactions (
    privy_user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    p_privy_user_id,
    p_transaction_type,
    p_amount,
    p_description,
    current_balance,
    new_balance,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- CORRECTED PRIVY MIGRATION COMPLETE
-- =============================================

-- This migration:
-- 1. Creates privy_users table for Privy authentication
-- 2. Updates existing token tables with privy_user_id columns
-- 3. Creates all integration tables with Privy support from the start
-- 4. Sets up proper RLS policies for data isolation
-- 5. Creates Privy-compatible helper functions
-- 
-- Run this SQL to set up the complete meshOS database with Privy authentication