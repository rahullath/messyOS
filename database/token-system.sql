-- database/token-system.sql - Messy Tokens System Schema
-- Creates tables for off-chain token economy with Privy wallet integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MESSY TOKENS SYSTEM TABLES
-- =============================================

-- User token balances and wallet information
CREATE TABLE IF NOT EXISTS public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Token balance (integer, 10 tokens = ₹1)
  balance INTEGER DEFAULT 5000 NOT NULL CHECK (balance >= 0), -- ₹500 starting credit
  
  -- Wallet information (Privy integration)
  privy_wallet_address TEXT,
  privy_user_id TEXT,
  wallet_type VARCHAR(50) DEFAULT 'privy',
  
  -- Usage tracking
  total_earned INTEGER DEFAULT 5000 NOT NULL, -- Total tokens ever earned
  total_spent INTEGER DEFAULT 0 NOT NULL, -- Total tokens ever spent
  
  -- Metadata
  last_transaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Token transaction history for transparency
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'refund', 'bonus', 'purchase')),
  amount INTEGER NOT NULL, -- Positive for earn/purchase, negative for spend
  
  -- Related entity information
  related_entity_type VARCHAR(50), -- 'ai_chat', 'task_creation', 'habit_log', 'premium_feature'
  related_entity_id UUID, -- ID of the chat session, task, etc.
  
  -- Description and metadata
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  
  -- Balance tracking
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token pricing and packages (for future Stripe integration)
CREATE TABLE IF NOT EXISTS public.token_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Package details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  token_amount INTEGER NOT NULL,
  price_inr INTEGER NOT NULL, -- Price in paise (₹1 = 100 paise)
  
  -- Bonus tokens for larger packages
  bonus_tokens INTEGER DEFAULT 0,
  
  -- Package metadata
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 1,
  
  -- Stripe integration
  stripe_price_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage sessions for batch token deduction
CREATE TABLE IF NOT EXISTS public.ai_usage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session details
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  
  -- Usage metrics
  message_count INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  actions_executed INTEGER DEFAULT 0,
  
  -- Token calculation
  total_token_cost INTEGER DEFAULT 0,
  deducted BOOLEAN DEFAULT FALSE,
  
  -- Session metadata
  session_type VARCHAR(50) DEFAULT 'chat', -- 'chat', 'briefing', 'optimization'
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token earning opportunities (daily bonuses, achievements, etc.)
CREATE TABLE IF NOT EXISTS public.token_earning_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Opportunity details
  opportunity_type VARCHAR(50) NOT NULL, -- 'daily_login', 'first_habit', 'streak_bonus', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Reward details
  token_reward INTEGER NOT NULL,
  max_claims_per_user INTEGER DEFAULT 1, -- NULL for unlimited
  
  -- Conditions
  conditions JSONB DEFAULT '{}', -- JSON conditions for earning
  
  -- Availability
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress on earning opportunities
CREATE TABLE IF NOT EXISTS public.user_token_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES token_earning_opportunities(id) ON DELETE CASCADE,
  
  -- Earning details
  tokens_earned INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Progress tracking
  progress_data JSONB DEFAULT '{}',
  
  UNIQUE(user_id, opportunity_id, claimed_at::date) -- Prevent duplicate daily claims
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Token balances and transactions
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_entity ON token_transactions(related_entity_type, related_entity_id);

-- AI usage sessions
CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_user_id ON ai_usage_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_deducted ON ai_usage_sessions(deducted, created_at DESC);

