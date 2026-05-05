-- Agent Activity Ledger — Phase 2 of the Strata roadmap.
-- Append-only, cryptographically-signed record of every agent tool call.
-- Foundation for SOC 2 / ISO 27001 compliance reporting.

CREATE TABLE public.agent_activity_ledger (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  agent_id          text,
  tool_called       text        NOT NULL,
  server_url        text,
  parameters        jsonb,
  response_summary  jsonb,
  risk_level        text        CHECK (risk_level IN ('low','medium','high','critical','unknown')),
  capability_flags  text[],
  duration_ms       integer,
  signature         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_profile_created
  ON public.agent_activity_ledger(profile_id, created_at DESC);

ALTER TABLE public.agent_activity_ledger ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read only their own rows.
-- No insert/update/delete policy for `authenticated` — writes go through the
-- service role only.
CREATE POLICY ledger_select_own
  ON public.agent_activity_ledger
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Append-only enforcement at the row level. Defense-in-depth beyond RLS:
-- even a service-role connection cannot UPDATE or DELETE without first
-- dropping these triggers, which is itself an auditable schema change.
CREATE OR REPLACE FUNCTION public.ledger_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'agent_activity_ledger is append-only';
END;
$$;

CREATE TRIGGER ledger_block_update
  BEFORE UPDATE ON public.agent_activity_ledger
  FOR EACH ROW EXECUTE FUNCTION public.ledger_block_mutation();

CREATE TRIGGER ledger_block_delete
  BEFORE DELETE ON public.agent_activity_ledger
  FOR EACH ROW EXECUTE FUNCTION public.ledger_block_mutation();
