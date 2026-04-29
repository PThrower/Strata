ALTER TABLE public.profiles
  ALTER COLUMN api_key
    SET DEFAULT 'sk_' || replace(gen_random_uuid()::text, '-', '');
