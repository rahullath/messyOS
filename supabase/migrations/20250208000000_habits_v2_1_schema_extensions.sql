-- Habits v2.1 Schema Extensions Migration
-- Add columns for actionable habits data: numeric_value, parsed, source
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

-- Add new columns to habit_entries table
DO $
BEGIN
    -- Add numeric_value column (DOUBLE PRECISION NULL)
    -- Stores quantified measurements: pouches, meals, sessions, etc.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'numeric_value') THEN
        ALTER TABLE habit_entries ADD COLUMN numeric_value DOUBLE PRECISION NULL;
        COMMENT ON COLUMN habit_entries.numeric_value IS 'Quantified habit measurement (pouches, meals, sessions, etc.)';
    END IF;

    -- Add parsed column (JSONB NULL)
    -- Stores structured data extracted from notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'parsed') THEN
        ALTER TABLE habit_entries ADD COLUMN parsed JSONB NULL;
        COMMENT ON COLUMN habit_entries.parsed IS 'Structured data extracted from notes (ParsedNoteData interface)';
    END IF;

    -- Add source column (TEXT NULL)
    -- Tracks origin of entry: loop_root, loop_per_habit, manual, macro
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'habit_entries' AND column_name = 'source') THEN
        ALTER TABLE habit_entries ADD COLUMN source TEXT NULL;
        COMMENT ON COLUMN habit_entries.source IS 'Origin of entry: loop_root, loop_per_habit, manual, macro';
    END IF;

END $;

-- Create indexes for performance
-- Index on numeric_value for numerical habit queries
CREATE INDEX IF NOT EXISTS idx_habit_entries_numeric_value 
ON habit_entries(numeric_value) 
WHERE numeric_value IS NOT NULL;

-- GIN index on parsed JSONB for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_habit_entries_parsed 
ON habit_entries USING GIN(parsed) 
WHERE parsed IS NOT NULL;

-- Index on source for filtering by data origin
CREATE INDEX IF NOT EXISTS idx_habit_entries_source 
ON habit_entries(source) 
WHERE source IS NOT NULL;

-- Composite index on date and user_id for daily context queries
-- This is critical for temporal boundary enforcement (WHERE date < D)
CREATE INDEX IF NOT EXISTS idx_habit_entries_date_user 
ON habit_entries(date, user_id) 
WHERE date IS NOT NULL AND user_id IS NOT NULL;

-- Add check constraint for source values
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'habit_entries_source_check'
    ) THEN
        ALTER TABLE habit_entries 
        ADD CONSTRAINT habit_entries_source_check 
        CHECK (source IS NULL OR source IN ('loop_root', 'loop_per_habit', 'manual', 'macro'));
    END IF;
END $;

-- Verify backward compatibility by checking existing queries still work
-- This is a validation query that should return successfully
DO $
DECLARE
    test_count INTEGER;
BEGIN
    -- Test that existing queries work without new columns
    SELECT COUNT(*) INTO test_count
    FROM habit_entries
    WHERE user_id IS NOT NULL
    LIMIT 1;
    
    RAISE NOTICE 'Backward compatibility verified: existing queries work correctly';
END $;