-- Token earnings
CREATE INDEX IF NOT EXISTS idx_user_token_earnings_user_id ON user_token_earnings(user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_opportunities_active ON token_earning_opportunities(is_active, start_date, end_date);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all token tables
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_token_earnings ENABLE ROW LEVEL SECURITY;

-- Token balance policies
DROP POLICY IF EXISTS "Users can only access their own token balance" ON user_tokens;
CREATE POLICY "Users can only access their own token balance" ON user_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Transaction history policies
DROP POLICY IF EXISTS "Users can only access their own transactions" ON token_transactions;
CREATE POLICY "Users can only access their own transactions" ON token_transactions
  FOR ALL USING (auth.uid() = user_id);

-- AI usage session policies
DROP POLICY IF EXISTS "Users can only access their own usage sessions" ON ai_usage_sessions;
CREATE POLICY "Users can only access their own usage sessions" ON ai_usage_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Token earning policies
DROP POLICY IF EXISTS "Users can only access their own earnings" ON user_token_earnings;
CREATE POLICY "Users can only access their own earnings" ON user_token_earnings
  FOR ALL USING (auth.uid() = user_id);

-- Public read access to token packages and opportunities
DROP POLICY IF EXISTS "Anyone can view token packages" ON token_packages;
CREATE POLICY "Anyone can view token packages" ON token_packages
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Anyone can view earning opportunities" ON token_earning_opportunities;
CREATE POLICY "Anyone can view earning opportunities" ON token_earning_opportunities
  FOR SELECT USING (is_active = TRUE);

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

-- Add updated_at triggers
DROP TRIGGER IF EXISTS user_tokens_updated_at ON user_tokens;
CREATE TRIGGER user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS token_packages_updated_at ON token_packages;
CREATE TRIGGER token_packages_updated_at
  BEFORE UPDATE ON token_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS ai_usage_sessions_updated_at ON ai_usage_sessions;
CREATE TRIGGER ai_usage_sessions_updated_at
  BEFORE UPDATE ON ai_usage_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Insert default token packages
INSERT INTO token_packages (name, description, token_amount, price_inr, bonus_tokens, display_order) VALUES
  ('Starter Pack', '1000 tokens for light AI usage', 1000, 10000, 0, 1), -- ₹100
  ('Power User', '5000 tokens + 500 bonus', 5000, 45000, 500, 2), -- ₹450 (10% bonus)
  ('Pro Pack', '10000 tokens + 1500 bonus', 10000, 85000, 1500, 3), -- ₹850 (15% bonus)
  ('Ultimate', '25000 tokens + 5000 bonus', 25000, 200000, 5000, 4) -- ₹2000 (20% bonus)
ON CONFLICT DO NOTHING;

-- Insert earning opportunities
INSERT INTO token_earning_opportunities (opportunity_type, name, description, token_reward, max_claims_per_user) VALUES
  ('daily_login', 'Daily Login Bonus', 'Get 50 tokens for logging in daily', 50, NULL),
  ('first_habit', 'First Habit Bonus', 'Get 100 tokens for logging your first habit', 100, 1),
  ('chat_streak', '7-Day Chat Streak', 'Get 300 tokens for chatting with AI 7 days in a row', 300, 1),
  ('complete_onboarding', 'Welcome Bonus', 'Get 200 tokens for completing onboarding', 200, 1),
  ('invite_friend', 'Referral Bonus', 'Get 500 tokens for each friend you invite', 500, NULL)
ON CONFLICT DO NOTHING;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to create user tokens account when user signs up
CREATE OR REPLACE FUNCTION create_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_tokens (user_id, balance, total_earned)
  VALUES (NEW.id, 5000, 5000) -- ₹500 starting credit
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log the welcome bonus transaction
  INSERT INTO public.token_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    related_entity_type,
    metadata
  ) VALUES (
    NEW.id,
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

-- Trigger to create tokens account on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_tokens ON auth.users;
CREATE TRIGGER on_auth_user_created_tokens
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_tokens();

-- Function to safely deduct tokens with validation
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_user_id UUID,
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
  WHERE user_id = p_user_id
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
  WHERE user_id = p_user_id;
  
  -- Log the transaction
  INSERT INTO token_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    p_user_id,
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

-- Function to add tokens (for purchases, bonuses, etc.)
CREATE OR REPLACE FUNCTION add_tokens(
  p_user_id UUID,
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
  WHERE user_id = p_user_id
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
  WHERE user_id = p_user_id;
  
  -- Log the transaction
  INSERT INTO token_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    p_user_id,
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
-- TOKEN SYSTEM READY
-- =============================================

-- This migration creates:
-- 1. User token balances with ₹500 starting credit
-- 2. Complete transaction history for transparency  
-- 3. AI usage session tracking for batch deduction
-- 4. Token earning opportunities and achievements
-- 5. Ready-to-use helper functions for token operations
-- 6. Proper RLS policies for security
-- 
-- Integration points:
-- - Privy wallet addresses stored in user_tokens
-- - AI chat sessions linked for token deduction
-- - Stripe integration ready with token packages
-- - Achievement system for user engagement