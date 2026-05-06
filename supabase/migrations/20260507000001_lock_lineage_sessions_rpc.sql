-- SECURITY FIX: get_lineage_sessions lateral-access vulnerability.
--
-- The previous version took p_profile_id uuid as a parameter. Because the function
-- had SECURITY DEFINER and EXECUTE was granted to PUBLIC (Supabase default), any
-- authenticated user could call it with an arbitrary UUID and read another user's
-- session stats (flow counts, risk levels, net-egress flags, time ranges).
--
-- Fix: drop the parameterised version; recreate with no parameter using auth.uid()
-- internally. Also revoke EXECUTE from anon, leaving only authenticated and service_role.

DROP FUNCTION IF EXISTS public.get_lineage_sessions(uuid);

CREATE OR REPLACE FUNCTION public.get_lineage_sessions()
RETURNS TABLE (
  session_id            text,
  flow_count            bigint,
  highest_risk          text,
  distinct_server_count bigint,
  has_net_egress        boolean,
  first_at              timestamptz,
  last_at               timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    session_id,
    COUNT(*)                                                             AS flow_count,
    CASE
      WHEN bool_or(risk_level = 'critical') THEN 'critical'
      WHEN bool_or(risk_level = 'high')     THEN 'high'
      WHEN bool_or(risk_level = 'medium')   THEN 'medium'
      ELSE 'low'
    END                                                                  AS highest_risk,
    COUNT(DISTINCT source_server_url) + COUNT(DISTINCT dest_server_url) AS distinct_server_count,
    bool_or(dest_has_net_egress)                                         AS has_net_egress,
    MIN(created_at)                                                      AS first_at,
    MAX(created_at)                                                      AS last_at
  FROM   public.data_lineage_flows
  WHERE  profile_id = auth.uid()
    AND  session_id IS NOT NULL
  GROUP  BY session_id
  ORDER  BY MAX(created_at) DESC
  LIMIT  200
$$;

REVOKE EXECUTE ON FUNCTION public.get_lineage_sessions FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_lineage_sessions TO authenticated, service_role;
