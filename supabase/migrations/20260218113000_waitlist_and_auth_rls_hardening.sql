-- Task 5B follow-up: waitlist support + strict multi-user RLS.
-- Additive migration only.

-- ---------------------------
-- waitlist table (public signups + authenticated self-activation)
-- ---------------------------
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  interest_area text,
  referrer text,
  user_agent text,
  signup_date timestamptz NOT NULL DEFAULT now(),
  activated boolean NOT NULL DEFAULT false,
  activation_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique_idx
ON public.waitlist ((lower(email)));

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon can join waitlist" ON public.waitlist;
CREATE POLICY "Anon can join waitlist"
ON public.waitlist
FOR INSERT
TO anon, authenticated
WITH CHECK (email IS NOT NULL AND length(trim(email)) > 3);

DROP POLICY IF EXISTS "Users can read own waitlist row" ON public.waitlist;
CREATE POLICY "Users can read own waitlist row"
ON public.waitlist
FOR SELECT
TO authenticated
USING (lower(email) = lower(auth.email()));

DROP POLICY IF EXISTS "Users can update own waitlist row" ON public.waitlist;
CREATE POLICY "Users can update own waitlist row"
ON public.waitlist
FOR UPDATE
TO authenticated
USING (lower(email) = lower(auth.email()))
WITH CHECK (lower(email) = lower(auth.email()));

-- ---------------------------
-- wake_events: enable strict per-user RLS
-- ---------------------------
ALTER TABLE IF EXISTS public.wake_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wake events" ON public.wake_events;
CREATE POLICY "Users can view own wake events"
ON public.wake_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wake events" ON public.wake_events;
CREATE POLICY "Users can insert own wake events"
ON public.wake_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wake events" ON public.wake_events;
CREATE POLICY "Users can update own wake events"
ON public.wake_events
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wake events" ON public.wake_events;
CREATE POLICY "Users can delete own wake events"
ON public.wake_events
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ---------------------------
-- habits + habit_entries: remove nullable-owner access
-- ---------------------------
DROP POLICY IF EXISTS "Users can only access their own habits" ON public.habits;
CREATE POLICY "Users can only access their own habits"
ON public.habits
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own habit entries" ON public.habit_entries;
CREATE POLICY "Users can only access their own habit entries"
ON public.habit_entries
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
