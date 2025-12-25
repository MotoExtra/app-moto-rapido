-- Create snack_exchanges table
CREATE TABLE public.snack_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  offering TEXT NOT NULL,
  wanting TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  matched_by UUID,
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '8 hours')
);

-- Enable RLS
ALTER TABLE public.snack_exchanges ENABLE ROW LEVEL SECURITY;

-- Motoboys can view available exchanges in their city
CREATE POLICY "Motoboys can view available exchanges"
ON public.snack_exchanges
FOR SELECT
USING (
  status = 'available' 
  AND expires_at > now()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'motoboy'
  )
);

-- Users can view their own exchanges
CREATE POLICY "Users can view their own exchanges"
ON public.snack_exchanges
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own exchanges
CREATE POLICY "Users can create their own exchanges"
ON public.snack_exchanges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own exchanges
CREATE POLICY "Users can update their own exchanges"
ON public.snack_exchanges
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own exchanges
CREATE POLICY "Users can delete their own exchanges"
ON public.snack_exchanges
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.snack_exchanges;