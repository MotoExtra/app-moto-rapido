-- Add created_by field to track who created the offer
ALTER TABLE public.offers ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Add offer_type to distinguish between restaurant and motoboy offers
ALTER TABLE public.offers ADD COLUMN offer_type text DEFAULT 'restaurant';

-- Update RLS policy to allow authenticated users to insert offers
DROP POLICY IF EXISTS "Sistema pode inserir ofertas" ON public.offers;

CREATE POLICY "Authenticated users can insert offers"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update existing offers to have restaurant type
UPDATE public.offers SET offer_type = 'restaurant' WHERE offer_type IS NULL;