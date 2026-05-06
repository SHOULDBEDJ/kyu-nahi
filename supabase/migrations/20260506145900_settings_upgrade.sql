-- Add missing columns to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS tagline TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS maps_link TEXT,
ADD COLUMN IF NOT EXISTS dark_logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS watermark_url TEXT,
ADD COLUMN IF NOT EXISTS login_bg_url TEXT,
ADD COLUMN IF NOT EXISTS min_advance_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_partial_payment BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS enable_discounts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS whatsapp_template_booking TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_template_payment TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_template_cancel TEXT,
ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '₹',
ADD COLUMN IF NOT EXISTS currency_position TEXT DEFAULT 'prefix', -- 'prefix' or 'suffix'
ADD COLUMN IF NOT EXISTS financial_year_start DATE DEFAULT '2024-04-01',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#001F3F';

-- Create backup_history table
CREATE TABLE IF NOT EXISTS backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    size INTEGER NOT NULL, -- in bytes
    type TEXT NOT NULL, -- 'JSON', 'CSV', 'SQL'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on backup_history
ALTER TABLE backup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmins can manage backup history" 
ON backup_history 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'SuperAdmin'
    )
);
