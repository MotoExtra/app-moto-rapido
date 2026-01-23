-- Update record_rating_xp to trigger push notification for 5-star ratings
CREATE OR REPLACE FUNCTION public.record_rating_xp(p_user_id uuid, p_rating integer)
 RETURNS motoboy_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_xp INTEGER;
  v_event_type TEXT;
  v_description TEXT;
BEGIN
  IF p_rating = 5 THEN
    v_xp := 15;
    v_event_type := 'rating_5';
    v_description := 'Avaliação 5 estrelas recebida';
  ELSIF p_rating = 4 THEN
    v_xp := 8;
    v_event_type := 'rating_4';
    v_description := 'Avaliação 4 estrelas recebida';
  ELSIF p_rating <= 2 THEN
    v_xp := -20;
    v_event_type := 'rating_bad';
    v_description := 'Avaliação baixa recebida (' || p_rating || ' estrelas)';
  ELSE
    v_xp := 0;
    v_event_type := 'rating_3';
    v_description := 'Avaliação 3 estrelas recebida';
  END IF;
  
  -- Log to xp_history (only if XP changed)
  IF v_xp != 0 THEN
    INSERT INTO public.xp_history (user_id, xp_amount, event_type, description, metadata)
    VALUES (
      p_user_id,
      v_xp,
      v_event_type,
      v_description,
      jsonb_build_object('rating', p_rating)
    );
    
    -- Send push notification for positive ratings (4 or 5 stars)
    IF v_xp > 0 THEN
      PERFORM net.http_post(
        url := 'https://lkgvewhoqmieklsqxgjn.supabase.co/functions/v1/notify-xp-gain',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'user_id', p_user_id,
          'event_type', v_event_type,
          'xp_amount', v_xp
        )
      );
    END IF;
  END IF;
  
  RETURN public.add_motoboy_xp(p_user_id, v_xp, false);
END;
$function$;

-- Update complete_extra_with_peak_bonus to trigger push notification for peak hour completions
CREATE OR REPLACE FUNCTION public.complete_extra_with_peak_bonus(p_user_id uuid, p_offer_id uuid, p_city text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_multiplier NUMERIC;
  v_is_peak BOOLEAN;
  v_base_xp INTEGER := 30;
  v_final_xp INTEGER;
  v_stats motoboy_stats;
  v_restaurant_name TEXT;
  v_event_type TEXT;
BEGIN
  -- Get restaurant name for history
  SELECT restaurant_name INTO v_restaurant_name FROM offers WHERE id = p_offer_id;
  
  -- Check peak hour
  SELECT ph.is_peak, ph.multiplier INTO v_is_peak, v_multiplier FROM is_peak_hour(p_city) ph;
  
  v_final_xp := ROUND(v_base_xp * v_multiplier);
  
  -- Determine event type
  IF v_is_peak THEN
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
      WHEN v_is_peak THEN 'Extra completado (horário de pico)'
      ELSE 'Extra completado'
    END,
    p_offer_id,
    jsonb_build_object(
      'restaurant_name', v_restaurant_name,
      'is_peak', v_is_peak,
      'multiplier', v_multiplier
    )
  );
  
  -- Send push notification for peak hour completions (they get bonus XP!)
  IF v_is_peak THEN
    PERFORM net.http_post(
      url := 'https://lkgvewhoqmieklsqxgjn.supabase.co/functions/v1/notify-xp-gain',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', p_user_id,
        'event_type', 'peak_completion',
        'xp_amount', v_final_xp,
        'restaurant_name', v_restaurant_name,
        'multiplier', v_multiplier
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'xp_earned', v_final_xp,
    'is_peak', v_is_peak,
    'multiplier', v_multiplier
  );
END;
$function$;