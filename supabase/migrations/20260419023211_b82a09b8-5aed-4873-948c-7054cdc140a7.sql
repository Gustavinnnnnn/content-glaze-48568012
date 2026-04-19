
-- Telegram bot configuration (singleton)
CREATE TABLE public.telegram_config (
  id INT PRIMARY KEY CHECK (id = 1),
  bot_token TEXT,
  bot_username TEXT,
  bot_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  vip_channel_id TEXT,
  vip_channel_invite_link TEXT,
  welcome_message TEXT DEFAULT 'Olá! Bem-vindo ao nosso bot.',
  vip_welcome_message TEXT DEFAULT 'Bem-vindo ao VIP! Aqui está seu acesso exclusivo.',
  notify_on_new_sale BOOLEAN NOT NULL DEFAULT true,
  notify_on_new_user BOOLEAN NOT NULL DEFAULT true,
  notify_on_new_vip BOOLEAN NOT NULL DEFAULT true,
  admin_chat_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  update_offset BIGINT NOT NULL DEFAULT 0,
  last_polled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_config (id) VALUES (1);

ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read telegram config"
  ON public.telegram_config FOR SELECT
  USING (has_permission(auth.uid(), 'can_manage_settings'));

CREATE POLICY "admins update telegram config"
  ON public.telegram_config FOR UPDATE
  USING (has_permission(auth.uid(), 'can_manage_settings'));

CREATE TRIGGER telegram_config_updated_at
  BEFORE UPDATE ON public.telegram_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Telegram users (people who messaged the bot)
CREATE TABLE public.telegram_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL UNIQUE,
  telegram_user_id BIGINT,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  user_id UUID,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_users_chat ON public.telegram_users(chat_id);
CREATE INDEX idx_telegram_users_user ON public.telegram_users(user_id);

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage telegram users"
  ON public.telegram_users FOR ALL
  USING (has_permission(auth.uid(), 'can_manage_settings'))
  WITH CHECK (has_permission(auth.uid(), 'can_manage_settings'));

CREATE TRIGGER telegram_users_updated_at
  BEFORE UPDATE ON public.telegram_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Telegram messages (incoming + outgoing)
CREATE TABLE public.telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id BIGINT UNIQUE,
  chat_id BIGINT NOT NULL,
  message_id BIGINT,
  direction TEXT NOT NULL CHECK (direction IN ('incoming','outgoing')),
  text TEXT,
  raw JSONB,
  sent_by UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat ON public.telegram_messages(chat_id, created_at DESC);
CREATE INDEX idx_telegram_messages_unread ON public.telegram_messages(is_read) WHERE is_read = false;

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage telegram messages"
  ON public.telegram_messages FOR ALL
  USING (has_permission(auth.uid(), 'can_manage_settings'))
  WITH CHECK (has_permission(auth.uid(), 'can_manage_settings'));

-- Notification queue (sales, signups, vip events)
CREATE TABLE public.telegram_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_notif_pending ON public.telegram_notifications(status, created_at) WHERE status = 'pending';

ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read telegram notifications"
  ON public.telegram_notifications FOR SELECT
  USING (has_permission(auth.uid(), 'can_manage_settings'));

-- Trigger: enqueue notification on new paid order
CREATE OR REPLACE FUNCTION public.notify_telegram_on_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cfg RECORD;
BEGIN
  SELECT is_active, notify_on_new_sale, notify_on_new_vip INTO _cfg FROM public.telegram_config WHERE id = 1;
  IF NOT FOUND OR NOT _cfg.is_active THEN RETURN NEW; END IF;
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    IF _cfg.notify_on_new_sale THEN
      INSERT INTO public.telegram_notifications (event_type, payload)
      VALUES ('new_sale', jsonb_build_object('order_id', NEW.id, 'amount', NEW.amount, 'currency', NEW.currency, 'purchase_type', NEW.purchase_type, 'user_id', NEW.user_id));
    END IF;
    IF NEW.purchase_type = 'vip_global' AND _cfg.notify_on_new_vip THEN
      INSERT INTO public.telegram_notifications (event_type, payload)
      VALUES ('new_vip', jsonb_build_object('order_id', NEW.id, 'user_id', NEW.user_id));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_telegram_on_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_on_order();

-- Trigger: enqueue on new user signup
CREATE OR REPLACE FUNCTION public.notify_telegram_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cfg RECORD;
BEGIN
  SELECT is_active, notify_on_new_user INTO _cfg FROM public.telegram_config WHERE id = 1;
  IF NOT FOUND OR NOT _cfg.is_active OR NOT _cfg.notify_on_new_user THEN RETURN NEW; END IF;
  INSERT INTO public.telegram_notifications (event_type, payload)
  VALUES ('new_user', jsonb_build_object('user_id', NEW.user_id, 'email', NEW.email, 'display_name', NEW.display_name));
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_telegram_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_on_signup();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_notifications;
