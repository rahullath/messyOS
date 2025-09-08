-- Enable Row Level Security for daily_plans
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to insert their own daily plans
CREATE POLICY "Users can insert their own daily plans"
ON public.daily_plans
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to select their own daily plans
CREATE POLICY "Users can select their own daily plans"
ON public.daily_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
