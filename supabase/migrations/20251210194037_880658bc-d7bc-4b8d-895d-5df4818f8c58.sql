-- Add rating_type column to ratings table
ALTER TABLE public.ratings 
ADD COLUMN rating_type text NOT NULL DEFAULT 'restaurant_to_motoboy';

-- Make motoboy_id nullable for restaurant ratings
ALTER TABLE public.ratings 
ALTER COLUMN motoboy_id DROP NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Motoboys can view their own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Restaurants can insert ratings for their offers" ON public.ratings;
DROP POLICY IF EXISTS "Restaurants can view their ratings" ON public.ratings;

-- New RLS policies for bidirectional ratings

-- Restaurants can insert ratings for motoboys
CREATE POLICY "Restaurants can rate motoboys"
ON public.ratings
FOR INSERT
WITH CHECK (
  auth.uid() = restaurant_id 
  AND rating_type = 'restaurant_to_motoboy'
);

-- Motoboys can insert ratings for restaurants
CREATE POLICY "Motoboys can rate restaurants"
ON public.ratings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND rating_type = 'motoboy_to_restaurant'
  AND motoboy_id = auth.uid()
);

-- Restaurants can view ratings from OTHER restaurants about motoboys (not their own)
CREATE POLICY "Restaurants can view motoboy ratings from others"
ON public.ratings
FOR SELECT
USING (
  rating_type = 'restaurant_to_motoboy'
  AND EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = auth.uid()
  )
);

-- Motoboys can view ratings from OTHER motoboys about restaurants
CREATE POLICY "Motoboys can view restaurant ratings from others"
ON public.ratings
FOR SELECT
USING (
  rating_type = 'motoboy_to_restaurant'
  AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'motoboy'
  )
);