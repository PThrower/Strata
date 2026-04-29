-- Allow ecosystems to be looked up by alternative slugs.
-- Agents commonly guess hyphenated forms (e.g. "claude-code") when the canonical
-- slug omits the hyphen ("claudecode"). Aliases let both forms resolve correctly.

ALTER TABLE public.ecosystems
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

-- Index so alias lookups stay fast.
CREATE INDEX IF NOT EXISTS idx_ecosystems_aliases
  ON public.ecosystems USING GIN (aliases);

-- Seed known aliases.
UPDATE public.ecosystems SET aliases = ARRAY['claude-code'] WHERE slug = 'claudecode';
UPDATE public.ecosystems SET aliases = ARRAY['together-ai', 'together_ai'] WHERE slug = 'togetherai';
UPDATE public.ecosystems SET aliases = ARRAY['you-com', 'you_com'] WHERE slug = 'youcom';
