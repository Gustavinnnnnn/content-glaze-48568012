UPDATE public.site_settings SET vip_monthly_price = 19.90;
ALTER TABLE public.site_settings ALTER COLUMN vip_monthly_price SET DEFAULT 19.90;
UPDATE public.models SET monthly_price = 19.90;
ALTER TABLE public.models ALTER COLUMN monthly_price SET DEFAULT 19.90;
INSERT INTO public.site_settings (site_name, vip_monthly_price, vip_duration_days)
SELECT 'Privacy BR', 19.90, 30
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);