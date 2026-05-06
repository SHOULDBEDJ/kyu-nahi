-- Create whatsapp_templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    content text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all actions for authenticated users on whatsapp_templates" 
ON public.whatsapp_templates 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Add some default templates
INSERT INTO public.whatsapp_templates (name, content, description)
VALUES 
('Booking Confirmation', 'Namaste {{name}}, your booking for {{date}} at {{slot}} is confirmed!', 'Sent when a new booking is confirmed'),
('Payment Reminder', 'Dear {{name}}, a friendly reminder regarding the balance payment for your booking on {{date}}.', 'Sent as a follow-up for pending payments')
ON CONFLICT DO NOTHING;
