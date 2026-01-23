
-- Create function to auto-complete expired extras
CREATE OR REPLACE FUNCTION public.auto_complete_expired_extras()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Update accepted_offers to 'completed' when their offer time has passed
  -- Uses 30-minute grace period after time_end
  UPDATE public.accepted_offers ao
  SET 
    status = 'completed',
    payment_confirmed_at = COALESCE(payment_confirmed_at, NOW())
  FROM public.offers o
  WHERE ao.offer_id = o.id
    AND ao.status = 'in_progress'
    AND (
      -- Offer date + time_end + 30 min grace period has passed
      (o.offer_date::timestamp + o.time_end::interval + INTERVAL '30 minutes') < NOW()
    );
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Log if any records were updated
  IF v_count > 0 THEN
    RAISE NOTICE 'Auto-completed % expired extras', v_count;
  END IF;
  
  RETURN v_count;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_complete_expired_extras() IS 'Automatically marks in_progress extras as completed when their scheduled time has passed (with 30-minute grace period). Runs via cron job every 15 minutes.';
