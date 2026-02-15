-- Habits import dedupe guardrails
-- Ensures repeated Loop imports are append-only and do not create duplicates.

-- 1) Cleanup existing duplicate import rows (keep newest row per key)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, habit_id, date, source
      ORDER BY created_at DESC NULLS LAST, logged_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM habit_entries
  WHERE source IN ('loop_root', 'loop_per_habit')
    AND user_id IS NOT NULL
    AND habit_id IS NOT NULL
    AND date IS NOT NULL
)
DELETE FROM habit_entries he
USING ranked r
WHERE he.id = r.id
  AND r.rn > 1;

-- 2) Enforce uniqueness for imported entries only
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_entries_unique_import_entry
ON habit_entries (user_id, habit_id, date, source)
WHERE source IN ('loop_root', 'loop_per_habit')
  AND user_id IS NOT NULL
  AND habit_id IS NOT NULL
  AND date IS NOT NULL;
