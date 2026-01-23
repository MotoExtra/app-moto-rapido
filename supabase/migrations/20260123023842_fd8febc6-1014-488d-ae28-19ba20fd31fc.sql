
-- Create trigger function to auto-award XP on rating insert
CREATE OR REPLACE FUNCTION public.auto_award_rating_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only award XP for restaurant_to_motoboy ratings
  IF NEW.rating_type = 'restaurant_to_motoboy' AND NEW.motoboy_id IS NOT NULL THEN
    PERFORM public.record_rating_xp(NEW.motoboy_id, NEW.rating);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on ratings table
DROP TRIGGER IF EXISTS trigger_auto_award_rating_xp ON public.ratings;

CREATE TRIGGER trigger_auto_award_rating_xp
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_award_rating_xp();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_award_rating_xp() IS 'Automatically awards XP to motoboys when they receive ratings from restaurants. 5 stars = +15 XP, 4 stars = +8 XP, 3 stars = 0 XP, 2 or less = -20 XP';
