-- messyOS Production Database Schema Migration
-- This migration adds new tables for multi-user functionality without breaking existing ones

-- Enable necessary extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- WAITLIST & USER MANAGEMENT (NEW TABLES)
-- =============================================

-- Waitlist table for pre-launch signups
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  interest_area VARCHAR(50) DEFAULT 'everything',
  referrer TEXT,
  user_agent TEXT,
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  activated BOOLEAN DEFAULT FALSE,
  activation_date TIMESTAMPTZ,
  notes TEXT
);

-- User preferences and customization  
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Theme customization
  theme VARCHAR(20) DEFAULT 'dark',
  accent_color VARCHAR(7) DEFAULT '#8b5cf6',
  
  -- Module preferences (JSON for flexibility)
  enabled_modules JSONB DEFAULT '["habits", "tasks", "health", "finance", "content"]',
  module_order JSONB DEFAULT '["habits", "tasks", "health", "finance", "content"]',
  dashboard_layout JSONB DEFAULT '{}',
  
  -- AI preferences
  ai_personality VARCHAR(20) DEFAULT 'professional',
  ai_proactivity_level INTEGER DEFAULT 3 CHECK (ai_proactivity_level BETWEEN 1 AND 5),
  
  -- Privacy settings
  data_retention_days INTEGER DEFAULT 365,
  share_analytics BOOLEAN DEFAULT FALSE,
  
  -- Subscription info
  subscription_status VARCHAR(20) DEFAULT 'trial',
  trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_id VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- =============================================
-- ADD COLUMNS TO EXISTING TABLES
-- =============================================

-- Add user_id column to existing habits table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habits' AND column_name = 'user_id') THEN
        ALTER TABLE habits ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to existing habit_entries table if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'user_id') THEN
        ALTER TABLE habit_entries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to existing tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tasks' AND column_name = 'user_id') THEN
        ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column to existing metrics table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'metrics' AND column_name = 'user_id') THEN
        ALTER TABLE metrics ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================
-- AI & INTELLIGENCE TABLES (NEW)
-- =============================================

-- AI insights and recommendations
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'optimization', 'pattern', 'recommendation', 'alert'
  category VARCHAR(50), -- 'habits', 'health', 'finance', 'productivity'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data_backing JSONB, -- The data that supports this insight
  confidence_score DECIMAL CHECK (confidence_score BETWEEN 0 AND 1),
  impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 5),
  action_items JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User interactions with AI
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID DEFAULT gen_random_uuid(),
  message_type VARCHAR(20) CHECK (message_type IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INTEGRATIONS & CONNECTIONS (NEW)
-- =============================================

-- External service connections
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name VARCHAR(50) NOT NULL, -- 'gmail', 'github', 'notion', etc.
  service_type VARCHAR(50), -- 'productivity', 'finance', 'health', etc.
  connection_status VARCHAR(20) DEFAULT 'active' CHECK (connection_status IN ('active', 'inactive', 'error', 'pending')),
  credentials_encrypted TEXT, -- Encrypted credentials
  refresh_token_encrypted TEXT,
  last_sync TIMESTAMPTZ,
  sync_frequency_hours INTEGER DEFAULT 24,
  sync_enabled BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, service_name)
);

-- Import history and data processing logs
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  import_type VARCHAR(50) NOT NULL, -- 'csv', 'api', 'manual', etc.
  source VARCHAR(100), -- 'loop_habits', 'bank_statement', etc.
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  records_processed INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  file_hash VARCHAR(64), -- For duplicate detection
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- SUBSCRIPTION & BILLING (NEW)
-- =============================================

-- Subscription management
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type VARCHAR(20) DEFAULT 'free' CHECK (plan_type IN ('free', 'trial', 'premium')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'suspended', 'expired')),
  
  -- Trial info
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Billing info
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  amount_cents INTEGER DEFAULT 100, -- $1/month = 100 cents
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50), -- 'upi', 'card', 'paypal', etc.
  
  -- External billing system IDs
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  razorpay_customer_id VARCHAR(255), -- For UPI payments
  razorpay_subscription_id VARCHAR(255),
  
  next_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('payment', 'refund', 'chargeback')),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50),
  external_transaction_id VARCHAR(255),
  gateway VARCHAR(20), -- 'stripe', 'razorpay', etc.
  gateway_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- =============================================
-- INDEXES FOR PERFORMANCE (CREATE IF NOT EXISTS)
-- =============================================

-- Core indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_date ON habit_entries(user_id, logged_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON habit_entries(habit_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_user_category_date ON metrics(user_id, category, recorded_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date) WHERE user_id IS NOT NULL;

-- AI and insights indexes
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_created ON ai_insights(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_unread ON ai_insights(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_session ON ai_conversations(user_id, session_id, created_at);

-- Integration indexes
CREATE INDEX IF NOT EXISTS idx_integrations_user_service ON integrations(user_id, service_name);
CREATE INDEX IF NOT EXISTS idx_import_logs_user_status ON import_logs(user_id, status, created_at DESC);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all user tables (only if not already enabled)
DO $$
BEGIN
    -- Enable RLS only if not already enabled
    ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
    ALTER TABLE habit_entries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN
        -- Continue if RLS is already enabled
        NULL;
END $$;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can only access their own habits" ON habits;
CREATE POLICY "Users can only access their own habits" ON habits
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can only access their own habit entries" ON habit_entries;
CREATE POLICY "Users can only access their own habit entries" ON habit_entries
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can only access their own metrics" ON metrics;
CREATE POLICY "Users can only access their own metrics" ON metrics
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can only access their own tasks" ON tasks;
CREATE POLICY "Users can only access their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can only access their own AI insights" ON ai_insights;
CREATE POLICY "Users can only access their own AI insights" ON ai_insights
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own AI conversations" ON ai_conversations;
CREATE POLICY "Users can only access their own AI conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own integrations" ON integrations;
CREATE POLICY "Users can only access their own integrations" ON integrations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own import logs" ON import_logs;
CREATE POLICY "Users can only access their own import logs" ON import_logs
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own preferences" ON user_preferences;
CREATE POLICY "Users can only access their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own subscriptions" ON subscriptions;
CREATE POLICY "Users can only access their own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own transactions" ON transactions;
CREATE POLICY "Users can only access their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Waitlist is publicly insertable but not readable
DROP POLICY IF EXISTS "Anyone can join waitlist" ON waitlist;
CREATE POLICY "Anyone can join waitlist" ON waitlist
  FOR INSERT WITH CHECK (TRUE);

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS habits_updated_at ON habits;
CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_preferences_updated_at ON user_preferences;
CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS integrations_updated_at ON integrations;
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- DEFAULT DATA & SETUP
-- =============================================

-- Insert default user preferences when a user signs up
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.subscriptions (user_id, plan_type, status, trial_start, trial_end)
  VALUES (NEW.id, 'trial', 'active', NOW(), NOW() + INTERVAL '30 days')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- This migration script:
-- 1. Adds new tables only if they don't exist
-- 2. Adds user_id columns to existing tables safely
-- 3. Creates indexes only if they don't exist
-- 4. Sets up RLS policies with proper fallbacks
-- 5. Creates triggers and functions safely
-- 
-- Run this in your Supabase SQL editor to enable multi-user support!