-- 16 new Pro-tier ecosystems
INSERT INTO public.ecosystems (slug, name, vendor, version, available_on_free)
VALUES
  -- AI Coding Tools
  ('cursor',      'Cursor',       'Anysphere',        'latest', false),
  ('claudecode',  'Claude Code',  'Anthropic',        'latest', false),
  ('windsurf',    'Windsurf',     'Codeium',          'latest', false),
  ('copilot',     'Copilot',      'Microsoft',        'latest', false),
  ('cody',        'Cody',         'Sourcegraph',      'latest', false),
  -- AI Search & Research
  ('perplexity',  'Perplexity',   'Perplexity',       'latest', false),
  ('youcom',      'You.com',      'You.com',          'latest', false),
  ('exa',         'Exa',          'Exa',              'latest', false),
  -- AI Infrastructure
  ('replicate',   'Replicate',    'Replicate',        'latest', false),
  ('togetherai',  'Together.ai',  'Together',         'latest', false),
  ('groq',        'Groq',         'Groq',             'latest', false),
  ('fireworks',   'Fireworks',    'Fireworks AI',     'latest', false),
  -- AI Agents & Media
  ('manus',       'Manus',        'Butterfly Effect', 'latest', false),
  ('higgsfield',  'Higgsfield',   'Higgsfield AI',    'latest', false),
  ('v0',          'v0',           'Vercel',           'latest', false),
  ('bolt',        'Bolt',         'StackBlitz',       'latest', false)
ON CONFLICT (slug) DO NOTHING;
