
-- Create trigger function that awards XP when an extra is completed
CREATE OR REPLACE FUNCTION public.trigger_on_extra_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city TEXT;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    
    -- Check if XP was already awarded for this offer (prevent duplicates)
    SELECT EXISTS (
      SELECT 1 FROM xp_history
      WHERE user_id = NEW.user_id
        AND offer_id = NEW.offer_id
        AND event_type IN ('completion', 'peak_completion')
    ) INTO v_already_rewarded;
    
    IF NOT v_already_rewarded THEN
      -- Get city from the offer
      SELECT city INTO v_city FROM offers WHERE id = NEW.offer_id;
      
      -- Call the existing completion function
      PERFORM complete_extra_with_peak_bonus(NEW.user_id, NEW.offer_id, v_city);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_award_xp_on_completion ON public.accepted_offers;
CREATE TRIGGER trigger_award_xp_on_completion
AFTER UPDATE ON public.accepted_offers
FOR EACH ROW
EXECUTE FUNCTION public.trigger_on_extra_completed();
