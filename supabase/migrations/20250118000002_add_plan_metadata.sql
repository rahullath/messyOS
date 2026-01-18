-- Daily Plan Generator V1.1 - Add Plan Metadata
-- This migration adds metadata fields to track plan generation context

-- Add new columns to daily_plans table
ALTER TABLE daily_plans
ADD COLUMN generated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN generated_after_now BOOLEAN DEFAULT FALSE,
ADD COLUMN plan_start TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update existing plans to have plan_start = wake_time (they were generated on time)
UPDATE daily_plans
SET plan_start = wake_time
WHERE plan_start = generated_at; -- Only update rows where plan_start is still the default

-- Add constraint to ensure plan_start is between wake_time and sleep_time
ALTER TABLE daily_plans
ADD CONSTRAINT daily_plans_valid_plan_start CHECK (plan_start >= wake_time AND plan_start <= sleep_time);

-- Create index for querying by plan_start
CREATE INDEX idx_daily_plans_plan_start ON daily_plans(plan_start);

-- Comment the new columns
COMMENT ON COLUMN daily_plans.generated_at IS 'Timestamp when the plan was generated';
COMMENT ON COLUMN daily_plans.generated_after_now IS 'True if plan was generated after wake time (late generation)';
COMMENT ON COLUMN daily_plans.plan_start IS 'Effective start time of the plan (max of wake_time and generation time)';
