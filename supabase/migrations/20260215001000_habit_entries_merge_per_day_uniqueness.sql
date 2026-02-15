-- Merge duplicate rows per (user_id, habit_id, date), preferring richer records,
-- then enforce one row per user/habit/day to prevent future duplicates.

-- Drop older import-only uniqueness; this is superseded by per-day uniqueness.
DROP INDEX IF EXISTS idx_habit_entries_unique_import_entry;

-- Keep one best row per user/habit/day.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, habit_id, date
      ORDER BY
        (
          CASE WHEN NULLIF(BTRIM(notes), '') IS NOT NULL THEN 8 ELSE 0 END +
          CASE WHEN parsed IS NOT NULL THEN 4 ELSE 0 END +
          CASE WHEN numeric_value IS NOT NULL THEN 2 ELSE 0 END +
          CASE WHEN source = 'loop_per_habit' THEN 1 ELSE 0 END
        ) DESC,
        created_at DESC NULLS LAST,
        logged_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM habit_entries
  WHERE user_id IS NOT NULL
    AND habit_id IS NOT NULL
    AND date IS NOT NULL
)
DELETE FROM habit_entries he
USING ranked r
WHERE he.id = r.id
  AND r.rn > 1;

-- Enforce single row per user/habit/date.
CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_entries_unique_user_habit_date
ON habit_entries (user_id, habit_id, date)
WHERE user_id IS NOT NULL
  AND habit_id IS NOT NULL
  AND date IS NOT NULL;
