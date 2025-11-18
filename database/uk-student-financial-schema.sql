-- UK Student Financial Integration Database Schema
-- Tables for expenses, budgets, bank accounts, and financial analytics

-- UK-specific financial data and expenses
CREATE TABLE IF NOT EXISTS uk_student_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  subcategory TEXT,
  store TEXT,
  location TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('monzo', 'iq-prepaid', 'icici-uk', 'cash', 'card', 'other')),
  receipt_data JSONB, -- OCR processed receipt data
  transaction_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget limits and pots system
CREATE TABLE IF NOT EXISTS uk_student_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('weekly', 'monthly', 'yearly')),
  limit_amount NUMERIC NOT NULL CHECK (limit_amount > 0),
  current_spent NUMERIC NOT NULL DEFAULT 0 CHECK (current_spent >= 0),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  alert_threshold NUMERIC DEFAULT 0.8 CHECK (alert_threshold BETWEEN 0 AND 1), -- Alert at 80% by default
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, budget_type, period_start)
);

-- UK bank account integration
CREATE TABLE IF NOT EXISTS uk_student_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  bank_type TEXT NOT NULL CHECK (bank_type IN ('monzo', 'iq-prepaid', 'icici-uk', 'other')),
  account_number_hash TEXT, -- Hashed for security
  sort_code_hash TEXT, -- Hashed for security
  balance NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipt OCR processing results
CREATE TABLE IF NOT EXISTS uk_student_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES uk_student_expenses(id) ON DELETE CASCADE,
  image_url TEXT,
  ocr_text TEXT,
  parsed_data JSONB, -- Structured receipt data
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  requires_manual_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price comparison and overpaying detection
CREATE TABLE IF NOT EXISTS uk_student_price_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  average_price NUMERIC NOT NULL CHECK (average_price > 0),
  price_range_min NUMERIC NOT NULL CHECK (price_range_min > 0),
  price_range_max NUMERIC NOT NULL CHECK (price_range_max > 0),
  store_type TEXT, -- 'budget', 'mid', 'premium'
  location TEXT DEFAULT 'birmingham',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  data_source TEXT DEFAULT 'manual', -- 'manual', 'scraped', 'user-reported'
  sample_size INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget alerts and notifications
