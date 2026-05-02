ALTER TABLE public.mcp_servers
  ADD COLUMN IF NOT EXISTS submitter_email text;
