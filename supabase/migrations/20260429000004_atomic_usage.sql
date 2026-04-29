-- Atomic check-reset-increment for the per-profile monthly call counter.
--
-- Replaces the read-then-write pattern in lib/api-auth.ts and lib/mcp-auth.ts
-- which has a race window: two concurrent calls can both read calls_used=99,
-- both pass the limit check, and both write 100 — letting a free user exceed
-- the cap by spamming concurrent requests.
--
-- Returns:
--   allowed       — false if profile not found or over the cap
--   profile_id    — the matched profile id (null if key not found)
--   tier          — 'free' | 'pro' (for downstream logic)
--   calls_used    — value AFTER the increment
--   was_reset     — true if the monthly window was rolled in this call
CREATE OR REPLACE FUNCTION public.consume_api_call(input_api_key text)
RETURNS TABLE (
  allowed     boolean,
  profile_id  uuid,
  tier        text,
  calls_used  integer,
  was_reset   boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile  public.profiles%ROWTYPE;
  v_limit    integer;
  v_reset    boolean := false;
BEGIN
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE api_key = input_api_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, 0, false;
    RETURN;
  END IF;

  IF v_profile.calls_reset_at IS NULL OR v_profile.calls_reset_at <= now() THEN
    UPDATE public.profiles
       SET calls_used = 0,
           calls_reset_at = now() + interval '1 month'
     WHERE id = v_profile.id
    RETURNING * INTO v_profile;
    v_reset := true;
  END IF;

  v_limit := CASE WHEN v_profile.tier = 'pro' THEN 10000 ELSE 100 END;

  IF v_profile.calls_used >= v_limit THEN
    RETURN QUERY
      SELECT false, v_profile.id, v_profile.tier, v_profile.calls_used, v_reset;
    RETURN;
  END IF;

  UPDATE public.profiles
     SET calls_used = v_profile.calls_used + 1
   WHERE id = v_profile.id
  RETURNING * INTO v_profile;

  RETURN QUERY
    SELECT true, v_profile.id, v_profile.tier, v_profile.calls_used, v_reset;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_call(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_call(text) TO service_role;
