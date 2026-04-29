CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 500),
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_own_suggestions"
  ON public.suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_read_own_suggestions"
  ON public.suggestions FOR SELECT
  USING (auth.uid() = user_id);
