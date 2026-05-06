-- Fix RLS policies for activity_log to allow anonymous login and auto-provisioning
-- This is required because the login page needs to check for 'Internal Auth' users 
-- before a session is established.

-- 1. Allow reading INTERNAL_AUTH logs for anyone (needed to verify passwords)
DROP POLICY IF EXISTS "al_read_vault" ON public.activity_log;
CREATE POLICY "al_read_vault" 
ON public.activity_log 
FOR SELECT 
USING (module = 'INTERNAL_AUTH');

-- 2. Allow inserting INTERNAL_AUTH logs for anyone (needed for auto-provisioning)
DROP POLICY IF EXISTS "al_insert_vault" ON public.activity_log;
CREATE POLICY "al_insert_vault" 
ON public.activity_log 
FOR INSERT 
WITH CHECK (module = 'INTERNAL_AUTH');

-- 3. Update the original policy to ensure it doesn't conflict
-- The original 'al_insert' was 'to authenticated', we change it to 'all' or keep it 
-- as 'authenticated' while our new policy handles 'anon'.
-- Supabase policies are additive (OR), so 'anon' will match 'al_insert_vault'.
