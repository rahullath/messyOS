-- database/privy-migration.sql - Database Schema Migration for Privy Authentication
-- Migrates from Supabase auth.users to Privy user IDs

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
-- MIGRATE EXISTING TABLES TO USE PRIVY_USER_ID
-- =============================================

-- Add privy_user_id column to existing tables
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE ai_usage_sessions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE user_token_earnings ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

-- Update integrations tables
ALTER TABLE github_profiles ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE github_repositories ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE github_commits ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

ALTER TABLE outlook_profiles ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE outlook_emails ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE outlook_calendar_events ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

ALTER TABLE bank_transaction_insights ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE fitness_metrics ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE fitness_workouts ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

ALTER TABLE ai_conversations ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE ai_actions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

-- Add indexes for privy_user_id columns
CREATE INDEX IF NOT EXISTS idx_user_tokens_privy_user_id ON user_tokens(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_privy_user_id ON token_transactions(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_privy_user_id ON ai_usage_sessions(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_privy_user_id ON user_preferences(privy_user_id);

CREATE INDEX IF NOT EXISTS idx_github_profiles_privy_user_id ON github_profiles(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_profiles_privy_user_id ON outlook_profiles(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_bank_insights_privy_user_id ON bank_transaction_insights(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_privy_user_id ON fitness_metrics(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_privy_user_id ON ai_conversations(privy_user_id);

-- =============================================
-- UPDATE RLS POLICIES FOR PRIVY AUTHENTICATION
-- =============================================

-- Helper function to get current Privy user ID
CREATE OR REPLACE FUNCTION get_current_privy_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_privy_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for user_tokens
DROP POLICY IF EXISTS "Users can only access their own token balance" ON user_tokens;
CREATE POLICY "Users can only access their own token balance" ON user_tokens
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for token_transactions
DROP POLICY IF EXISTS "Users can only access their own transactions" ON token_transactions;
CREATE POLICY "Users can only access their own transactions" ON token_transactions
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for ai_usage_sessions
DROP POLICY IF EXISTS "Users can only access their own usage sessions" ON ai_usage_sessions;
CREATE POLICY "Users can only access their own usage sessions" ON ai_usage_sessions
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for user_token_earnings
DROP POLICY IF EXISTS "Users can only access their own earnings" ON user_token_earnings;
CREATE POLICY "Users can only access their own earnings" ON user_token_earnings
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for user_preferences
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for GitHub integration
DROP POLICY IF EXISTS "Users can only access their own GitHub data" ON github_profiles;
CREATE POLICY "Users can only access their own GitHub data" ON github_profiles
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own repositories" ON github_repositories;
CREATE POLICY "Users can only access their own repositories" ON github_repositories
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own commits" ON github_commits;
CREATE POLICY "Users can only access their own commits" ON github_commits
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for Outlook integration
DROP POLICY IF EXISTS "Users can only access their own Outlook data" ON outlook_profiles;
CREATE POLICY "Users can only access their own Outlook data" ON outlook_profiles
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own emails" ON outlook_emails;
CREATE POLICY "Users can only access their own emails" ON outlook_emails
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own calendar events" ON outlook_calendar_events;
CREATE POLICY "Users can only access their own calendar events" ON outlook_calendar_events
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for Banking integration
DROP POLICY IF EXISTS "Users can only access their own banking data" ON bank_transaction_insights;
CREATE POLICY "Users can only access their own banking data" ON bank_transaction_insights
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for Fitness integration
DROP POLICY IF EXISTS "Users can only access their own fitness data" ON fitness_metrics;
CREATE POLICY "Users can only access their own fitness data" ON fitness_metrics
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own workouts" ON fitness_workouts;
CREATE POLICY "Users can only access their own workouts" ON fitness_workouts
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- Update RLS policies for AI system
DROP POLICY IF EXISTS "Users can only access their own conversations" ON ai_conversations;
CREATE POLICY "Users can only access their own conversations" ON ai_conversations
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own AI actions" ON ai_actions;
CREATE POLICY "Users can only access their own AI actions" ON ai_actions
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- =============================================
-- UPDATE HELPER FUNCTIONS FOR PRIVY
-- =============================================

-- Update create_user_tokens function for Privy
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
    '{\"bonus_type\": \"welcome\", \"amount_inr\": 500}'::jsonb
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
-- DATA MIGRATION HELPERS
-- =============================================

-- Function to migrate existing user data to Privy (if needed)
CREATE OR REPLACE FUNCTION migrate_user_to_privy(
  p_old_user_id UUID,
  p_privy_id TEXT,
  p_email TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Create Privy user record
  INSERT INTO privy_users (privy_id, email, created_at)
  VALUES (p_privy_id, p_email, NOW())
  ON CONFLICT (privy_id) DO NOTHING;
  
  -- Update all tables to use privy_user_id
  UPDATE user_tokens SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE token_transactions SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE ai_usage_sessions SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE user_preferences SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE github_profiles SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE outlook_profiles SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE bank_transaction_insights SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE fitness_metrics SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  UPDATE ai_conversations SET privy_user_id = p_privy_id WHERE user_id = p_old_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PRIVY AUTHENTICATION READY
-- =============================================

-- This migration:
-- 1. Creates privy_users table for Privy authentication
-- 2. Adds privy_user_id columns to all existing tables
-- 3. Updates RLS policies to use Privy user IDs
-- 4. Creates Privy-compatible helper functions
-- 5. Provides migration utilities for existing data
--
-- To complete the migration:
-- 1. Run this SQL migration
-- 2. Update application code to use Privy authentication
-- 3. Migrate existing users using migrate_user_to_privy function
-- 4. Remove old user_id columns when migration is complete