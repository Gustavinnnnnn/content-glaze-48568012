-- Allow admins to upload/update/delete in the public buckets used by the panel
DO $$ BEGIN
  CREATE POLICY "admins upload site assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('videos','models','site')
    AND public.is_admin(auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admins update site assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('videos','models','site') AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id IN ('videos','models','site') AND public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admins delete site assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('videos','models','site') AND public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public read site buckets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('videos','models','site'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;