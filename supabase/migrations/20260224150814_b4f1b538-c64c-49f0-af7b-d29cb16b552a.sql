
CREATE OR REPLACE FUNCTION public.auto_complete_expired_extras()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_cancelled INTEGER := 0;
BEGIN
  -- 1) Auto-CANCEL extras with status 'pending' or 'arrived' that passed time_end + 30 min
  -- These are extras where the motoboy never showed up or never started working
  UPDATE public.accepted_offers ao
  SET status = 'cancelled'
  FROM public.offers o
  WHERE ao.offer_id = o.id
    AND ao.status IN ('pending', 'arrived')
    AND (o.offer_date::timestamp + o.time_end::interval + INTERVAL '30 minutes') < NOW();
  
  GET DIAGNOSTICS v_cancelled = ROW_COUNT;

  -- Also release the offer so it can potentially be accepted again or cleaned up
  UPDATE public.offers o
  SET is_accepted = false, accepted_by = NULL, updated_at = now()
  FROM public.accepted_offers ao
  WHERE ao.offer_id = o.id
    AND ao.status = 'cancelled'
    AND o.is_accepted = true
    AND (o.offer_date::timestamp + o.time_end::interval + INTERVAL '30 minutes') < NOW();

  -- 2) Auto-COMPLETE extras with status 'in_progress' that passed time_end + 30 min
  UPDATE public.accepted_offers ao
  SET 
    status = 'completed',
    payment_confirmed_at = COALESCE(payment_confirmed_at, NOW())
  FROM public.offers o
  WHERE ao.offer_id = o.id
    AND ao.status = 'in_progress'
    AND (o.offer_date::timestamp + o.time_end::interval + INTERVAL '30 minutes') < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  v_count := v_count + v_cancelled;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'Auto-processed % expired extras (% cancelled, % completed)', v_count, v_cancelled, v_count - v_cancelled;
  END IF;
  
  RETURN v_count;
END;
$function$;
