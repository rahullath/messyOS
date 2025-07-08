-- AI Agent Schema for messyOS
-- This file contains the database schema for the AI agent features

-- Agent memories table for storing AI insights and learnings
CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('insight', 'conversation', 'pattern', 'goal', 'achievement')),
    content TEXT NOT NULL,
    importance DECIMAL(3,2) CHECK (importance >= 0 AND importance <= 1),
    tags TEXT[] DEFAULT '{}',
    embedding VECTOR(768), -- For semantic search with embeddings
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table for user life goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('health', 'finance', 'habits', 'career', 'relationships')),
    target_date DATE,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    milestones JSONB DEFAULT '[]',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent interventions table for scheduled actions
CREATE TABLE IF NOT EXISTS agent_interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('habit_rescue', 'health_check', 'finance_review', 'goal_progress')),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent insights table for storing generated insights
CREATE TABLE IF NOT EXISTS agent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('habit', 'health', 'finance', 'content', 'correlation', 'prediction', 'opportunity')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
    category TEXT,
    data JSONB DEFAULT '{}',
    actionable BOOLEAN DEFAULT TRUE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent actions table for recommended actions
CREATE TABLE IF NOT EXISTS agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES agent_insights(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('notification', 'habit_adjustment', 'schedule_change', 'intervention', 'celebration', 'reminder')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    timing TEXT NOT NULL CHECK (timing IN ('immediate', 'today', 'this_week', 'this_month')),
    automated BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation history table
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    agent_response TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    actions_taken TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences for AI agent
CREATE TABLE IF NOT EXISTS user_ai_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    communication_style TEXT DEFAULT 'motivational' CHECK (communication_style IN ('casual', 'formal', 'motivational', 'analytical')),
    notification_frequency TEXT DEFAULT 'moderate' CHECK (notification_frequency IN ('minimal', 'moderate', 'frequent')),
    focus_areas TEXT[] DEFAULT '{"habits"}',
    privacy_level TEXT DEFAULT 'selective' CHECK (privacy_level IN ('open', 'selective', 'private')),
    agent_name TEXT DEFAULT 'Mesh',
    daily_briefing_time TIME DEFAULT '08:00:00',
    weekly_report_day INTEGER DEFAULT 1 CHECK (weekly_report_day >= 0 AND weekly_report_day <= 6), -- 0 = Sunday
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Life patterns table for detected patterns
CREATE TABLE IF NOT EXISTS life_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    frequency TEXT NOT NULL,
    impact TEXT NOT NULL CHECK (impact IN ('positive', 'negative', 'neutral')),
    triggers TEXT[] DEFAULT '{}',
    outcomes TEXT[] DEFAULT '{}',
    data JSONB DEFAULT '{}',
    first_detected TIMESTAMPTZ DEFAULT NOW(),
    last_confirmed TIMESTAMPTZ DEFAULT NOW(),
    confirmation_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk factors table
CREATE TABLE IF NOT EXISTS risk_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    risk TEXT NOT NULL,
    probability DECIMAL(3,2) CHECK (probability >= 0 AND probability <= 1),
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
    prevention TEXT[] DEFAULT '{}',
    early_warnings TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'occurred')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimizations table
CREATE TABLE IF NOT EXISTS optimizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    current_state TEXT NOT NULL,
    optimized_state TEXT NOT NULL,
    expected_gain TEXT NOT NULL,
    effort TEXT NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
    timeframe TEXT NOT NULL,
    steps TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'in_progress', 'completed', 'abandoned')),
    implemented_at TIMESTAMPTZ,
    results TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_timestamp ON agent_memories(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_memories_importance ON agent_memories(importance);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_category ON goals(category);

CREATE INDEX IF NOT EXISTS idx_agent_interventions_user_id ON agent_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_interventions_scheduled_for ON agent_interventions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_agent_interventions_completed ON agent_interventions(completed);

CREATE INDEX IF NOT EXISTS idx_agent_insights_user_id ON agent_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_insights_type ON agent_insights(type);
CREATE INDEX IF NOT EXISTS idx_agent_insights_impact ON agent_insights(impact);
CREATE INDEX IF NOT EXISTS idx_agent_insights_created_at ON agent_insights(created_at);

CREATE INDEX IF NOT EXISTS idx_agent_actions_user_id ON agent_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_completed ON agent_actions(completed);
CREATE INDEX IF NOT EXISTS idx_agent_actions_timing ON agent_actions(timing);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_life_patterns_user_id ON life_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_life_patterns_type ON life_patterns(type);
CREATE INDEX IF NOT EXISTS idx_life_patterns_confidence ON life_patterns(confidence);

CREATE INDEX IF NOT EXISTS idx_risk_factors_user_id ON risk_factors(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_factors_status ON risk_factors(status);

CREATE INDEX IF NOT EXISTS idx_optimizations_user_id ON optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_optimizations_status ON optimizations(status);

-- Row Level Security (RLS) policies
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_memories
CREATE POLICY "Users can view their own agent memories" ON agent_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent memories" ON agent_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent memories" ON agent_memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent memories" ON agent_memories
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for goals
CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agent_interventions
CREATE POLICY "Users can view their own agent interventions" ON agent_interventions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent interventions" ON agent_interventions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent interventions" ON agent_interventions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for agent_insights
CREATE POLICY "Users can view their own agent insights" ON agent_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent insights" ON agent_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent insights" ON agent_insights
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for agent_actions
CREATE POLICY "Users can view their own agent actions" ON agent_actions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent actions" ON agent_actions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent actions" ON agent_actions
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for agent_conversations
CREATE POLICY "Users can view their own agent conversations" ON agent_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent conversations" ON agent_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_ai_preferences
CREATE POLICY "Users can view their own AI preferences" ON user_ai_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI preferences" ON user_ai_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI preferences" ON user_ai_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for life_patterns
CREATE POLICY "Users can view their own life patterns" ON life_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own life patterns" ON life_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own life patterns" ON life_patterns
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for risk_factors
CREATE POLICY "Users can view their own risk factors" ON risk_factors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk factors" ON risk_factors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk factors" ON risk_factors
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for optimizations
CREATE POLICY "Users can view their own optimizations" ON optimizations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own optimizations" ON optimizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own optimizations" ON optimizations
    FOR UPDATE USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_agent_memories_updated_at BEFORE UPDATE ON agent_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_interventions_updated_at BEFORE UPDATE ON agent_interventions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_insights_updated_at BEFORE UPDATE ON agent_insights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_actions_updated_at BEFORE UPDATE ON agent_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ai_preferences_updated_at BEFORE UPDATE ON user_ai_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_life_patterns_updated_at BEFORE UPDATE ON life_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_factors_updated_at BEFORE UPDATE ON risk_factors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_optimizations_updated_at BEFORE UPDATE ON optimizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for testing (optional)
-- INSERT INTO user_ai_preferences (user_id, communication_style, focus_areas) 
-- VALUES (auth.uid(), 'motivational', '{"habits", "health"}')
-- ON CONFLICT (user_id) DO NOTHING;