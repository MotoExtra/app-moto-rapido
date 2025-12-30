-- First, add columns for accept + confirm flow
ALTER TABLE public.snack_exchanges 
ADD COLUMN IF NOT EXISTS accepted_by uuid,
ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

-- Add foreign key constraint
ALTER TABLE public.snack_exchanges 
ADD CONSTRAINT snack_exchanges_accepted_by_fkey 
FOREIGN KEY (accepted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update RLS policy to allow accepted_by user to view the exchange
DROP POLICY IF EXISTS "Motoboys can view available exchanges" ON public.snack_exchanges;

CREATE POLICY "Motoboys can view available or accepted exchanges" 
ON public.snack_exchanges 
FOR SELECT 
USING (
  (status = 'available' AND expires_at > now() AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'motoboy'
  ))
  OR auth.uid() = user_id
  OR auth.uid() = accepted_by
);

-- Allow motoboys to update exchange when accepting (only if status is available)
DROP POLICY IF EXISTS "Users can update their own exchanges" ON public.snack_exchanges;

CREATE POLICY "Users can update exchanges for accept/confirm flow" 
ON public.snack_exchanges 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR (status = 'available' AND auth.uid() IS NOT NULL)
  OR auth.uid() = accepted_by
);