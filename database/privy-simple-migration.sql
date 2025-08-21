-- database/privy-simple-migration.sql - Simple Step-by-Step Privy Migration
-- Run this step by step to avoid dependency issues

-- =============================================
-- STEP 1: CREATE PRIVY USERS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.privy_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  wallet_address TEXT,
  linked_accounts JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_privy_users_privy_id ON privy_users(privy_id);
CREATE INDEX IF NOT EXISTS idx_privy_users_email ON privy_users(email);

-- =============================================
-- STEP 2: ADD PRIVY_USER_ID TO EXISTING TABLES
-- =============================================

-- Check if tables exist before altering them
DO $$
BEGIN
    -- Add privy_user_id to user_tokens if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_tokens') THEN
        ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_user_tokens_privy_user_id ON user_tokens(privy_user_id);
    END IF;

    -- Add privy_user_id to token_transactions if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'token_transactions') THEN
        ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_token_transactions_privy_user_id ON token_transactions(privy_user_id);
    END IF;

    -- Add privy_user_id to ai_usage_sessions if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_usage_sessions') THEN
        ALTER TABLE ai_usage_sessions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_ai_usage_sessions_privy_user_id ON ai_usage_sessions(privy_user_id);
    END IF;

    -- Add privy_user_id to user_token_earnings if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_token_earnings') THEN
        ALTER TABLE user_token_earnings ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
    END IF;
END $$;

-- =============================================
-- STEP 3: CREATE BASIC REQUIRED TABLES IF THEY DON'T EXIST
-- =============================================

-- Create user_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT UNIQUE,
  balance INTEGER DEFAULT 5000 NOT NULL CHECK (balance >= 0),
  privy_wallet_address TEXT,
  wallet_type VARCHAR(50) DEFAULT 'privy',
  total_earned INTEGER DEFAULT 5000 NOT NULL,
  total_spent INTEGER DEFAULT 0 NOT NULL,
  last_transaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create token_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'refund', 'bonus', 'purchase')),
  amount INTEGER NOT NULL,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_usage_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_usage_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  response_tokens INTEGER DEFAULT 0,
  actions_executed INTEGER DEFAULT 0,
  total_token_cost INTEGER DEFAULT 0,
  deducted BOOLEAN DEFAULT FALSE,
  session_type VARCHAR(50) DEFAULT 'chat',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STEP 4: CREATE INTEGRATION TABLES
-- =============================================

-- User Preferences
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

-- AI Conversations
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

-- AI Actions
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

-- =============================================
-- STEP 5: SIMPLE HELPER FUNCTIONS
-- =============================================

-- Helper function to get current Privy user ID
CREATE OR REPLACE FUNCTION get_current_privy_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_privy_id', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function to initialize user tokens
CREATE OR REPLACE FUNCTION initialize_user_tokens(p_privy_user_id TEXT, p_wallet_address TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insert or update user tokens
  INSERT INTO user_tokens (privy_user_id, balance, total_earned, privy_wallet_address)
  VALUES (p_privy_user_id, 5000, 5000, p_wallet_address)
  ON CONFLICT (privy_user_id) DO UPDATE SET
    privy_wallet_address = COALESCE(EXCLUDED.privy_wallet_address, user_tokens.privy_wallet_address),
    updated_at = NOW();

  -- Log welcome transaction
  INSERT INTO token_transactions (
    privy_user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after,
    metadata
  ) VALUES (
    p_privy_user_id,
    'bonus',
    5000,
    'Welcome to meshOS! ₹500 starting credit',
    0,
    5000,
    '{"bonus_type": "welcome", "amount_inr": 500}'::jsonb
  ) ON CONFLICT DO NOTHING;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function to deduct tokens
CREATE OR REPLACE FUNCTION simple_deduct_tokens(
  p_privy_user_id TEXT,
  p_amount INTEGER,
  p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM user_tokens
  WHERE privy_user_id = p_privy_user_id;
  
  -- Check if user exists and has sufficient balance
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - p_amount;
  
  -- Update balance
  UPDATE user_tokens
  SET 
    balance = new_balance,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE privy_user_id = p_privy_user_id;
  
  -- Log transaction
  INSERT INTO token_transactions (
    privy_user_id,
    transaction_type,
    amount,
    description,
    balance_before,
    balance_after
  ) VALUES (
    p_privy_user_id,
    'spend',
    -p_amount,
    p_description,
    current_balance,
    new_balance
  );
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 6: BASIC RLS SETUP
-- =============================================

-- Enable RLS on core tables
ALTER TABLE privy_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
DROP POLICY IF EXISTS "Users can read own profile" ON privy_users;
CREATE POLICY "Users can read own profile" ON privy_users
  FOR ALL USING (privy_id = get_current_privy_user_id());

DROP POLICY IF EXISTS "Users can access own tokens" ON user_tokens;
CREATE POLICY "Users can access own tokens" ON user_tokens
  FOR ALL USING (privy_user_id = get_current_privy_user_id() OR privy_user_id IS NULL);

DROP POLICY IF EXISTS "Users can access own transactions" ON token_transactions;
CREATE POLICY "Users can access own transactions" ON token_transactions
  FOR ALL USING (privy_user_id = get_current_privy_user_id() OR privy_user_id IS NULL);

DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (privy_user_id = get_current_privy_user_id());

-- =============================================
-- SIMPLE PRIVY MIGRATION COMPLETE
-- =============================================

-- Test the setup
SELECT 'Privy migration completed successfully!' as status;