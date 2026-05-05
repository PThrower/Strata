-- Null out hosted_endpoint values that are registry/docs pages rather than live MCP endpoints.
-- These were written by README endpoint pattern matching which matched modelcontextprotocol.io
-- subdomains indiscriminately. 62 of 69 rows with hosted_endpoint are affected.
--
-- Patterns nulled:
--   registry.modelcontextprotocol.io  — MCP Registry search/listing pages
--   spec.modelcontextprotocol.io      — MCP specification docs
--   /v0/servers?search=               — registry search query URLs
--   trailing backtick                 — malformed URL from README scraping

UPDATE public.mcp_servers
SET hosted_endpoint = NULL
WHERE hosted_endpoint LIKE '%registry.modelcontextprotocol.io%'
   OR hosted_endpoint LIKE '%spec.modelcontextprotocol.io%'
   OR hosted_endpoint LIKE '%/v0/servers?search=%'
   OR hosted_endpoint LIKE '%`%';
