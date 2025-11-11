-- Fix cooking_time constraint to allow 0 for no-cook recipes
-- Run this BEFORE inserting the seed data

-- Drop the existing constraint
ALTER TABLE uk_student_recipes DROP CONSTRAINT IF EXISTS uk_student_recipes_cooking_time_check;

-- Add the corrected constraint (allow >= 0 instead of > 0)
ALTER TABLE uk_student_recipes ADD CONSTRAINT uk_student_recipes_cooking_time_check CHECK (cooking_time >= 0);