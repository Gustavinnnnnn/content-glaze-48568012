
ALTER TABLE public.telegram_config
  ADD COLUMN IF NOT EXISTS mini_app_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- generate a default secret
UPDATE public.telegram_config SET webhook_secret = encode(gen_random_bytes(24), 'hex') WHERE webhook_secret IS NULL;
