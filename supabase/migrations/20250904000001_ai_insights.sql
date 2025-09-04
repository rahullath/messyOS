-- AI Insights Migration
-- Add tables for storing AI-generated insights and correlations

-- Create habit insights table
CREATE TABLE IF NOT EXISTS habit_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'correlation', 'trend', 'recommendation', 'optimal_conditions')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    data JSONB,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    is_actionable BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE
);

-- Create habit correlations table
CREATE TABLE IF NOT EXISTS habit_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    habit1_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    habit2_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    correlation_score DECIMAL(3,2) CHECK (correlation_score >= -1 AND correlation_score <= 1),
    insight TEXT,
    recommendation TEXT,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create natural language logs table for tracking parsed inputs
CREATE TABLE IF NOT EXISTS habit_nlp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_input TEXT NOT NULL,
    parsed_results JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL,
    tokens_consumed INTEGER NOT NULL,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habit_insights_user_type ON habit_insights(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_habit_insights_habit ON habit_insights(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_insights_expires ON habit_insights(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_habit_correlations_user ON habit_correlations(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_correlations_habits ON habit_correlations(habit1_id, habit2_id);
CREATE INDEX IF NOT EXISTS idx_habit_nlp_logs_user ON habit_nlp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_feature ON ai_usage_tracking(user_id, feature_type);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_created ON ai_usage_tracking(created_at);

-- Enable RLS
ALTER TABLE habit_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_nlp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can only access their own insights" ON habit_insights;
CREATE POLICY "Users can only access their own insights" ON habit_insights
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own correlations" ON habit_correlations;
CREATE POLICY "Users can only access their own correlations" ON habit_correlations
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own NLP logs" ON habit_nlp_logs;
CREATE POLICY "Users can only access their own NLP logs" ON habit_nlp_logs
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own AI usage" ON ai_usage_tracking;
CREATE POLICY "Users can only access their own AI usage" ON ai_usage_tracking
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON habit_insights TO authenticated;
GRANT ALL ON habit_correlations TO authenticated;
GRANT ALL ON habit_nlp_logs TO authenticated;
GRANT ALL ON ai_usage_tracking TO authenticated;

-- Create function to clean up expired insights
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS void AS $
BEGIN
    DELETE FROM habit_insights 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired insights (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-insights', '0 2 * * *', 'SELECT cleanup_expired_insights();');