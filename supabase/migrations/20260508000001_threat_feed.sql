-- Phase 3: Real-Time Threat Feed
-- Append-only log of meaningful risk signal changes on mcp_servers.
-- Written by an AFTER UPDATE trigger; never written by application code.
-- Pruned to 90 days by the refresh pipeline.

CREATE TABLE public.threat_feed (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id   uuid        NOT NULL REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  server_url  text,                    -- denormalized — avoids JOIN on every feed read
  server_name text,                    -- denormalized
  event_type  text        NOT NULL,    -- see trigger below for allowed values
  severity    text        NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  old_value   jsonb,                   -- relevant field(s) before change
  new_value   jsonb,                   -- relevant field(s) after change
  detail      text,                    -- human-readable summary for dashboard display
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_threat_feed_created    ON public.threat_feed(created_at DESC);
CREATE INDEX idx_threat_feed_server_id  ON public.threat_feed(server_id);
CREATE INDEX idx_threat_feed_severity   ON public.threat_feed(severity);
CREATE INDEX idx_threat_feed_event_type ON public.threat_feed(event_type);

-- No RLS, no profile_id: this is a global signal table.
-- The API route filters to "servers I've connected to" at query time using
-- agent_activity_ledger, so per-user scoping is application-layer.

-- ── Trigger ───────────────────────────────────────────────────────────────────
-- Fires AFTER UPDATE on mcp_servers and writes one row per meaningful change.
-- Multiple events can fire on the same UPDATE (e.g., quarantine + score drop).
-- Only dangerous capability flags trigger alerts — net_egress is intentionally excluded.

CREATE OR REPLACE FUNCTION public.mcp_servers_threat_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  dangerous_flags text[] := ARRAY['shell_exec','dynamic_eval','arbitrary_sql','fs_write','secret_read','process_spawn'];
  added_flags     text[] := ARRAY[]::text[];
  score_drop      numeric;
  flag            text;
BEGIN
  -- 1. Quarantine added
  IF (OLD.is_quarantined IS NULL OR OLD.is_quarantined = false)
     AND NEW.is_quarantined = true THEN
    INSERT INTO public.threat_feed(server_id, server_url, server_name, event_type, severity, old_value, new_value, detail)
    VALUES(
      NEW.id, NEW.url, NEW.name, 'quarantine_added', 'critical',
      jsonb_build_object('is_quarantined', false),
      jsonb_build_object('is_quarantined', true, 'injection_risk_score', NEW.injection_risk_score),
      'Server quarantined — prompt injection or malicious content detected'
    );
  END IF;

  -- 2. Quarantine removed
  IF OLD.is_quarantined = true
     AND (NEW.is_quarantined IS NULL OR NEW.is_quarantined = false) THEN
    INSERT INTO public.threat_feed(server_id, server_url, server_name, event_type, severity, old_value, new_value, detail)
    VALUES(
      NEW.id, NEW.url, NEW.name, 'quarantine_removed', 'medium',
      jsonb_build_object('is_quarantined', true),
      jsonb_build_object('is_quarantined', false),
      'Server quarantine lifted'
    );
  END IF;

  -- 3. Dangerous capability flags added (one row per UPDATE aggregating all new flags)
  IF NEW.capability_flags IS NOT NULL THEN
    FOREACH flag IN ARRAY dangerous_flags LOOP
      IF flag = ANY(NEW.capability_flags)
         AND (OLD.capability_flags IS NULL OR NOT (flag = ANY(OLD.capability_flags))) THEN
        added_flags := added_flags || flag;
      END IF;
    END LOOP;
  END IF;
  IF cardinality(added_flags) > 0 THEN
    INSERT INTO public.threat_feed(server_id, server_url, server_name, event_type, severity, old_value, new_value, detail)
    VALUES(
      NEW.id, NEW.url, NEW.name, 'capability_flag_added', 'high',
      jsonb_build_object('capability_flags', coalesce(OLD.capability_flags, '{}'::text[])),
      jsonb_build_object('capability_flags', NEW.capability_flags, 'added_flags', to_json(added_flags)),
      format('%s dangerous capability flag(s) added: %s', cardinality(added_flags), array_to_string(added_flags, ', '))
    );
  END IF;

  -- 4 & 5. Security score drop
  IF OLD.security_score IS NOT NULL AND NEW.security_score IS NOT NULL THEN
    score_drop := OLD.security_score - NEW.security_score;
    IF score_drop >= 25 AND NEW.security_score < 20 THEN
      INSERT INTO public.threat_feed(server_id, server_url, server_name, event_type, severity, old_value, new_value, detail)
      VALUES(
        NEW.id, NEW.url, NEW.name, 'score_critical_drop', 'critical',
        jsonb_build_object('security_score', OLD.security_score),
        jsonb_build_object('security_score', NEW.security_score),
        format('Security score dropped from %s to %s — below critical threshold', OLD.security_score::int, NEW.security_score::int)
      );
    ELSIF score_drop >= 25 THEN
      INSERT INTO public.threat_feed(server_id, server_url, server_name, event_type, severity, old_value, new_value, detail)
      VALUES(
        NEW.id, NEW.url, NEW.name, 'score_significant_drop', 'high',
        jsonb_build_object('security_score', OLD.security_score),
        jsonb_build_object('security_score', NEW.security_score),
        format('Security score dropped significantly from %s to %s', OLD.security_score::int, NEW.security_score::int)
      );
    END IF;
  END IF;

  -- 6. Injection detected (threshold crossing: < 6 → ≥ 6)
  IF (OLD.injection_risk_score IS NULL OR OLD.injection_risk_score < 6)
     AND NEW.injection_risk_score >= 6 THEN
    INSERT INTO public.threat_feed(server_id, server_url, server_name, event_type, severity, old_value, new_value, detail)
    VALUES(
      NEW.id, NEW.url, NEW.name, 'injection_detected', 'critical',
      jsonb_build_object('injection_risk_score', OLD.injection_risk_score),
      jsonb_build_object('injection_risk_score', NEW.injection_risk_score),
      format('Prompt injection detected in tool descriptions (score %s/10)', NEW.injection_risk_score)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mcp_servers_threat_trigger
  AFTER UPDATE ON public.mcp_servers
  FOR EACH ROW EXECUTE FUNCTION public.mcp_servers_threat_trigger();
