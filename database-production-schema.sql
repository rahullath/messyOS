-- messyOS Production Database Schema
-- This schema supports multi-user functionality, customization, and security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- WAITLIST & USER MANAGEMENT
-- =============================================

-- Waitlist table for pre-launch signups
CREATE TABLE public.waitlist (
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
CREATE TABLE public.user_preferences (
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
-- CORE DATA TABLES (Enhanced for Multi-User)
-- =============================================

-- Enhanced habits table
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'General',
  type VARCHAR(10) CHECK (type IN ('build', 'break')),
  measurement_type VARCHAR(20) CHECK (measurement_type IN ('boolean', 'count', 'duration', 'rating')),
  target_value DECIMAL DEFAULT 1,
  target_unit VARCHAR(50) DEFAULT 'times',
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(50),
  streak_count INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit entries with enhanced tracking
CREATE TABLE public.habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  value DECIMAL NOT NULL,
  notes TEXT,
  effort INTEGER CHECK (effort BETWEEN 1 AND 5),
  duration INTEGER, -- in minutes
  completion_time TIME,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  mood INTEGER CHECK (mood BETWEEN 1 AND 5),
  location VARCHAR(100),
  weather VARCHAR(50),
  context JSONB,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE GENERATED ALWAYS AS (DATE(logged_at AT TIME ZONE 'UTC')) STORED,
  
  UNIQUE(habit_id, date)
);

-- Universal metrics table for flexible data storage
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'health', 'finance', 'productivity', etc.
  subcategory VARCHAR(50),
  metric_name VARCHAR(100) NOT NULL,
  value DECIMAL,
  text_value TEXT,
  json_value JSONB,
  unit VARCHAR(50),
  source VARCHAR(100), -- 'manual', 'import', 'api', 'ai_generated'
  confidence_score DECIMAL CHECK (confidence_score BETWEEN 0 AND 1),
  tags JSONB DEFAULT '[]',
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE GENERATED ALWAYS AS (DATE(recorded_at AT TIME ZONE 'UTC')) STORED
);

-- Enhanced tasks with project management features
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  project VARCHAR(100),
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes
  energy_required INTEGER CHECK (energy_required BETWEEN 1 AND 5),
  deadline TIMESTAMPTZ,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  tags JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- AI & INTELLIGENCE TABLES
-- =============================================

-- AI insights and recommendations
CREATE TABLE public.ai_insights (
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
CREATE TABLE public.ai_conversations (
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
-- INTEGRATIONS & CONNECTIONS
-- =============================================

-- External service connections
CREATE TABLE public.integrations (
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
CREATE TABLE public.import_logs (
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
-- SUBSCRIPTION & BILLING
-- =============================================

-- Subscription management
CREATE TABLE public.subscriptions (
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
CREATE TABLE public.transactions (
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
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Core indexes
CREATE INDEX idx_habits_user_active ON habits(user_id, is_active);
CREATE INDEX idx_habit_entries_user_date ON habit_entries(user_id, date DESC);
CREATE INDEX idx_habit_entries_habit_date ON habit_entries(habit_id, date DESC);
CREATE INDEX idx_metrics_user_category_date ON metrics(user_id, category, date DESC);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);

-- AI and insights indexes
CREATE INDEX idx_ai_insights_user_created ON ai_insights(user_id, created_at DESC);
CREATE INDEX idx_ai_insights_user_unread ON ai_insights(user_id, is_read, created_at DESC);
CREATE INDEX idx_ai_conversations_user_session ON ai_conversations(user_id, session_id, created_at);

-- Integration indexes
CREATE INDEX idx_integrations_user_service ON integrations(user_id, service_name);
CREATE INDEX idx_import_logs_user_status ON import_logs(user_id, status, created_at DESC);

-- Subscription indexes
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all user tables
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

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can only access their own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own habit entries" ON habit_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own metrics" ON metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own AI insights" ON ai_insights
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own AI conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own integrations" ON integrations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own import logs" ON import_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Waitlist is publicly readable for admin dashboard but only insertable
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

-- Apply to relevant tables
CREATE TRIGGER habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
  VALUES (NEW.id);
  
  INSERT INTO public.subscriptions (user_id, plan_type, status, trial_start, trial_end)
  VALUES (NEW.id, 'trial', 'active', NOW(), NOW() + INTERVAL '30 days');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();