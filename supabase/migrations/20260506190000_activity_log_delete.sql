-- Allow admins to delete and update activity_log entries (e.g. for drafts)
DROP POLICY IF EXISTS "al_admin_all" ON public.activity_log;
CREATE POLICY "al_admin_all" 
ON public.activity_log 
FOR ALL
TO authenticated
USING (public.has_any_admin_role(auth.uid()))
WITH CHECK (public.has_any_admin_role(auth.uid()));

-- Allow anonymous users (Vault users) to manage their drafts
DROP POLICY IF EXISTS "al_anon_drafts" ON public.activity_log;
CREATE POLICY "al_anon_drafts" 
ON public.activity_log 
FOR ALL
TO anon
USING (module = 'BOOKING_DRAFT')
WITH CHECK (module = 'BOOKING_DRAFT');

-- Also allow anon to update their internal auth data (needed for password changes if they are vault users)
DROP POLICY IF EXISTS "al_anon_vault_update" ON public.activity_log;
CREATE POLICY "al_anon_vault_update" 
ON public.activity_log 
FOR UPDATE
TO anon
USING (module = 'INTERNAL_AUTH')
WITH CHECK (module = 'INTERNAL_AUTH');
