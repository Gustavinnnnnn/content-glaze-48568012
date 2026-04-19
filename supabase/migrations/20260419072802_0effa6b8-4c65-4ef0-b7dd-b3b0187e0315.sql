-- Photos gallery for each model (managed by admins, viewable by everyone)
CREATE TABLE public.model_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  is_vip BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_model_photos_model ON public.model_photos(model_id, display_order);

ALTER TABLE public.model_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read model photos"
  ON public.model_photos FOR SELECT
  USING (true);

CREATE POLICY "admins manage model photos"
  ON public.model_photos FOR ALL
  USING (has_permission(auth.uid(), 'can_manage_models'))
  WITH CHECK (has_permission(auth.uid(), 'can_manage_models'));

CREATE TRIGGER set_model_photos_updated_at
  BEFORE UPDATE ON public.model_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();