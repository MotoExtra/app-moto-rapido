-- Add foreign key from external_restaurant_ratings to profiles
ALTER TABLE public.external_restaurant_ratings
ADD CONSTRAINT external_restaurant_ratings_motoboy_id_fkey
FOREIGN KEY (motoboy_id) REFERENCES public.profiles(id) ON DELETE CASCADE;