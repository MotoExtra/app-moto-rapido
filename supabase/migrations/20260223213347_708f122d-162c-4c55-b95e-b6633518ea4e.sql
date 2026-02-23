
CREATE OR REPLACE FUNCTION public.complete_extra_with_peak_bonus(p_user_id uuid, p_offer_id uuid, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_multiplier NUMERIC;
  v_is_peak BOOLEAN;
  v_is_urgent BOOLEAN;
  v_base_xp INTEGER := 30;
  v_final_xp INTEGER;
  v_stats motoboy_stats;
  v_restaurant_name TEXT;
  v_event_type TEXT;
BEGIN
  -- Get restaurant name and urgent flag
  SELECT restaurant_name, COALESCE(is_urgent, false) 
  INTO v_restaurant_name, v_is_urgent 
  FROM offers WHERE id = p_offer_id;
  
  -- Check peak hour
  SELECT ph.is_peak, ph.multiplier INTO v_is_peak, v_multiplier FROM is_peak_hour(p_city) ph;
  
  -- Apply urgent bonus (2x) - stacks with peak multiplier
  IF v_is_urgent THEN
    v_multiplier := v_multiplier * 2;
  END IF;
  
  v_final_xp := ROUND(v_base_xp * v_multiplier);
  
  -- Determine event type
  IF v_is_urgent THEN
    v_event_type := 'urgent_completion';
  ELSIF v_is_peak THEN
    v_event_type := 'peak_completion';
  ELSE
    v_event_type := 'completion';
  END IF;
  
  -- Add XP
  PERFORM add_motoboy_xp(p_user_id, v_final_xp, true);
  
  -- Update stats
  UPDATE motoboy_stats
  SET completed_extras = completed_extras + 1,
      extras_without_cancel = extras_without_cancel + 1
  WHERE user_id = p_user_id;
  
  -- Log to xp_history
  INSERT INTO public.xp_history (user_id, xp_amount, event_type, description, offer_id, metadata)
  VALUES (
    p_user_id,
    v_final_xp,
    v_event_type,
    CASE 
      WHEN v_is_urgent AND v_is_peak THEN 'Extra urgente completado (horário de pico) - 2x bônus'
      WHEN v_is_urgent THEN 'Extra urgente completado - 2x bônus'
      WHEN v_is_peak THEN 'Extra completado (horário de pico)'
      ELSE 'Extra completado'
    END,
    p_offer_id,
    jsonb_build_object(
      'restaurant_name', v_restaurant_name,
      'is_peak', v_is_peak,
      'is_urgent', v_is_urgent,
      'multiplier', v_multiplier
    )
  );
  
  -- Send push notification for bonus completions
  IF v_is_peak OR v_is_urgent THEN
    PERFORM net.http_post(
      url := 'https://lkgvewhoqmieklsqxgjn.supabase.co/functions/v1/notify-xp-gain',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', p_user_id,
        'event_type', v_event_type,
        'xp_amount', v_final_xp,
        'restaurant_name', v_restaurant_name,
        'multiplier', v_multiplier
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'xp_earned', v_final_xp,
    'is_peak', v_is_peak,
    'is_urgent', v_is_urgent,
    'multiplier', v_multiplier
  );
END;
$function$;
