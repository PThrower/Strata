-- Records every Stripe event we've already processed so the webhook handler
-- can short-circuit on retries. Stripe replays events on any non-2xx and on
-- a fixed schedule; without dedup, a stale customer.subscription.deleted
-- arriving after a re-subscription would downgrade an active pro account.
CREATE TABLE public.stripe_events (
  event_id     text        PRIMARY KEY,
  event_type   text        NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies — service role only.
