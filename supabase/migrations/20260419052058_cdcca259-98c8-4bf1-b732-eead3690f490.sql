ALTER TABLE public.telegram_config
  ADD COLUMN IF NOT EXISTS button_content_label text DEFAULT '🎬 Conteúdo',
  ADD COLUMN IF NOT EXISTS button_content_path text DEFAULT '/#explore',
  ADD COLUMN IF NOT EXISTS button_app_label text DEFAULT '📱 Aplicativo',
  ADD COLUMN IF NOT EXISTS button_app_path text DEFAULT '/',
  ADD COLUMN IF NOT EXISTS button_models_label text DEFAULT '🔥 Modelos',
  ADD COLUMN IF NOT EXISTS button_models_path text DEFAULT '/#models';