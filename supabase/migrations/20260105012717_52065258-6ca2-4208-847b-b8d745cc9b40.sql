-- Create function to validate time conflicts for accepted offers
CREATE OR REPLACE FUNCTION public.validate_accepted_offer_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_offer RECORD;
  has_conflict BOOLEAN;
BEGIN
  -- Get the offer details for the new accepted offer
  SELECT offer_date, time_start, time_end 
  INTO new_offer
  FROM public.offers 
  WHERE id = NEW.offer_id;

  -- Check for time conflicts with existing accepted offers
  SELECT EXISTS (
    SELECT 1
    FROM public.accepted_offers ao
    JOIN public.offers o ON ao.offer_id = o.id
    WHERE ao.user_id = NEW.user_id
      AND ao.status IN ('pending', 'arrived', 'in_progress')
      AND o.offer_date = new_offer.offer_date
      AND o.time_start < new_offer.time_end
      AND o.time_end > new_offer.time_start
  ) INTO has_conflict;

  IF has_conflict THEN
    RAISE EXCEPTION 'Conflito de horário: você já tem um extra aceito que coincide com este período.';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to validate before insert
CREATE TRIGGER validate_accepted_offer_conflict
  BEFORE INSERT ON public.accepted_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_accepted_offer_no_conflict();