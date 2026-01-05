-- Create table to track sent rating notifications (to avoid duplicate notifications)
CREATE TABLE IF NOT EXISTS public.rating_notifications_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('restaurant', 'motoboy')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(offer_id, user_id, user_type)
);

-- Enable RLS
ALTER TABLE public.rating_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Create policy for service role only (edge functions)
CREATE POLICY "Service role can manage rating notifications"
ON public.rating_notifications_sent
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_rating_notifications_offer_user ON public.rating_notifications_sent(offer_id, user_id);

-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;