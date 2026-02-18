-- Harden auth signup trigger so non-critical initialization failures
-- (wallet/tokens) do not block user creation.

-- Keep wallet/token init best-effort and never fail signup.
CREATE OR REPLACE FUNCTION public.initialize_user_wallet_and_tokens(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_address text;
BEGIN
  BEGIN
    wallet_address := public.generate_simulated_wallet_address();
  EXCEPTION WHEN OTHERS THEN
    wallet_address := null;
  END;

  BEGIN
    UPDATE public.profiles
    SET
      simulated_wallet_address = COALESCE(wallet_address, simulated_wallet_address),
      wallet_created_at = COALESCE(wallet_created_at, now()),
      updated_at = now()
    WHERE id = user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Do not block signup
    NULL;
  END;

  BEGIN
    INSERT INTO public.user_tokens (user_id, balance, total_earned, total_spent, wallet_type)
    VALUES (user_id, 5000, 5000, 0, 'simulated')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Do not block signup
    NULL;
  END;

  BEGIN
    INSERT INTO public.token_transactions (
      user_id, transaction_type, amount, description,
      balance_before, balance_after, metadata
    ) VALUES (
      user_id, 'bonus', 5000, 'Welcome to meshOS! 500 INR starting credit',
      0, 5000, jsonb_build_object(
        'bonus_type', 'welcome',
        'amount_inr', 500,
        'wallet_address', wallet_address
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Do not block signup
    NULL;
  END;
END;
$$;

-- Ensure auth user creation always succeeds with at least a profile row.
CREATE OR REPLACE FUNCTION public.create_user_profile_and_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Do not block signup if profile write is partially incompatible.
    NULL;
  END;

  BEGIN
    PERFORM public.initialize_user_wallet_and_tokens(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Do not block signup
    NULL;
  END;

  RETURN NEW;
END;
$$;
