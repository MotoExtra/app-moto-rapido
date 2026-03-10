
-- Make restaurant_id nullable for motoboy-to-motoboy ratings
ALTER TABLE public.ratings ALTER COLUMN restaurant_id DROP NOT NULL;

-- Drop the existing foreign key constraint on restaurant_id
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_restaurant_id_fkey;

-- Re-add it but allow NULL values (FK only enforced when value is not null)
ALTER TABLE public.ratings ADD CONSTRAINT ratings_restaurant_id_fkey 
  FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id);

-- Add RLS policy for motoboys to insert motoboy-to-motoboy ratings
CREATE POLICY "Motoboys can rate other motoboys"
  ON public.ratings
  FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND rating_type = 'restaurant_to_motoboy'
    AND restaurant_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'motoboy'
    )
  );

-- Add RLS policy for motoboys to view their own motoboy-to-motoboy ratings
CREATE POLICY "Motoboys can view their submitted motoboy ratings"
  ON public.ratings
  FOR SELECT
  TO public
  USING (
    rating_type = 'restaurant_to_motoboy'
    AND restaurant_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = ratings.offer_id
      AND o.created_by = auth.uid()
    )
  );
