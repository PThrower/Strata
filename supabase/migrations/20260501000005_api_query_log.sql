-- Forensic query audit log — richer than api_requests (which is the billing counter).
-- api_key_hash and client_ip_hash are SHA-256 hex digests; raw values never stored.
-- Retention: 30 days. Run delete_old_query_logs() periodically (e.g. in refresh pipeline).

CREATE TABLE public.api_query_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_hash    text        NOT NULL,
  tool_name       text        NOT NULL,
  query_params    jsonb,
  result_count    integer,
  result_ids      uuid[],
  client_ip_hash  text,
  status_code     integer,
  latency_ms      integer,
  responded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_query_log_responded_at
  ON public.api_query_log(responded_at DESC);

CREATE INDEX idx_query_log_api_key_hash
  ON public.api_query_log(api_key_hash, responded_at DESC);

ALTER TABLE public.api_query_log ENABLE ROW LEVEL SECURITY;
-- No RLS policies — service role only. All queries must use createServiceRoleClient().

-- Cleanup function: call periodically to enforce 30-day retention.
CREATE OR REPLACE FUNCTION public.delete_old_query_logs()
RETURNS integer
LANGUAGE sql SECURITY DEFINER
AS $$
  WITH deleted AS (
    DELETE FROM public.api_query_log
    WHERE responded_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*)::integer FROM deleted;
$$;
