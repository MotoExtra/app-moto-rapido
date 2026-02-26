
-- Create trigger to update offers.rating and offers.review_count when a new rating is inserted
CREATE OR REPLACE FUNCTION public.update_offer_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating numeric;
  v_review_count integer;
  v_restaurant_id uuid;
BEGIN
  -- Get the restaurant_id (created_by) from the offer
  SELECT created_by INTO v_restaurant_id FROM public.offers WHERE id = NEW.offer_id;
  
  -- Only update for motoboy_to_restaurant ratings (ratings from motoboys about restaurants)
  IF NEW.rating_type = 'motoboy_to_restaurant' THEN
    -- Calculate average rating and count for ALL offers by this restaurant
    SELECT 
      COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0),
      COUNT(r.id)
    INTO v_avg_rating, v_review_count
    FROM public.ratings r
    INNER JOIN public.offers o ON o.id = r.offer_id
    WHERE o.created_by = v_restaurant_id
      AND r.rating_type = 'motoboy_to_restaurant';
    
    -- Update ALL offers by this restaurant with the new average
    UPDATE public.offers 
    SET rating = v_avg_rating, review_count = v_review_count
    WHERE created_by = v_restaurant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_offer_rating_stats ON public.ratings;
CREATE TRIGGER trigger_update_offer_rating_stats
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_offer_rating_stats();
