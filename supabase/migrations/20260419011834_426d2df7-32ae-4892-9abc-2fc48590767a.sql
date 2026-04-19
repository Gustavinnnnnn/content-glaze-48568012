
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE public.video_placement AS ENUM ('home', 'explore', 'shorts');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE public.purchase_type AS ENUM ('vip_global', 'model_subscription');

-- ============================================
-- UTILITY: updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- ============================================
-- ROLES (separate table — anti privilege escalation)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Granular admin permissions (per admin user)
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  can_manage_videos BOOLEAN NOT NULL DEFAULT false,
  can_manage_models BOOLEAN NOT NULL DEFAULT false,
  can_manage_users BOOLEAN NOT NULL DEFAULT false,
  can_manage_admins BOOLEAN NOT NULL DEFAULT false,
  can_view_dashboard BOOLEAN NOT NULL DEFAULT false,
  can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  can_view_sales BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_admin_perms_updated BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security definer functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'super_admin'));
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_super BOOLEAN;
  _has_perm BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') INTO _is_super;
  IF _is_super THEN RETURN true; END IF;
  EXECUTE format('SELECT COALESCE((SELECT %I FROM public.admin_permissions WHERE user_id = $1), false)', _permission)
    INTO _has_perm USING _user_id;
  RETURN _has_perm;
END;
$$;

-- Trigger after user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- MODELS
-- ============================================
CREATE TABLE public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_models_updated BEFORE UPDATE ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- VIDEOS (covers home/explore/regular)
-- ============================================
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration_seconds INTEGER,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  placement video_placement NOT NULL DEFAULT 'home',
  is_vip BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  preview_seconds INTEGER NOT NULL DEFAULT 12,
  view_count INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_videos_updated BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_videos_placement ON public.videos(placement) WHERE is_active;
CREATE INDEX idx_videos_model ON public.videos(model_id);

-- ============================================
-- VIP SUBSCRIPTIONS (global)
-- ============================================
CREATE TABLE public.vip_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vip_subs_updated BEFORE UPDATE ON public.vip_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_vip_subs_user ON public.vip_subscriptions(user_id);

CREATE OR REPLACE FUNCTION public.is_vip(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vip_subscriptions
    WHERE user_id = _user_id AND is_active AND expires_at > now()
  );
$$;

-- ============================================
-- MODEL SUBSCRIPTIONS (per model)
-- ============================================
CREATE TABLE public.model_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.model_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_model_subs_updated BEFORE UPDATE ON public.model_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_model_subs_user ON public.model_subscriptions(user_id);

CREATE OR REPLACE FUNCTION public.is_subscribed_to_model(_user_id UUID, _model_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.model_subscriptions
    WHERE user_id = _user_id AND model_id = _model_id AND is_active AND expires_at > now()
  ) OR public.is_vip(_user_id);
$$;

-- ============================================
-- ORDERS (sales history)
-- ============================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_type purchase_type NOT NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status order_status NOT NULL DEFAULT 'pending',
  duration_days INTEGER NOT NULL DEFAULT 30,
  payment_gateway TEXT,
  gateway_transaction_id TEXT,
  gateway_metadata JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

-- ============================================
-- VIEW HISTORY
-- ============================================
CREATE TABLE public.video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_views_user ON public.video_views(user_id);
CREATE INDEX idx_views_video ON public.video_views(video_id);
CREATE INDEX idx_views_created ON public.video_views(created_at DESC);

-- ============================================
-- SITE SETTINGS (singleton row)
-- ============================================
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL DEFAULT 'Premium',
  site_tagline TEXT,
  logo_url TEXT,
  primary_color TEXT,
  vip_monthly_price NUMERIC(10,2) NOT NULL DEFAULT 49.90,
  vip_duration_days INTEGER NOT NULL DEFAULT 30,
  payment_gateway TEXT,
  payment_gateway_config JSONB DEFAULT '{}'::jsonb,
  support_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_settings (site_name, site_tagline, vip_monthly_price)
  VALUES ('Premium', 'Conteúdo exclusivo, sem limites', 49.90);

-- ============================================
-- RLS POLICIES
-- ============================================

-- profiles: user sees own; admins with manage_users see all
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT USING (public.has_permission(auth.uid(), 'can_manage_users'));
CREATE POLICY "admins update all profiles" ON public.profiles FOR UPDATE USING (public.has_permission(auth.uid(), 'can_manage_users'));

-- user_roles: user sees own; super_admin manages all
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "super_admin manages roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admins view roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));

