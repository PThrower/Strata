-- 16 new Pro-tier ecosystems
INSERT INTO public.ecosystems (slug, name, vendor, available_on_free)
VALUES
  -- AI Coding Tools
  ('cursor',      'Cursor',       'Anysphere',        false),
  ('claudecode',  'Claude Code',  'Anthropic',        false),
  ('windsurf',    'Windsurf',     'Codeium',          false),
  ('copilot',     'Copilot',      'Microsoft',        false),
  ('cody',        'Cody',         'Sourcegraph',      false),
  -- AI Search & Research
  ('perplexity',  'Perplexity',   'Perplexity',       false),
  ('youcom',      'You.com',      'You.com',          false),
  ('exa',         'Exa',          'Exa',              false),
  -- AI Infrastructure
  ('replicate',   'Replicate',    'Replicate',        false),
  ('togetherai',  'Together.ai',  'Together',         false),
  ('groq',        'Groq',         'Groq',             false),
  ('fireworks',   'Fireworks',    'Fireworks AI',     false),
  -- AI Agents & Media
  ('manus',       'Manus',        'Butterfly Effect', false),
  ('higgsfield',  'Higgsfield',   'Higgsfield AI',    false),
  ('v0',          'v0',           'Vercel',           false),
  ('bolt',        'Bolt',         'StackBlitz',       false)
ON CONFLICT (slug) DO NOTHING;
