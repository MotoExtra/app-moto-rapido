-- Enable unaccent extension for name normalization
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create external_restaurants table
CREATE TABLE public.external_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  avg_rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(normalized_name, city)
);

-- Create external_restaurant_ratings table
CREATE TABLE public.external_restaurant_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_restaurant_id UUID NOT NULL REFERENCES external_restaurants(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  motoboy_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(offer_id, motoboy_id)
);

-- Add external_restaurant_id to offers table
ALTER TABLE public.offers 
ADD COLUMN external_restaurant_id UUID REFERENCES external_restaurants(id);

-- Enable RLS on new tables
ALTER TABLE public.external_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_restaurant_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_restaurants
CREATE POLICY "Anyone can view external restaurants"
ON public.external_restaurants FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert external restaurants"
ON public.external_restaurants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for external_restaurant_ratings
CREATE POLICY "Motoboys can view all external restaurant ratings"
ON public.external_restaurant_ratings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() AND user_type = 'motoboy'
));

CREATE POLICY "Motoboys can rate external restaurants"
ON public.external_restaurant_ratings FOR INSERT
WITH CHECK (
  auth.uid() = motoboy_id AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND user_type = 'motoboy'
  )
);

-- Function to find or create external restaurant
CREATE OR REPLACE FUNCTION public.find_or_create_external_restaurant(
  p_name TEXT,
  p_city TEXT,
  p_address TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_restaurant_id UUID;
BEGIN
  -- Normalize the name (lowercase, remove accents, trim)
  v_normalized := lower(unaccent(trim(p_name)));
  
  -- Try to find existing restaurant
  SELECT id INTO v_restaurant_id
  FROM external_restaurants
  WHERE normalized_name = v_normalized 
    AND (city = p_city OR (city IS NULL AND p_city IS NULL));
  
  -- If not found, create new one
  IF v_restaurant_id IS NULL THEN
    INSERT INTO external_restaurants (name, normalized_name, city, address)
    VALUES (trim(p_name), v_normalized, p_city, p_address)
    RETURNING id INTO v_restaurant_id;
  END IF;
  
  RETURN v_restaurant_id;
END;
$$;

-- Trigger function to update avg_rating and review_count
CREATE OR REPLACE FUNCTION public.update_external_restaurant_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE external_restaurants
  SET 
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM external_restaurant_ratings
      WHERE external_restaurant_id = NEW.external_restaurant_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM external_restaurant_ratings
      WHERE external_restaurant_id = NEW.external_restaurant_id
    )
  WHERE id = NEW.external_restaurant_id;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_update_external_restaurant_rating
AFTER INSERT ON public.external_restaurant_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_external_restaurant_rating();