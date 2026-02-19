-- V2.2 stabilization: manual anchors for chain-first planning.
-- Additive migration only.

CREATE TABLE IF NOT EXISTS public.manual_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anchor_date date NOT NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  anchor_type text NOT NULL DEFAULT 'other',
  must_attend boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_anchors_anchor_type_check
    CHECK (anchor_type IN ('class', 'seminar', 'workshop', 'appointment', 'other')),
  CONSTRAINT manual_anchors_time_range_check
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS manual_anchors_user_date_idx
  ON public.manual_anchors (user_id, anchor_date, start_time);

ALTER TABLE public.manual_anchors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own manual anchors" ON public.manual_anchors;
CREATE POLICY "Users can view own manual anchors"
ON public.manual_anchors
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own manual anchors" ON public.manual_anchors;
CREATE POLICY "Users can insert own manual anchors"
ON public.manual_anchors
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own manual anchors" ON public.manual_anchors;
CREATE POLICY "Users can update own manual anchors"
ON public.manual_anchors
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own manual anchors" ON public.manual_anchors;
CREATE POLICY "Users can delete own manual anchors"
ON public.manual_anchors
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
