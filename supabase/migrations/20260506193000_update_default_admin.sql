-- Update existing default admin credentials if they exist
UPDATE public.activity_log
SET detail = jsonb_set(
  jsonb_set(detail::jsonb, '{username}', '"narayansolanke"'),
  '{password}', '"narayansolanke"'
)::text
WHERE module = 'INTERNAL_AUTH' 
  AND action = 'USER_DATA' 
  AND detail LIKE '%admin-001%';
