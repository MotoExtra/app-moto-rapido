
-- Add policy for motoboys to view their own ratings they made
-- This fixes the issue where motoboys cannot check if they already rated
CREATE POLICY "Motoboys can view their own submitted ratings"
ON public.ratings
FOR SELECT
USING (
  rating_type = 'motoboy_to_restaurant' 
  AND motoboy_id = auth.uid()
);
