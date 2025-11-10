-- Supabase-Only Migration SQL
-- Clean migration for pure Supabase authentication with simulated wallet

-- Step 1: Add simulated wallet columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS simulated_wallet_address TEXT,
ADD COLUMN IF NOT EXISTS wallet_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferred_theme TEXT DEFAULT 'dark';

-- Step 2: Ensure user_tokens table uses user_id (Supabase UUID)
-- Add user_id column if it doesn't exist and create index
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_tokens' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE user_tokens ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Step 3: Update token_transactions table to use user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'token_transactions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE token_transactions ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);

-- Step 4: Update user_preferences table to use user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE user_preferences ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Step 5: Update integration tables to use user_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'github_profiles' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE github_profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'outlook_profiles' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE outlook_profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'fitness_metrics' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE fitness_metrics ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_transaction_insights' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE bank_transaction_insights ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Create indexes for integration tables
CREATE INDEX IF NOT EXISTS idx_github_profiles_user_id ON github_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_profiles_user_id ON outlook_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_metrics_user_id ON fitness_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transaction_insights_user_id ON bank_transaction_insights(user_id);

-- Step 6: Update RLS policies for Supabase auth.uid()

-- Profiles RLS
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- User tokens RLS
DROP POLICY IF EXISTS "Users can view own tokens" ON user_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON user_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON user_tokens;

CREATE POLICY "Users can view own tokens" ON user_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON user_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Token transactions RLS
DROP POLICY IF EXISTS "Users can view own transactions" ON token_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON token_transactions;

CREATE POLICY "Users can view own transactions" ON token_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON token_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User preferences RLS
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Integration tables RLS (GitHub)
DROP POLICY IF EXISTS "Users can view own github profile" ON github_profiles;
DROP POLICY IF EXISTS "Users can update own github profile" ON github_profiles;
DROP POLICY IF EXISTS "Users can insert own github profile" ON github_profiles;

CREATE POLICY "Users can view own github profile" ON github_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own github profile" ON github_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own github profile" ON github_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Integration tables RLS (Outlook)
DROP POLICY IF EXISTS "Users can view own outlook profile" ON outlook_profiles;
DROP POLICY IF EXISTS "Users can update own outlook profile" ON outlook_profiles;
DROP POLICY IF EXISTS "Users can insert own outlook profile" ON outlook_profiles;

CREATE POLICY "Users can view own outlook profile" ON outlook_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own outlook profile" ON outlook_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outlook profile" ON outlook_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Integration tables RLS (Fitness)
DROP POLICY IF EXISTS "Users can view own fitness metrics" ON fitness_metrics;
DROP POLICY IF EXISTS "Users can insert own fitness metrics" ON fitness_metrics;

CREATE POLICY "Users can view own fitness metrics" ON fitness_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fitness metrics" ON fitness_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Integration tables RLS (Banking)
DROP POLICY IF EXISTS "Users can view own bank insights" ON bank_transaction_insights;
DROP POLICY IF EXISTS "Users can insert own bank insights" ON bank_transaction_insights;

