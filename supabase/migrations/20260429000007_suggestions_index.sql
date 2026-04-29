CREATE INDEX suggestions_user_id_submitted_at_idx
  ON public.suggestions(user_id, submitted_at DESC);
