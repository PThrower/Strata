-- Fix: drop stale circuit_breaker_resets rows on quarantine_removed auto-reset.
-- The original migration (20260509000001) was missing the DELETE, leaving per-profile
-- bypass records alive after a server cycles through cleared → re-tripped. A user's
-- prior acknowledgement must not silently cover a new, different threat.

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

    -- Drop per-profile bypasses so a future re-trip requires fresh acknowledgement.
    -- A user's reset covered a specific threat instance; if the server cycles
    -- through clear → re-trip, the new threat must be re-evaluated by the user.
    DELETE FROM public.circuit_breaker_resets
    WHERE server_id = NEW.server_id;
  END IF;

  RETURN NEW;
END;
$$;
