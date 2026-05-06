-- Phase 4: Behavioral Anomaly Detection
-- anomaly_baselines: pre-computed rolling stats per profile, refreshed hourly by cron.
-- anomaly_events:    detected deviations. acknowledge column is mutable (not append-only).

-- ── anomaly_baselines ─────────────────────────────────────────────────────────

CREATE TABLE public.anomaly_baselines (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id                  uuid        NOT NULL,
  agent_id                    text,                   -- NULL = profile-wide
  avg_calls_by_hour_slot      float[]     NOT NULL DEFAULT '{}',  -- 24 UTC hour buckets [0–23]
  avg_daily_calls             float       NOT NULL DEFAULT 0,
  high_risk_rate              float       NOT NULL DEFAULT 0,
  net_egress_rate             float       NOT NULL DEFAULT 0,
  dangerous_flag_rate         float       NOT NULL DEFAULT 0,
  avg_unique_servers_per_hour float       NOT NULL DEFAULT 0,
  baseline_start              timestamptz NOT NULL,
  baseline_end                timestamptz NOT NULL,
  sample_count                integer     NOT NULL DEFAULT 0,
  days_with_data              integer     NOT NULL DEFAULT 0,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- No unique constraint: rows are inserted each detection run and pruned after 48h.
CREATE INDEX idx_ab_profile_updated ON public.anomaly_baselines(profile_id, updated_at DESC);

ALTER TABLE public.anomaly_baselines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.anomaly_baselines FROM anon, authenticated;

-- ── anomaly_events ────────────────────────────────────────────────────────────

CREATE TABLE public.anomaly_events (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id           uuid        NOT NULL,
  agent_id             text,
  event_type           text        NOT NULL
    CHECK (event_type IN ('volume_spike', 'high_risk_surge', 'net_egress_surge')),
  severity             text        NOT NULL
    CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  current_value        float       NOT NULL,
  baseline_value       float       NOT NULL,
  multiplier           float       NOT NULL,
  detail               text        NOT NULL,
  window_start         timestamptz NOT NULL,
  window_end           timestamptz NOT NULL,
  affected_server_urls text[],
  acknowledged         boolean     NOT NULL DEFAULT false,
  acknowledged_at      timestamptz,
  acknowledged_reason  text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ae_profile_created ON public.anomaly_events(profile_id, created_at DESC);
CREATE INDEX idx_ae_unacked          ON public.anomaly_events(profile_id) WHERE NOT acknowledged;

ALTER TABLE public.anomaly_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own events.
-- Writes and acknowledge updates go through service role only (API routes).
CREATE POLICY ae_select_own
  ON public.anomaly_events
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.anomaly_events    FROM anon, authenticated;
REVOKE ALL                     ON public.anomaly_baselines FROM anon, authenticated;