CREATE POLICY "Users can view own bank insights" ON bank_transaction_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank insights" ON bank_transaction_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 7: Create function to generate simulated wallet address
CREATE OR REPLACE FUNCTION generate_simulated_wallet_address()
RETURNS TEXT AS $$
BEGIN
  RETURN '0x' || encode(gen_random_bytes(20), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to initialize new user with simulated wallet and tokens
CREATE OR REPLACE FUNCTION initialize_user_wallet_and_tokens(user_id UUID)
RETURNS VOID AS $$
DECLARE
  wallet_address TEXT;
BEGIN
  -- Generate simulated wallet address
  wallet_address := generate_simulated_wallet_address();
  
  -- Update profile with simulated wallet
  UPDATE profiles 
  SET 
    simulated_wallet_address = wallet_address,
    wallet_created_at = NOW()
  WHERE id = user_id;
  
  -- Initialize token balance (₹500 = 5000 tokens)
  INSERT INTO user_tokens (user_id, balance, total_earned, total_spent, wallet_type)
  VALUES (user_id, 5000, 5000, 0, 'simulated')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Log welcome bonus transaction
  INSERT INTO token_transactions (
    user_id, transaction_type, amount, description, 
    balance_before, balance_after, metadata
  ) VALUES (
    user_id, 'bonus', 5000, 'Welcome to meshOS! ₹500 starting credit',
    0, 5000, jsonb_build_object(
      'bonus_type', 'welcome',
      'amount_inr', 500,
      'wallet_address', wallet_address
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger to initialize new users automatically
CREATE OR REPLACE FUNCTION create_user_profile_and_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Initialize wallet and tokens
  PERFORM initialize_user_wallet_and_tokens(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_user_profile_and_wallet_trigger') THEN
    CREATE TRIGGER create_user_profile_and_wallet_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_profile_and_wallet();
  END IF;
END $$;

-- Step 10: Create enhanced user dashboard view
CREATE OR REPLACE VIEW user_dashboard_view AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.full_name,
  p.avatar_url,
  p.simulated_wallet_address,
  p.wallet_created_at,
  p.preferred_theme,
  COALESCE(t.balance, 0) as token_balance,
  COALESCE(t.total_earned, 0) as total_earned,
  COALESCE(t.total_spent, 0) as total_spent,
  CASE WHEN g.id IS NOT NULL THEN TRUE ELSE FALSE END as github_connected,
  CASE WHEN o.id IS NOT NULL THEN TRUE ELSE FALSE END as outlook_connected,
  CASE WHEN f.id IS NOT NULL THEN TRUE ELSE FALSE END as fitness_connected,
  CASE WHEN b.id IS NOT NULL THEN TRUE ELSE FALSE END as banking_connected
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_tokens t ON u.id = t.user_id
LEFT JOIN github_profiles g ON u.id = g.user_id
LEFT JOIN outlook_profiles o ON u.id = o.user_id
LEFT JOIN fitness_metrics f ON u.id = f.user_id
LEFT JOIN bank_transaction_insights b ON u.id = b.user_id;

-- Grant access to the view
GRANT SELECT ON user_dashboard_view TO authenticated;

-- Note: RLS policies cannot be created on views, only on tables
-- The security is handled through the underlying tables' policies

-- Step 11: Create function for token spending analytics
CREATE OR REPLACE FUNCTION get_user_spending_analytics(
  user_id_param UUID,
  days_param INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_spent NUMERIC,
  service_breakdown JSONB,
  average_daily NUMERIC,
  top_services JSONB
) AS $$
DECLARE
  since_date TIMESTAMP;
BEGIN
  since_date := NOW() - (days_param || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH spending_data AS (
    SELECT 
      ABS(amount) as spent_amount,
      metadata->>'service_type' as service_type,
      created_at
    FROM token_transactions 
    WHERE user_id = user_id_param 
      AND transaction_type = 'deduction'
      AND created_at >= since_date
  ),
  service_totals AS (
    SELECT 
      COALESCE(service_type, 'other') as service,
      SUM(spent_amount) as total
    FROM spending_data
    GROUP BY service_type
  ),
  analytics AS (
    SELECT 
      COALESCE(SUM(spent_amount), 0) as total_spent,
      COALESCE(SUM(spent_amount), 0) / days_param as avg_daily
    FROM spending_data
  )
  SELECT 
    a.total_spent,
    COALESCE(jsonb_object_agg(st.service, st.total), '{}'::jsonb) as service_breakdown,
    a.avg_daily,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('service', st.service, 'amount', st.total)
        ORDER BY st.total DESC
      ) FILTER (WHERE st.service IS NOT NULL),
      '[]'::jsonb
    ) as top_services
  FROM analytics a
  CROSS JOIN service_totals st
  GROUP BY a.total_spent, a.avg_daily;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Add comments for documentation
COMMENT ON TABLE profiles IS 'User profiles with simulated Web3 wallet addresses';
COMMENT ON COLUMN profiles.simulated_wallet_address IS 'Generated wallet address for Web3-like experience (not real blockchain)';
COMMENT ON COLUMN profiles.wallet_created_at IS 'Timestamp when simulated wallet was created';
COMMENT ON COLUMN profiles.preferred_theme IS 'User interface theme preference';

COMMENT ON VIEW user_dashboard_view IS 'Comprehensive user dashboard combining auth, profile, tokens, and integrations';
COMMENT ON FUNCTION generate_simulated_wallet_address IS 'Generates a realistic-looking Ethereum-style wallet address';
COMMENT ON FUNCTION initialize_user_wallet_and_tokens IS 'Sets up new users with simulated wallet and starting token balance';

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(simulated_wallet_address) WHERE simulated_wallet_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);

-- Final: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;