
CREATE TABLE public.access_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_access_fees_order ON public.access_fees(display_order) WHERE is_active;
ALTER TABLE public.access_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active fees" ON public.access_fees FOR SELECT USING (is_active);
CREATE POLICY "admins read all fees" ON public.access_fees FOR SELECT USING (public.has_permission(auth.uid(), 'can_manage_settings'));
CREATE POLICY "admins manage fees" ON public.access_fees FOR ALL USING (public.has_permission(auth.uid(), 'can_manage_settings')) WITH CHECK (public.has_permission(auth.uid(), 'can_manage_settings'));
CREATE TRIGGER trg_access_fees_updated BEFORE UPDATE ON public.access_fees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_fee_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fee_id UUID NOT NULL REFERENCES public.access_fees(id) ON DELETE CASCADE,
  order_id UUID,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, fee_id)
);
CREATE INDEX idx_user_fee_progress_user ON public.user_fee_progress(user_id);
ALTER TABLE public.user_fee_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own progress" ON public.user_fee_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins view all progress" ON public.user_fee_progress FOR SELECT USING (public.has_permission(auth.uid(), 'can_manage_users'));
CREATE POLICY "admins manage progress" ON public.user_fee_progress FOR ALL USING (public.has_permission(auth.uid(), 'can_manage_users')) WITH CHECK (public.has_permission(auth.uid(), 'can_manage_users'));
CREATE POLICY "users insert own progress" ON public.user_fee_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fee_id UUID REFERENCES public.access_fees(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_reason TEXT;

CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_banned FROM public.profiles WHERE user_id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.next_pending_fee(_user_id UUID)
RETURNS TABLE (
  fee_id UUID,
  name TEXT,
  description TEXT,
  amount NUMERIC,
  display_order INTEGER,
  step_index INTEGER,
  total_steps INTEGER
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH active AS (
    SELECT f.*, ROW_NUMBER() OVER (ORDER BY f.display_order, f.created_at) AS pos,
           COUNT(*) OVER () AS tot
    FROM public.access_fees f WHERE f.is_active
  )
  SELECT a.id, a.name, a.description, a.amount, a.display_order, a.pos::INT, a.tot::INT
  FROM active a
  WHERE NOT EXISTS (SELECT 1 FROM public.user_fee_progress p WHERE p.user_id = _user_id AND p.fee_id = a.id)
  ORDER BY a.display_order, a.created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.delete_user_account(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admin can delete users';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;