CREATE TABLE IF NOT EXISTS uk_student_budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES uk_student_budgets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_reached', 'budget_exceeded', 'unusual_spending', 'overpaying_detected')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  metadata JSONB, -- Additional alert data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spending analytics and insights
CREATE TABLE IF NOT EXISTS uk_student_spending_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('weekly_summary', 'monthly_summary', 'category_trend', 'savings_opportunity', 'spending_pattern')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB NOT NULL, -- Insight-specific data
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  is_actionable BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uk_expenses_user_date ON uk_student_expenses(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_uk_expenses_category ON uk_student_expenses(category);
CREATE INDEX IF NOT EXISTS idx_uk_expenses_store ON uk_student_expenses(store);
CREATE INDEX IF NOT EXISTS idx_uk_expenses_payment_method ON uk_student_expenses(payment_method);
CREATE INDEX IF NOT EXISTS idx_uk_expenses_amount ON uk_student_expenses(amount);

CREATE INDEX IF NOT EXISTS idx_uk_budgets_user_active ON uk_student_budgets(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_uk_budgets_period ON uk_student_budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_uk_budgets_category ON uk_student_budgets(category);

CREATE INDEX IF NOT EXISTS idx_uk_accounts_user_active ON uk_student_bank_accounts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_uk_accounts_bank_type ON uk_student_bank_accounts(bank_type);

CREATE INDEX IF NOT EXISTS idx_uk_receipts_user_id ON uk_student_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_uk_receipts_status ON uk_student_receipts(processing_status);
CREATE INDEX IF NOT EXISTS idx_uk_receipts_manual_review ON uk_student_receipts(requires_manual_review) WHERE requires_manual_review = true;

CREATE INDEX IF NOT EXISTS idx_uk_price_refs_item ON uk_student_price_references(item_name);
CREATE INDEX IF NOT EXISTS idx_uk_price_refs_category ON uk_student_price_references(category);

CREATE INDEX IF NOT EXISTS idx_uk_alerts_user_unread ON uk_student_budget_alerts(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_uk_alerts_severity ON uk_student_budget_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_uk_insights_user_valid ON uk_student_spending_insights(user_id, valid_until) WHERE valid_until IS NULL OR valid_until >= CURRENT_DATE;

-- Row Level Security (RLS) policies
ALTER TABLE uk_student_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE uk_student_spending_insights ENABLE ROW LEVEL SECURITY;

-- Expenses policies
CREATE POLICY "Users can view their own expenses" ON uk_student_expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses" ON uk_student_expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON uk_student_expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON uk_student_expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view their own budgets" ON uk_student_budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON uk_student_budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON uk_student_budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON uk_student_budgets
  FOR DELETE USING (auth.uid() = user_id);

-- Bank accounts policies
CREATE POLICY "Users can view their own bank accounts" ON uk_student_bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank accounts" ON uk_student_bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank accounts" ON uk_student_bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bank accounts" ON uk_student_bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Receipts policies
CREATE POLICY "Users can view their own receipts" ON uk_student_receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts" ON uk_student_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts" ON uk_student_receipts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts" ON uk_student_receipts
  FOR DELETE USING (auth.uid() = user_id);

-- Budget alerts policies
CREATE POLICY "Users can view their own budget alerts" ON uk_student_budget_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget alerts" ON uk_student_budget_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget alerts" ON uk_student_budget_alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget alerts" ON uk_student_budget_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Spending insights policies
CREATE POLICY "Users can view their own spending insights" ON uk_student_spending_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spending insights" ON uk_student_spending_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spending insights" ON uk_student_spending_insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spending insights" ON uk_student_spending_insights
  FOR DELETE USING (auth.uid() = user_id);

-- Price references are public (no RLS needed)
-- Everyone can view price reference data

-- Insert sample UK-specific expense categories
INSERT INTO uk_student_price_references (item_name, category, average_price, price_range_min, price_range_max, store_type) VALUES
('fly spray', 'household', 2.50, 1.99, 4.99, 'mid'),
('bread loaf', 'groceries', 1.20, 0.85, 2.50, 'mid'),
('milk 1L', 'groceries', 1.35, 1.15, 1.65, 'mid'),
('pasta 500g', 'groceries', 1.00, 0.65, 2.00, 'mid'),
('chicken breast 1kg', 'groceries', 6.50, 4.99, 9.99, 'mid'),
('energy drink', 'drinks', 1.50, 1.00, 2.50, 'mid'),
('coffee shop coffee', 'food_out', 3.50, 2.50, 5.00, 'mid'),
('train ticket daily', 'transport', 2.08, 2.05, 2.10, 'mid'),
('laundry wash', 'utilities', 6.50, 6.00, 7.00, 'mid'),
('gym membership monthly', 'fitness', 25.00, 15.00, 40.00, 'mid')
ON CONFLICT DO NOTHING;

-- Insert sample budget categories for UK students
-- These will be used as templates when users set up their budgets
CREATE TABLE IF NOT EXISTS uk_student_budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE,
  suggested_weekly_amount NUMERIC NOT NULL,
  suggested_monthly_amount NUMERIC NOT NULL,
  description TEXT,
  is_essential BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO uk_student_budget_templates (category, suggested_weekly_amount, suggested_monthly_amount, description, is_essential) VALUES
('groceries', 40.00, 160.00, 'Food shopping and cooking ingredients', true),
('transport', 15.00, 60.00, 'Train tickets, bus fares, fuel', true),
('utilities', 25.00, 100.00, 'Electricity, gas, water, internet', true),
('entertainment', 20.00, 80.00, 'Cinema, streaming, games, social activities', false),
('emergency', 10.00, 40.00, 'Emergency fund for unexpected expenses', true),
('food_out', 15.00, 60.00, 'Restaurants, takeaways, coffee shops', false),
('household', 10.00, 40.00, 'Cleaning supplies, toiletries, household items', true),
('fitness', 8.00, 30.00, 'Gym membership, sports equipment', false),
('education', 15.00, 60.00, 'Books, stationery, course materials', true),
('personal_care', 12.00, 50.00, 'Skincare, haircare, personal hygiene', true)
ON CONFLICT DO NOTHING;

-- Functions for budget calculations and alerts
CREATE OR REPLACE FUNCTION update_budget_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_spent for relevant budgets when expense is added/updated/deleted
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE uk_student_budgets 
    SET current_spent = (
      SELECT COALESCE(SUM(amount), 0)
      FROM uk_student_expenses 
      WHERE user_id = NEW.user_id 
        AND category = uk_student_budgets.category
        AND transaction_date >= uk_student_budgets.period_start
        AND transaction_date <= uk_student_budgets.period_end
    ),
    updated_at = NOW()
    WHERE user_id = NEW.user_id 
      AND category = NEW.category
      AND is_active = true
      AND NEW.transaction_date >= period_start
      AND NEW.transaction_date <= period_end;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE uk_student_budgets 
    SET current_spent = (
      SELECT COALESCE(SUM(amount), 0)
      FROM uk_student_expenses 
      WHERE user_id = OLD.user_id 
        AND category = uk_student_budgets.category
        AND transaction_date >= uk_student_budgets.period_start
        AND transaction_date <= uk_student_budgets.period_end
    ),
    updated_at = NOW()
    WHERE user_id = OLD.user_id 
      AND category = OLD.category
      AND is_active = true
      AND OLD.transaction_date >= period_start
      AND OLD.transaction_date <= period_end;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update budget spent amounts
CREATE TRIGGER trigger_update_budget_spent
  AFTER INSERT OR UPDATE OR DELETE ON uk_student_expenses
  FOR EACH ROW EXECUTE FUNCTION update_budget_spent();

-- Function to check for budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
  budget_record RECORD;
  alert_message TEXT;
  threshold_percentage NUMERIC;
BEGIN
  -- Check if any budgets have exceeded their alert thresholds
  FOR budget_record IN 
    SELECT * FROM uk_student_budgets 
    WHERE user_id = NEW.user_id 
      AND is_active = true
      AND current_spent > 0
      AND (current_spent / limit_amount) >= alert_threshold
  LOOP
    threshold_percentage := (budget_record.current_spent / budget_record.limit_amount) * 100;
    
    IF budget_record.current_spent >= budget_record.limit_amount THEN
      alert_message := format('Budget exceeded! You''ve spent £%.2f of your £%.2f %s %s budget (%.1f%%)',
        budget_record.current_spent, budget_record.limit_amount, budget_record.budget_type, budget_record.category, threshold_percentage);
      
      INSERT INTO uk_student_budget_alerts (user_id, budget_id, alert_type, message, severity, metadata)
      VALUES (NEW.user_id, budget_record.id, 'budget_exceeded', alert_message, 'critical',
        jsonb_build_object('percentage', threshold_percentage, 'amount_over', budget_record.current_spent - budget_record.limit_amount))
      ON CONFLICT DO NOTHING;
    ELSE
      alert_message := format('Budget alert: You''ve spent £%.2f of your £%.2f %s %s budget (%.1f%%)',
        budget_record.current_spent, budget_record.limit_amount, budget_record.budget_type, budget_record.category, threshold_percentage);
      
      INSERT INTO uk_student_budget_alerts (user_id, budget_id, alert_type, message, severity, metadata)
      VALUES (NEW.user_id, budget_record.id, 'threshold_reached', alert_message, 'warning',
        jsonb_build_object('percentage', threshold_percentage))
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for budget alerts after budget updates
CREATE TRIGGER trigger_check_budget_alerts
  AFTER UPDATE ON uk_student_budgets
  FOR EACH ROW 
  WHEN (NEW.current_spent != OLD.current_spent)
  EXECUTE FUNCTION check_budget_alerts();