-- Global Expense Tracking System Migration
-- Supports international users with special UK features

-- Step 1: Create currencies table for global support
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY, -- 'USD', 'GBP', 'INR', 'EUR', etc.
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create exchange rates table for conversions
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT REFERENCES currencies(code),
  to_currency TEXT REFERENCES currencies(code),
  rate DECIMAL(12,6) NOT NULL,
  date DATE NOT NULL,
  source TEXT DEFAULT 'api', -- 'api', 'manual', 'cached'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(from_currency, to_currency, date)
);

-- Step 3: Create expense categories with global applicability
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  parent_id UUID REFERENCES expense_categories(id),
  is_system BOOLEAN DEFAULT false, -- System categories can't be deleted
  is_active BOOLEAN DEFAULT true,
  
  -- Country-specific features
  country_code TEXT, -- NULL = global, 'UK' = UK-specific, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create user expense settings
CREATE TABLE IF NOT EXISTS user_expense_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- User location and currency preferences
  primary_currency TEXT REFERENCES currencies(code) DEFAULT 'USD',
  secondary_currency TEXT REFERENCES currencies(code), -- For comparison (e.g., INR for UK users)
  country_code TEXT, -- 'UK', 'US', 'IN', etc.
  timezone TEXT DEFAULT 'UTC',
  
  -- Budgeting preferences
  monthly_budget DECIMAL(10,2),
  budget_start_day INTEGER DEFAULT 1, -- 1st of month
  
  -- UK-specific features
  is_uk_user BOOLEAN DEFAULT false,
  uk_postcode TEXT,
  uk_bank_name TEXT,
  
  -- Alert preferences  
  enable_price_alerts BOOLEAN DEFAULT true,
  price_alert_threshold DECIMAL(5,2) DEFAULT 20.0, -- Alert if 20% above average
  enable_budget_alerts BOOLEAN DEFAULT true,
  budget_alert_threshold DECIMAL(5,2) DEFAULT 80.0, -- Alert at 80% of budget
  
  -- First month tracking (for new country residents)
  is_first_month_tracking BOOLEAN DEFAULT false,
  first_month_start_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Step 5: Create bank accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Account info
  account_name TEXT NOT NULL,
  bank_name TEXT,
  account_number_masked TEXT, -- Last 4 digits only for security
  account_type TEXT DEFAULT 'checking', -- 'checking', 'savings', 'credit'
  currency TEXT REFERENCES currencies(code) DEFAULT 'USD',
  
  -- UK-specific fields
  sort_code TEXT, -- UK sort codes
  bank_format TEXT, -- 'barclays', 'hsbc', 'santander', 'generic'
  
  -- Account status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create main expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  
  -- Transaction details
  transaction_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL, -- Always positive, type indicates debit/credit
  currency TEXT REFERENCES currencies(code) NOT NULL,
  transaction_type TEXT DEFAULT 'debit', -- 'debit', 'credit'
  
  -- Merchant and description
  merchant_name TEXT,
  description TEXT NOT NULL,
  original_description TEXT, -- Raw bank description
  
  -- Categorization
  category_id UUID REFERENCES expense_categories(id),
  subcategory TEXT,
  
  -- Auto-categorization info
  auto_categorized BOOLEAN DEFAULT false,
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  
  -- Location data (if available)
  location_data JSONB, -- {lat, lng, address, city, country}
  
  -- Currency conversion
  amount_primary_currency DECIMAL(10,2), -- Amount in user's primary currency
  amount_secondary_currency DECIMAL(10,2), -- Amount in secondary currency (for comparison)
  exchange_rate_used DECIMAL(8,4),
  
  -- Price analysis
  is_above_average BOOLEAN DEFAULT false,
  price_difference_percentage DECIMAL(5,2), -- How much above/below average
  average_for_category DECIMAL(10,2), -- Running average for this category
  
  -- Import tracking
  import_source TEXT, -- 'csv_upload', 'bank_api', 'manual', 'receipt_scan'
  import_batch_id UUID, -- Group related imports
  original_file_name TEXT,
  
  -- Tags and notes
  tags TEXT[], -- User-defined tags
  notes TEXT, -- User notes
  receipt_url TEXT, -- Link to receipt image
  
  -- UK-specific features
  uk_merchant_postcode TEXT,
  uk_price_comparison JSONB, -- Comparison with other UK regions
  
  -- Nutrition integration (for grocery expenses)
  linked_nutrition_log_id UUID, -- Link to food_logs table if applicable
  estimated_nutrition_value DECIMAL(5,2), -- Estimated nutrition cost per £
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 7: Create merchant intelligence table
CREATE TABLE IF NOT EXISTS merchant_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name_cleaned TEXT NOT NULL,
  
  -- Category prediction
  predicted_category_id UUID REFERENCES expense_categories(id),
  category_confidence DECIMAL(3,2),
  
  -- Merchant info
  merchant_type TEXT, -- 'grocery', 'restaurant', 'gas_station', etc.
  chain_name TEXT, -- 'Tesco', 'Starbucks', etc.
  
  -- Location patterns
  common_locations JSONB, -- Array of common cities/areas
  is_uk_specific BOOLEAN DEFAULT false,
  
  -- Pattern matching rules
  name_patterns TEXT[], -- Different ways this merchant appears
  description_keywords TEXT[], -- Keywords that identify this merchant
  
  -- Statistics
  transaction_count INTEGER DEFAULT 0,
  average_amount DECIMAL(8,2),
  last_seen TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(merchant_name_cleaned)
);