-- admin_permissions: super_admin only; admin sees own
CREATE POLICY "admin views own perms" ON public.admin_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "super_admin manages perms" ON public.admin_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- categories: public read; admin manage
CREATE POLICY "public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL
  USING (public.has_permission(auth.uid(), 'can_manage_videos'))
  WITH CHECK (public.has_permission(auth.uid(), 'can_manage_videos'));

-- models: public read active; admin manage
CREATE POLICY "public read active models" ON public.models FOR SELECT USING (is_active);
CREATE POLICY "admins read all models" ON public.models FOR SELECT USING (public.has_permission(auth.uid(), 'can_manage_models'));
CREATE POLICY "admins manage models" ON public.models FOR ALL
  USING (public.has_permission(auth.uid(), 'can_manage_models'))
  WITH CHECK (public.has_permission(auth.uid(), 'can_manage_models'));

-- videos: public read active; admin manage
CREATE POLICY "public read active videos" ON public.videos FOR SELECT USING (is_active);
CREATE POLICY "admins read all videos" ON public.videos FOR SELECT USING (public.has_permission(auth.uid(), 'can_manage_videos'));
CREATE POLICY "admins manage videos" ON public.videos FOR ALL
  USING (public.has_permission(auth.uid(), 'can_manage_videos'))
  WITH CHECK (public.has_permission(auth.uid(), 'can_manage_videos'));

-- vip_subscriptions: user sees own; admin manage_users sees/grants
CREATE POLICY "users view own vip" ON public.vip_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins manage vip" ON public.vip_subscriptions FOR ALL
  USING (public.has_permission(auth.uid(), 'can_manage_users'))
  WITH CHECK (public.has_permission(auth.uid(), 'can_manage_users'));

-- model_subscriptions: user sees own; admin manage_users sees all
CREATE POLICY "users view own model subs" ON public.model_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins view all model subs" ON public.model_subscriptions FOR SELECT USING (public.has_permission(auth.uid(), 'can_manage_users'));
CREATE POLICY "admins manage model subs" ON public.model_subscriptions FOR ALL
  USING (public.has_permission(auth.uid(), 'can_manage_users'))
  WITH CHECK (public.has_permission(auth.uid(), 'can_manage_users'));

-- orders: user sees own; admin view_sales sees all; admin manage updates
CREATE POLICY "users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins view all orders" ON public.orders FOR SELECT USING (public.has_permission(auth.uid(), 'can_view_sales'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE USING (public.has_permission(auth.uid(), 'can_view_sales'));

-- video_views: user sees own; admin dashboard sees all
CREATE POLICY "users view own history" ON public.video_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own views" ON public.video_views FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "admins view all views" ON public.video_views FOR SELECT USING (public.has_permission(auth.uid(), 'can_view_dashboard'));

-- site_settings: public read (for site name etc); admin update
CREATE POLICY "public read settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "admins update settings" ON public.site_settings FOR UPDATE USING (public.has_permission(auth.uid(), 'can_manage_settings'));

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('models', 'models', true),
  ('videos', 'videos', true),
  ('site', 'site', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read models bucket" ON storage.objects FOR SELECT USING (bucket_id = 'models');
CREATE POLICY "admins write models bucket" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'models' AND public.has_permission(auth.uid(), 'can_manage_models'));
CREATE POLICY "admins update models bucket" ON storage.objects FOR UPDATE
  USING (bucket_id = 'models' AND public.has_permission(auth.uid(), 'can_manage_models'));
CREATE POLICY "admins delete models bucket" ON storage.objects FOR DELETE
  USING (bucket_id = 'models' AND public.has_permission(auth.uid(), 'can_manage_models'));

CREATE POLICY "public read videos bucket" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "admins write videos bucket" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND public.has_permission(auth.uid(), 'can_manage_videos'));
CREATE POLICY "admins update videos bucket" ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos' AND public.has_permission(auth.uid(), 'can_manage_videos'));
CREATE POLICY "admins delete videos bucket" ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND public.has_permission(auth.uid(), 'can_manage_videos'));

CREATE POLICY "public read site bucket" ON storage.objects FOR SELECT USING (bucket_id = 'site');
CREATE POLICY "admins write site bucket" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site' AND public.has_permission(auth.uid(), 'can_manage_settings'));
CREATE POLICY "admins update site bucket" ON storage.objects FOR UPDATE
  USING (bucket_id = 'site' AND public.has_permission(auth.uid(), 'can_manage_settings'));
