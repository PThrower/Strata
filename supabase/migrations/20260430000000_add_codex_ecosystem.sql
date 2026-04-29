INSERT INTO public.ecosystems (slug, name, vendor, version, available_on_free)
VALUES ('codex', 'Codex', 'OpenAI', 'latest', false)
ON CONFLICT (slug) DO NOTHING;

UPDATE public.ecosystems
  SET aliases = ARRAY['openai-codex', 'codex-cli']
  WHERE slug = 'codex';
