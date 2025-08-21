-- database/privy-migration-safe.sql - Safe Privy Migration
-- Only adds what's missing based on existing schema

-- =============================================
-- SAFE PRIVY MIGRATION - ONLY MISSING PIECES
-- =============================================

-- The privy_users table already exists, just ensure indexes
CREATE INDEX IF NOT EXISTS idx_privy_users_privy_id ON privy_users(privy_id);
CREATE INDEX IF NOT EXISTS idx_privy_users_email ON privy_users(email);
CREATE INDEX IF NOT EXISTS idx_privy_users_wallet ON privy_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_privy_users_active ON privy_users(is_active, last_login);

-- Enable RLS on privy_users if not already enabled
ALTER TABLE privy_users ENABLE ROW LEVEL SECURITY;

-- Add indexes for existing privy_user_id columns (safe - will skip if exists)
CREATE INDEX IF NOT EXISTS idx_user_tokens_privy_user_id ON user_tokens(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_privy_user_id ON token_transactions(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_privy_user_id ON ai_usage_sessions(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_user_token_earnings_privy_user_id ON user_token_earnings(privy_user_id);

-- =============================================
-- MISSING INTEGRATION TABLES (CREATE IF NOT EXISTS)
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

-- User Preferences with Privy support (if missing privy_user_id column)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_preferences' 
                 AND column_name = 'privy_user_id') THEN
    ALTER TABLE user_preferences ADD COLUMN privy_user_id TEXT;
  END IF;
END$$;

-- =============================================
-- CREATE INDEXES FOR NEW INTEGRATION TABLES
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

-- User preferences index (if column was added)
CREATE INDEX IF NOT EXISTS idx_user_preferences_privy_user_id ON user_preferences(privy_user_id);

-- =============================================
-- ENABLE RLS ON NEW TABLES
-- =============================================

-- Enable RLS on integration tables
ALTER TABLE github_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transaction_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_workouts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR NEW TABLES
-- =============================================

-- Helper function to get current Privy user ID (if not exists)
CREATE OR REPLACE FUNCTION get_current_privy_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_privy_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for GitHub integration
DROP POLICY IF EXISTS "Users can only access their own GitHub data" ON github_profiles;
CREATE POLICY "Users can only access their own GitHub data" ON github_profiles
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own repositories" ON github_repositories;
CREATE POLICY "Users can only access their own repositories" ON github_repositories
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own commits" ON github_commits;
CREATE POLICY "Users can only access their own commits" ON github_commits
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for Outlook integration
DROP POLICY IF EXISTS "Users can only access their own Outlook data" ON outlook_profiles;
CREATE POLICY "Users can only access their own Outlook data" ON outlook_profiles
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own emails" ON outlook_emails;
CREATE POLICY "Users can only access their own emails" ON outlook_emails
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own calendar events" ON outlook_calendar_events;
CREATE POLICY "Users can only access their own calendar events" ON outlook_calendar_events
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for Banking integration
DROP POLICY IF EXISTS "Users can only access their own banking data" ON bank_transaction_insights;
CREATE POLICY "Users can only access their own banking data" ON bank_transaction_insights
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- RLS policies for Fitness integration
DROP POLICY IF EXISTS "Users can only access their own fitness data" ON fitness_metrics;
CREATE POLICY "Users can only access their own fitness data" ON fitness_metrics
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can only access their own workouts" ON fitness_workouts;
CREATE POLICY "Users can only access their own workouts" ON fitness_workouts
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- =============================================
-- PRIVY-COMPATIBLE HELPER FUNCTIONS
-- =============================================

-- Function to create user tokens account when user signs up with Privy
CREATE OR REPLACE FUNCTION create_user_tokens_privy()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create tokens if they don't exist for this privy user
  INSERT INTO public.user_tokens (privy_user_id, balance, total_earned, wallet_type)
  VALUES (NEW.privy_id, 5000, 5000, 'privy') -- ₹500 starting credit
  ON CONFLICT (privy_user_id) DO NOTHING;
  
  -- Only log welcome bonus if no previous transactions exist for this user
  IF NOT EXISTS (SELECT 1 FROM token_transactions WHERE privy_user_id = NEW.privy_id) THEN
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new Privy users (safe - will replace if exists)
DROP TRIGGER IF EXISTS on_privy_user_created_tokens ON privy_users;
CREATE TRIGGER on_privy_user_created_tokens
  AFTER INSERT ON privy_users
  FOR EACH ROW EXECUTE FUNCTION create_user_tokens_privy();

-- =============================================
-- SAFE PRIVY MIGRATION COMPLETE
-- =============================================

-- This migration:
-- 1. Only adds missing integration tables
-- 2. Ensures indexes exist on all privy_user_id columns
-- 3. Sets up RLS policies for new tables only
-- 4. Creates safe trigger that won't duplicate data
-- 
-- This is safe to run multiple times and won't break existing data

SELECT 'Privy migration completed successfully!' as status;