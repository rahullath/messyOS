-- database/safe-privy-migration.sql - Safe Migration to Privy with User Preservation
-- This migration preserves existing Supabase auth.users and allows gradual transition

-- =============================================
-- STEP 1: Add Privy Integration Table
-- =============================================

-- Table to link existing Supabase users with Privy accounts
CREATE TABLE IF NOT EXISTS public.user_privy_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  privy_user_id TEXT UNIQUE NOT NULL, -- Privy DID
  email TEXT,
  phone TEXT,
  wallet_address TEXT,
  linked_accounts JSONB DEFAULT '[]'::jsonb,
  migration_status TEXT DEFAULT 'pending' CHECK (migration_status IN ('pending', 'migrated', 'verified')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one-to-one mapping
  UNIQUE(supabase_user_id),
  UNIQUE(privy_user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_privy_links_supabase_id ON user_privy_links(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_user_privy_links_privy_id ON user_privy_links(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_user_privy_links_email ON user_privy_links(email);

-- Enable RLS
ALTER TABLE user_privy_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own Privy links" ON user_privy_links
  FOR ALL USING (
    auth.uid() = supabase_user_id OR 
    current_setting('app.current_user_privy_id', true) = privy_user_id
  );

-- =============================================
-- STEP 2: Add Hybrid User ID Support
-- =============================================

-- Add optional privy_user_id columns to all existing tables (keeping existing user_id)
-- This allows both auth systems to work simultaneously

-- Core tables
ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE ai_usage_sessions ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE user_token_earnings ADD COLUMN IF NOT EXISTS privy_user_id TEXT;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS privy_user_id TEXT;

-- Integration tables
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
-- STEP 3: Hybrid Authentication Functions
-- =============================================

-- Function to get current user ID (works with both auth systems)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
  current_privy_id TEXT;
  linked_supabase_id UUID;
BEGIN
  -- First try Supabase auth
  IF auth.uid() IS NOT NULL THEN
    RETURN auth.uid();
  END IF;
  
  -- Then try Privy auth
  current_privy_id := current_setting('app.current_user_privy_id', true);
  IF current_privy_id IS NOT NULL AND current_privy_id != '' THEN
    -- Get linked Supabase user ID
    SELECT supabase_user_id INTO linked_supabase_id
    FROM user_privy_links
    WHERE privy_user_id = current_privy_id;
    
    RETURN linked_supabase_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current Privy user ID
CREATE OR REPLACE FUNCTION get_current_privy_user_id()
RETURNS TEXT AS $$
DECLARE
  current_privy_id TEXT;
  linked_privy_id TEXT;
BEGIN
  -- First try Privy setting
  current_privy_id := current_setting('app.current_user_privy_id', true);
  IF current_privy_id IS NOT NULL AND current_privy_id != '' THEN
    RETURN current_privy_id;
  END IF;
  
  -- Then try to get from Supabase user link
  IF auth.uid() IS NOT NULL THEN
    SELECT privy_user_id INTO linked_privy_id
    FROM user_privy_links
    WHERE supabase_user_id = auth.uid();
    
    RETURN linked_privy_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 4: Update RLS Policies for Hybrid Auth
-- =============================================

-- Update RLS policies to work with both auth systems
-- Example for user_tokens (repeat pattern for other tables)

DROP POLICY IF EXISTS "Users can only access their own token balance" ON user_tokens;
CREATE POLICY "Users can only access their own token balance" ON user_tokens
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    privy_user_id = get_current_privy_user_id()
  );

DROP POLICY IF EXISTS "Users can only access their own transactions" ON token_transactions;
CREATE POLICY "Users can only access their own transactions" ON token_transactions
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    privy_user_id = get_current_privy_user_id()
  );

DROP POLICY IF EXISTS "Users can only access their own usage sessions" ON ai_usage_sessions;
CREATE POLICY "Users can only access their own usage sessions" ON ai_usage_sessions
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    privy_user_id = get_current_privy_user_id()
  );

DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
CREATE POLICY "Users can manage their own preferences" ON user_preferences
  FOR ALL USING (
    user_id = get_current_user_id() OR 
    privy_user_id = get_current_privy_user_id()
  );

-- =============================================
-- STEP 5: Migration Helper Functions
-- =============================================

-- Function to link existing Supabase user with new Privy account
CREATE OR REPLACE FUNCTION link_user_with_privy(
  p_supabase_user_id UUID,
  p_privy_user_id TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_wallet_address TEXT DEFAULT NULL,
  p_linked_accounts JSONB DEFAULT '[]'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  existing_link user_privy_links%ROWTYPE;
BEGIN
  -- Check if link already exists
  SELECT * INTO existing_link FROM user_privy_links 
  WHERE supabase_user_id = p_supabase_user_id OR privy_user_id = p_privy_user_id;
  
  IF existing_link.id IS NOT NULL THEN
    -- Update existing link
    UPDATE user_privy_links SET
      privy_user_id = p_privy_user_id,
      email = COALESCE(p_email, email),
      phone = COALESCE(p_phone, phone),
      wallet_address = COALESCE(p_wallet_address, wallet_address),
      linked_accounts = p_linked_accounts,
      migration_status = 'migrated',
      updated_at = NOW()
    WHERE id = existing_link.id;
  ELSE
    -- Create new link
    INSERT INTO user_privy_links (
      supabase_user_id,
      privy_user_id,
      email,
      phone,
      wallet_address,
      linked_accounts,
      migration_status
    ) VALUES (
      p_supabase_user_id,
      p_privy_user_id,
      p_email,
      p_phone,
      p_wallet_address,
      p_linked_accounts,
      'migrated'
    );
  END IF;
  
  -- Copy data to privy_user_id columns
  PERFORM migrate_user_data_to_privy(p_supabase_user_id, p_privy_user_id);
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate user data from user_id to privy_user_id columns
CREATE OR REPLACE FUNCTION migrate_user_data_to_privy(
  p_supabase_user_id UUID,
  p_privy_user_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update all tables with privy_user_id where user_id matches
  UPDATE user_tokens SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE token_transactions SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE ai_usage_sessions SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE user_token_earnings SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE user_preferences SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  
  -- Integration tables
  UPDATE github_profiles SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE github_repositories SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE github_commits SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE outlook_profiles SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE outlook_emails SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE outlook_calendar_events SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE bank_transaction_insights SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE fitness_metrics SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE fitness_workouts SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE ai_conversations SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  UPDATE ai_actions SET privy_user_id = p_privy_user_id WHERE user_id = p_supabase_user_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user needs migration
CREATE OR REPLACE FUNCTION user_needs_migration(p_email TEXT)
RETURNS TABLE(
  supabase_user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  already_linked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    (l.id IS NOT NULL) as already_linked
  FROM auth.users u
  LEFT JOIN user_privy_links l ON l.supabase_user_id = u.id
  WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 6: Triggers for Automatic Data Sync
-- =============================================

-- Trigger to automatically sync new data to both user_id and privy_user_id
CREATE OR REPLACE FUNCTION sync_user_data_trigger()
RETURNS TRIGGER AS $$
DECLARE
  linked_privy_id TEXT;
  linked_supabase_id UUID;
BEGIN
  -- If inserting with user_id, also set privy_user_id if linked
  IF NEW.user_id IS NOT NULL AND (NEW.privy_user_id IS NULL OR NEW.privy_user_id = '') THEN
    SELECT privy_user_id INTO linked_privy_id
    FROM user_privy_links
    WHERE supabase_user_id = NEW.user_id;
    
    IF linked_privy_id IS NOT NULL THEN
      NEW.privy_user_id := linked_privy_id;
    END IF;
  END IF;
  
  -- If inserting with privy_user_id, also set user_id if linked
  IF NEW.privy_user_id IS NOT NULL AND NEW.privy_user_id != '' AND NEW.user_id IS NULL THEN
    SELECT supabase_user_id INTO linked_supabase_id
    FROM user_privy_links
    WHERE privy_user_id = NEW.privy_user_id;
    
    IF linked_supabase_id IS NOT NULL THEN
      NEW.user_id := linked_supabase_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply sync trigger to key tables
DROP TRIGGER IF EXISTS sync_user_tokens_trigger ON user_tokens;
CREATE TRIGGER sync_user_tokens_trigger
  BEFORE INSERT OR UPDATE ON user_tokens
  FOR EACH ROW EXECUTE FUNCTION sync_user_data_trigger();

DROP TRIGGER IF EXISTS sync_token_transactions_trigger ON token_transactions;
CREATE TRIGGER sync_token_transactions_trigger
  BEFORE INSERT OR UPDATE ON token_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_user_data_trigger();

-- =============================================
-- STEP 7: Create Initial Migration Data
-- =============================================

-- This will be populated by the migration API endpoint
-- Example: Find existing users who might want to migrate
CREATE OR REPLACE VIEW migration_candidates AS
SELECT 
  u.id as supabase_user_id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  CASE WHEN l.id IS NOT NULL THEN 'already_linked' ELSE 'needs_migration' END as status,
  l.privy_user_id,
  l.migration_status
FROM auth.users u
LEFT JOIN user_privy_links l ON l.supabase_user_id = u.id
ORDER BY u.last_sign_in_at DESC NULLS LAST;

-- Grant access to the view
GRANT SELECT ON migration_candidates TO authenticated;