-- Step 8: Create spending patterns analysis table
CREATE TABLE IF NOT EXISTS spending_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type TEXT NOT NULL, -- 'weekly', 'monthly', 'seasonal', 'location-based'
  category_id UUID REFERENCES expense_categories(id),
  
  -- Pattern data
  pattern_data JSONB NOT NULL, -- Flexible structure for different patterns
  confidence_score DECIMAL(3,2),
  
  -- Time period
  analysis_start_date DATE,
  analysis_end_date DATE,
  
  -- Insights generated
  insights TEXT[],
  recommendations TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 9: Create budget tracking table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Budget details
  name TEXT NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  
  -- Budget amounts
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT REFERENCES currencies(code) NOT NULL,
  period_type TEXT DEFAULT 'monthly', -- 'weekly', 'monthly', 'yearly'
  
  -- Period tracking
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Progress tracking
  spent_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2),
  percentage_used DECIMAL(5,2) DEFAULT 0,
  
  -- Alerts
  alert_thresholds DECIMAL[] DEFAULT '{50, 80, 100}', -- Alert at 50%, 80%, 100%
  last_alert_sent TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_exceeded BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_merchant ON expenses(merchant_name);
CREATE INDEX IF NOT EXISTS idx_expenses_amount ON expenses(amount);
CREATE INDEX IF NOT EXISTS idx_expenses_import_batch ON expenses(import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(from_currency, to_currency, date DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_intelligence_name ON merchant_intelligence(merchant_name_cleaned);
CREATE INDEX IF NOT EXISTS idx_spending_patterns_user ON spending_patterns(user_id, pattern_type);

-- Step 11: Create RLS policies
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_expense_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Public read access for currencies and categories
CREATE POLICY "Anyone can view currencies" ON currencies FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view exchange rates" ON exchange_rates FOR SELECT USING (true);
CREATE POLICY "Anyone can view expense categories" ON expense_categories FOR SELECT USING (is_active = true);

-- User-specific policies
CREATE POLICY "Users can manage own expense settings" ON user_expense_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bank accounts" ON bank_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view spending patterns" ON spending_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

-- Merchant intelligence - read for all, write for system
CREATE POLICY "Anyone can view merchant intelligence" ON merchant_intelligence FOR SELECT USING (true);

-- Step 12: Insert default data

-- Default currencies
INSERT INTO currencies (code, name, symbol) VALUES
('USD', 'US Dollar', '$'),
('GBP', 'British Pound', '£'),
('EUR', 'Euro', '€'),
('INR', 'Indian Rupee', '₹'),
('CAD', 'Canadian Dollar', 'C$'),
('AUD', 'Australian Dollar', 'A$'),
('JPY', 'Japanese Yen', '¥'),
('CHF', 'Swiss Franc', 'CHF'),
('CNY', 'Chinese Yuan', '¥'),
('SGD', 'Singapore Dollar', 'S$')
ON CONFLICT (code) DO NOTHING;

-- Default global expense categories
INSERT INTO expense_categories (name, icon, color, is_system) VALUES
-- Essential categories
('Food & Dining', '🍽️', '#10b981', true),
('Transportation', '🚗', '#3b82f6', true),
('Shopping', '🛍️', '#8b5cf6', true),
('Bills & Utilities', '⚡', '#f59e0b', true),
('Healthcare', '🏥', '#ef4444', true),
('Entertainment', '🎬', '#ec4899', true),
('Travel', '✈️', '#06b6d4', true),
('Education', '📚', '#84cc16', true),
('Personal Care', '💅', '#f97316', true),
('Home & Garden', '🏠', '#6b7280', true),
('Investments', '📈', '#059669', true),
('Insurance', '🛡️', '#7c3aed', true),
('Gifts & Donations', '🎁', '#be185d', true),
('Business', '💼', '#1f2937', true),
('Other', '📝', '#6b7280', true)
ON CONFLICT DO NOTHING;

-- UK-specific categories
INSERT INTO expense_categories (name, icon, color, is_system, country_code) VALUES
('Council Tax', '🏛️', '#7c2d12', true, 'UK'),
('TV Licence', '📺', '#1e40af', true, 'UK'),
('Congestion Charge', '🚗', '#dc2626', true, 'UK'),
('Oyster/TfL', '🚇', '#0ea5e9', true, 'UK'),
('NHS Prescriptions', '💊', '#059669', true, 'UK'),
('Pub & Drinks', '🍻', '#a16207', true, 'UK'),
('Charity Shop', '♻️', '#15803d', true, 'UK')
ON CONFLICT DO NOTHING;

-- Step 13: Create utility functions

-- Function to get user's primary currency
CREATE OR REPLACE FUNCTION get_user_primary_currency(user_id_param UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(ues.primary_currency, 'USD')
    FROM user_expense_settings ues
    WHERE ues.user_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to convert currency
CREATE OR REPLACE FUNCTION convert_currency(
  amount_param DECIMAL,
  from_currency_param TEXT,
  to_currency_param TEXT,
  date_param DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
  conversion_rate DECIMAL;
  converted_amount DECIMAL;
BEGIN
  -- If same currency, return original amount
  IF from_currency_param = to_currency_param THEN
    RETURN amount_param;
  END IF;

  -- Get latest exchange rate
  SELECT rate INTO conversion_rate
  FROM exchange_rates
  WHERE from_currency = from_currency_param
    AND to_currency = to_currency_param
    AND date <= date_param
  ORDER BY date DESC
  LIMIT 1;

  -- If no rate found, try reverse rate
  IF conversion_rate IS NULL THEN
    SELECT 1.0 / rate INTO conversion_rate
    FROM exchange_rates
    WHERE from_currency = to_currency_param
      AND to_currency = from_currency_param
      AND date <= date_param
    ORDER BY date DESC
    LIMIT 1;
  END IF;

  -- If still no rate, return original amount (or could throw error)
  IF conversion_rate IS NULL THEN
    RETURN amount_param;
  END IF;

  converted_amount := amount_param * conversion_rate;
  RETURN ROUND(converted_amount, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-categorize expense
CREATE OR REPLACE FUNCTION auto_categorize_expense(
  merchant_name_param TEXT,
  description_param TEXT,
  amount_param DECIMAL
)
RETURNS TABLE(
  category_id UUID,
  confidence DECIMAL,
  merchant_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.predicted_category_id,
    mi.category_confidence,
    mi.merchant_type
  FROM merchant_intelligence mi
  WHERE mi.merchant_name_cleaned ILIKE '%' || TRIM(merchant_name_param) || '%'
     OR description_param ILIKE ANY(mi.description_keywords)
  ORDER BY mi.category_confidence DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate spending statistics
CREATE OR REPLACE FUNCTION calculate_spending_stats(
  user_id_param UUID,
  start_date_param DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_spent DECIMAL,
  category_breakdown JSONB,
  daily_average DECIMAL,
  top_merchants JSONB,
  currency_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH spending_summary AS (
    SELECT 
      SUM(amount_primary_currency) as total,
      COUNT(*) as transaction_count,
      AVG(amount_primary_currency) as avg_transaction
    FROM expenses
    WHERE user_id = user_id_param
      AND transaction_date BETWEEN start_date_param AND end_date_param
      AND transaction_type = 'debit'
  ),
  category_stats AS (
    SELECT 
      ec.name as category_name,
      SUM(e.amount_primary_currency) as category_total,
      COUNT(*) as category_count
    FROM expenses e
    LEFT JOIN expense_categories ec ON e.category_id = ec.id
    WHERE e.user_id = user_id_param
      AND e.transaction_date BETWEEN start_date_param AND end_date_param
      AND e.transaction_type = 'debit'
    GROUP BY ec.name
  ),
  merchant_stats AS (
    SELECT 
      merchant_name,
      SUM(amount_primary_currency) as merchant_total,
      COUNT(*) as merchant_count
    FROM expenses
    WHERE user_id = user_id_param
      AND transaction_date BETWEEN start_date_param AND end_date_param
      AND transaction_type = 'debit'
    GROUP BY merchant_name
    ORDER BY merchant_total DESC
    LIMIT 5
  )
  SELECT 
    ss.total,
    COALESCE(jsonb_object_agg(cs.category_name, cs.category_total), '{}'::jsonb),
    ss.total / GREATEST((end_date_param - start_date_param + 1), 1),
    COALESCE(jsonb_agg(jsonb_build_object('name', ms.merchant_name, 'total', ms.merchant_total)), '[]'::jsonb),
    '{}'::jsonb -- Placeholder for currency breakdown
  FROM spending_summary ss
  CROSS JOIN category_stats cs
  CROSS JOIN merchant_stats ms
  GROUP BY ss.total, ss.transaction_count, ss.avg_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 14: Create triggers for automatic updates

-- Update budget progress when expenses change
CREATE OR REPLACE FUNCTION update_budget_progress()
RETURNS TRIGGER AS $$
DECLARE
  budget_record budgets%ROWTYPE;
BEGIN
  -- Update budgets for this user and category
  FOR budget_record IN
    SELECT * FROM budgets
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND (category_id = COALESCE(NEW.category_id, OLD.category_id) OR category_id IS NULL)
      AND is_active = true
  LOOP
    -- Recalculate spent amount for this budget
    UPDATE budgets
    SET 
      spent_amount = (
        SELECT COALESCE(SUM(amount_primary_currency), 0)
        FROM expenses
        WHERE user_id = budget_record.user_id
          AND (category_id = budget_record.category_id OR budget_record.category_id IS NULL)
          AND transaction_date BETWEEN budget_record.start_date AND budget_record.end_date
          AND transaction_type = 'debit'
      ),
      updated_at = NOW()
    WHERE id = budget_record.id;
    
    -- Update calculated fields
    UPDATE budgets
    SET 
      remaining_amount = amount - spent_amount,
      percentage_used = ROUND((spent_amount / NULLIF(amount, 0)) * 100, 2),
      is_exceeded = spent_amount > amount
    WHERE id = budget_record.id;
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budget_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_budget_progress();

-- Update merchant intelligence when new expenses are added
CREATE OR REPLACE FUNCTION update_merchant_intelligence()
RETURNS TRIGGER AS $$
DECLARE
  cleaned_merchant TEXT;
BEGIN
  IF NEW.merchant_name IS NOT NULL THEN
    -- Clean merchant name (remove extra spaces, standardize)
    cleaned_merchant := UPPER(TRIM(regexp_replace(NEW.merchant_name, '\s+', ' ', 'g')));
    
    -- Update or insert merchant intelligence
    INSERT INTO merchant_intelligence (
      merchant_name_cleaned,
      transaction_count,
      average_amount,
      last_seen
    ) VALUES (
      cleaned_merchant,
      1,
      NEW.amount,
      NOW()
    )
    ON CONFLICT (merchant_name_cleaned) DO UPDATE SET
      transaction_count = merchant_intelligence.transaction_count + 1,
      average_amount = (merchant_intelligence.average_amount * merchant_intelligence.transaction_count + NEW.amount) / (merchant_intelligence.transaction_count + 1),
      last_seen = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_merchant_intelligence_trigger
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_intelligence();

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE expenses IS 'Global expense tracking with UK-specific features and multi-currency support';
COMMENT ON TABLE user_expense_settings IS 'User preferences for currency, location, and budgeting';
COMMENT ON TABLE merchant_intelligence IS 'AI-powered merchant categorization and pattern recognition';
COMMENT ON TABLE spending_patterns IS 'Analyzed spending patterns and insights';
COMMENT ON TABLE budgets IS 'User budgets with automatic progress tracking';

COMMENT ON FUNCTION convert_currency IS 'Convert amounts between currencies using latest exchange rates';
COMMENT ON FUNCTION auto_categorize_expense IS 'Automatically categorize expenses based on merchant intelligence';
COMMENT ON FUNCTION calculate_spending_stats IS 'Calculate comprehensive spending statistics for a time period';