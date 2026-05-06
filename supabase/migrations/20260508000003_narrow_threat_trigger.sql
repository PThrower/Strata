-- Narrow the threat feed trigger to only fire when columns it actually watches
-- change. Without the OF clause, the trigger fired on every UPDATE to mcp_servers
-- (including runtime_score, last_probe_at, etc.), wasting cycles on changes that
-- can never produce a threat event.

DROP TRIGGER IF EXISTS mcp_servers_threat_trigger ON public.mcp_servers;

CREATE TRIGGER mcp_servers_threat_trigger
  AFTER UPDATE OF is_quarantined, capability_flags, security_score, injection_risk_score
  ON public.mcp_servers
  FOR EACH ROW EXECUTE FUNCTION public.mcp_servers_threat_trigger();
