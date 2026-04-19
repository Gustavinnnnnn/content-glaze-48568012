-- 1. Promote the existing user to super_admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('8e1ddb35-5f55-45ed-96b2-06e273af64f5', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Grant all admin permissions to this user (so the panel shows everything)
INSERT INTO public.admin_permissions (
  user_id,
  can_manage_videos,
  can_manage_models,
  can_manage_users,
  can_manage_admins,
  can_view_dashboard,
  can_manage_settings,
  can_view_sales
) VALUES (
  '8e1ddb35-5f55-45ed-96b2-06e273af64f5',
  true, true, true, true, true, true, true
)
ON CONFLICT (user_id) DO UPDATE SET
  can_manage_videos = true,
  can_manage_models = true,
  can_manage_users = true,
  can_manage_admins = true,
  can_view_dashboard = true,
  can_manage_settings = true,
  can_view_sales = true;

-- 2. Auto-promote first signup to super_admin if no super_admin exists yet
CREATE OR REPLACE FUNCTION public.handle_first_super_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'super_admin')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.admin_permissions (
      user_id, can_manage_videos, can_manage_models, can_manage_users,
      can_manage_admins, can_view_dashboard, can_manage_settings, can_view_sales
    ) VALUES (
      NEW.user_id, true, true, true, true, true, true, true
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_first_super_admin ON public.profiles;
CREATE TRIGGER on_first_super_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_first_super_admin();

-- 3. Ensure unique constraint for admin_permissions.user_id (needed for ON CONFLICT)
DO $$ BEGIN
  ALTER TABLE public.admin_permissions ADD CONSTRAINT admin_permissions_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;

-- 4. Ensure unique constraint for user_roles (user_id, role)
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
EXCEPTION WHEN duplicate_table THEN NULL;
WHEN duplicate_object THEN NULL;
END $$;