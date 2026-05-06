-- Phase 4: Circuit Breaker & Rollback
-- Three columns on mcp_servers hold the global breaker state.
-- circuit_breaker_resets holds per-profile acknowledgements.
-- A trigger on threat_feed AFTER INSERT auto-trips on severity=critical
-- and auto-resets on quarantine_removed.
--
-- No infinite loop: the narrow mcp_servers trigger fires only on
-- OF is_quarantined, capability_flags, security_score, injection_risk_score.
-- circuit_broken is NOT in that list, so writing it from this trigger
-- does not re-fire the threat trigger.

-- ── 1. mcp_servers — global breaker state ─────────────────────────────────────

ALTER TABLE public.mcp_servers
  ADD COLUMN circuit_broken        boolean     NOT NULL DEFAULT false,
  ADD COLUMN circuit_broken_at     timestamptz,
  ADD COLUMN circuit_broken_reason text;

CREATE INDEX idx_mcp_servers_circuit_broken
  ON public.mcp_servers(circuit_broken) WHERE circuit_broken = true;

-- ── 2. threat_feed — record which event tripped the breaker ───────────────────

ALTER TABLE public.threat_feed
  ADD COLUMN triggered_circuit_breaker boolean NOT NULL DEFAULT false;

-- ── 3. circuit_breaker_resets — per-profile bypass ───────────────────────────

CREATE TABLE public.circuit_breaker_resets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id    uuid        NOT NULL REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  profile_id   uuid        NOT NULL,
  reset_at     timestamptz NOT NULL DEFAULT now(),
  reset_reason text,
  UNIQUE(server_id, profile_id)
);

CREATE INDEX idx_cbr_profile_id ON public.circuit_breaker_resets(profile_id);
CREATE INDEX idx_cbr_server_id  ON public.circuit_breaker_resets(server_id);

ALTER TABLE public.circuit_breaker_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.circuit_breaker_resets FROM anon, authenticated;

-- ── 4. Trigger: trip/reset circuit breaker on threat_feed INSERT ──────────────

CREATE OR REPLACE FUNCTION public.threat_feed_circuit_breaker_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Auto-trip: any critical event breaks the circuit (idempotent).
  IF NEW.severity = 'critical' THEN
    UPDATE public.mcp_servers
    SET
      circuit_broken        = true,
      circuit_broken_at     = NEW.created_at,
      circuit_broken_reason = NEW.detail
    WHERE id = NEW.server_id
      AND circuit_broken = false;

    -- Mark the triggering threat_feed row (safe: AFTER INSERT trigger can UPDATE same table).
    UPDATE public.threat_feed
    SET triggered_circuit_breaker = true
    WHERE id = NEW.id;
  END IF;

  -- Auto-reset: quarantine lifted clears the global breaker.
  IF NEW.event_type = 'quarantine_removed' THEN
    UPDATE public.mcp_servers
    SET
      circuit_broken        = false,
      circuit_broken_at     = NULL,
      circuit_broken_reason = NULL
    WHERE id = NEW.server_id
      AND circuit_broken = true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER threat_feed_circuit_breaker_trigger
  AFTER INSERT ON public.threat_feed
  FOR EACH ROW EXECUTE FUNCTION public.threat_feed_circuit_breaker_trigger();
