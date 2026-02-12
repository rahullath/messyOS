-- Add metadata column to time_blocks table for V1.2 meal placement
-- This stores meal placement metadata (target_time, placement_reason, skip_reason)

ALTER TABLE time_blocks 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_time_blocks_metadata ON time_blocks USING GIN (metadata);

-- Add comment
COMMENT ON COLUMN time_blocks.metadata IS 'Stores meal placement metadata including target_time, placement_reason, and skip_reason';
