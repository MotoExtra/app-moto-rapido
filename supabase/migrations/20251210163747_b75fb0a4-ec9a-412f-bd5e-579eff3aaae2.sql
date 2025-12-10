-- Create ratings table for restaurant to motoboy reviews
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  motoboy_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(offer_id)
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Restaurants can insert ratings for their completed offers
CREATE POLICY "Restaurants can insert ratings for their offers"
ON public.ratings
FOR INSERT
WITH CHECK (auth.uid() = restaurant_id);

-- Restaurants can view ratings they created
CREATE POLICY "Restaurants can view their ratings"
ON public.ratings
FOR SELECT
USING (auth.uid() = restaurant_id);

-- Motoboys can view ratings about themselves
CREATE POLICY "Motoboys can view their own ratings"
ON public.ratings
FOR SELECT
USING (auth.uid() = motoboy_id);

-- Create index for faster queries
CREATE INDEX idx_ratings_motoboy_id ON public.ratings(motoboy_id);
CREATE INDEX idx_ratings_restaurant_id ON public.ratings(restaurant_id);