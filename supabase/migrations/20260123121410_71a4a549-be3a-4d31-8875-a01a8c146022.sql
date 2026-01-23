-- Create a separate table for activation notifications to avoid constraint conflicts
CREATE TABLE IF NOT EXISTS public.activation_notifications_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.activation_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to activation_notifications" 
ON public.activation_notifications_sent 
FOR ALL 
USING (true) 
WITH CHECK (true);