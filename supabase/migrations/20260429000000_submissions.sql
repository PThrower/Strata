CREATE TABLE public.submissions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ecosystem_slug   text        NOT NULL REFERENCES public.ecosystems(slug),
  category         text        NOT NULL CHECK (category IN ('best_practices', 'news', 'integrations')),
  title            text        NOT NULL,
  body             text        NOT NULL,
  source_url       text,
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'validating', 'approved', 'flagged', 'rejected')),
  claude_confidence text       CHECK (claude_confidence IN ('high', 'medium', 'low')),
  claude_reasoning text,
  content_item_id  uuid        REFERENCES public.content_items(id),
  reviewed_at      timestamptz,
  submitted_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_submissions"
  ON public.submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_submissions"
  ON public.submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX submissions_user_id_idx ON public.submissions(user_id);
CREATE INDEX submissions_status_idx  ON public.submissions(status);
CREATE INDEX submissions_submitted_at_idx ON public.submissions(submitted_at DESC);
