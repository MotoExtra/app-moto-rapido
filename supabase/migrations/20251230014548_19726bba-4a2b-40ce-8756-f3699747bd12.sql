-- Remove the unique constraint on offer_id that prevents multiple ratings per offer
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_offer_id_key;

-- Create a new unique constraint that allows one rating per offer per rating_type
-- This ensures a motoboy can rate a restaurant AND a restaurant can rate a motoboy for the same offer
ALTER TABLE public.ratings ADD CONSTRAINT ratings_offer_id_rating_type_unique UNIQUE (offer_id, rating_type);