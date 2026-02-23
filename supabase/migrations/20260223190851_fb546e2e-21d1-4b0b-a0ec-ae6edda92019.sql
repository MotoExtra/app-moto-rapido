
-- Add urgency columns to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS urgent_reposted_at TIMESTAMP WITH TIME ZONE;

-- Update apply_arrival_delay_penalty_v2 to skip penalties for urgent offers
CREATE OR REPLACE FUNCTION public.apply_arrival_delay_penalty_v2(p_user_id uuid, p_offer_id uuid, p_offer_date date, p_time_start time without time zone)
RETURNS TABLE(delay_minutes integer, penalty_xp integer, applied boolean, penalty_reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE;
  v_start_datetime TIMESTAMP WITH TIME ZONE;
  v_delay_minutes INTEGER;
  v_penalty_xp INTEGER;
  v_reason TEXT;
  v_restaurant_name TEXT;
  v_is_urgent BOOLEAN;
BEGIN
  -- Check if offer is urgent (reposted after cancellation near start time)
  SELECT o.is_urgent, o.restaurant_name INTO v_is_urgent, v_restaurant_name 
  FROM offers o WHERE o.id = p_offer_id;
  
  -- Skip penalty entirely for urgent offers
  IF v_is_urgent = true THEN
    RETURN QUERY SELECT 0, 0, false, 'Sem penalidade (extra urgente)'::text;
    RETURN;
  END IF;
  
  -- Get current time in Brasília timezone
  v_now := now() AT TIME ZONE 'America/Sao_Paulo';
  v_start_datetime := (p_offer_date::timestamp + p_time_start::interval) AT TIME ZONE 'America/Sao_Paulo';
  v_delay_minutes := EXTRACT(EPOCH FROM (v_now - v_start_datetime)) / 60;
  
  IF v_delay_minutes <= 15 THEN
    v_penalty_xp := 0;
    v_reason := NULL;
  ELSIF v_delay_minutes <= 30 THEN
    v_penalty_xp := -10;
    v_reason := 'Atraso de 15-30 minutos';
  ELSIF v_delay_minutes <= 60 THEN
    v_penalty_xp := -25;
    v_reason := 'Atraso de 30-60 minutos';
  ELSE
    v_penalty_xp := -50;
    v_reason := 'Atraso superior a 1 hora';
  END IF;
  
  IF v_penalty_xp < 0 THEN
    PERFORM public.add_motoboy_xp(p_user_id, v_penalty_xp, false);
    
    INSERT INTO public.penalty_history (user_id, offer_id, penalty_type, xp_amount, reason, details)
    VALUES (p_user_id, p_offer_id, 'delay', v_penalty_xp, v_reason, jsonb_build_object('delay_minutes', v_delay_minutes));
    
    INSERT INTO public.xp_history (user_id, xp_amount, event_type, description, offer_id, metadata)
    VALUES (p_user_id, v_penalty_xp, 'delay', v_reason, p_offer_id,
      jsonb_build_object('restaurant_name', v_restaurant_name, 'delay_minutes', v_delay_minutes));
  END IF;
  
  RETURN QUERY SELECT v_delay_minutes, ABS(v_penalty_xp), (v_penalty_xp < 0), v_reason;
END;
$function$;
