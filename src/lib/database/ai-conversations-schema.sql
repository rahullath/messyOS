-- AI Conversations table for context storage
-- This enables the AI to remember previous conversations and build context

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used JSONB,
  actions_taken TEXT[],
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexing for efficient queries
  CREATED_AT TIMESTAMPTZ DEFAULT NOW(),
  UPDATED_AT TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_timestamp ON ai_conversations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_timestamp ON ai_conversations(user_id, timestamp DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own conversations
CREATE POLICY "Users can access their own AI conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- Function to create the table if it doesn't exist (called from TypeScript)
CREATE OR REPLACE FUNCTION create_ai_conversations_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_conversations') THEN
    CREATE TABLE ai_conversations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      user_message TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      context_used JSONB,
      actions_taken TEXT[],
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
    CREATE INDEX idx_ai_conversations_timestamp ON ai_conversations(timestamp DESC);
    CREATE INDEX idx_ai_conversations_user_timestamp ON ai_conversations(user_id, timestamp DESC);

    ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can access their own AI conversations" ON ai_conversations
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;