-- Create xp_history table to track all XP gains and losses
CREATE TABLE public.xp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  xp_amount INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_xp_history_user_id ON public.xp_history(user_id);
CREATE INDEX idx_xp_history_created_at ON public.xp_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own XP history
CREATE POLICY "Users can view their own xp history"
ON public.xp_history FOR SELECT
USING (auth.uid() = user_id);

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_history;

-- Update complete_extra_with_peak_bonus to log XP history
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
BEGIN
  -- Get restaurant name for history
  SELECT restaurant_name INTO v_restaurant_name FROM offers WHERE id = p_offer_id;
  
  -- Check peak hour
  SELECT ph.is_peak, ph.multiplier INTO v_is_peak, v_multiplier FROM is_peak_hour(p_city) ph;
  
  v_final_xp := ROUND(v_base_xp * v_multiplier);
  
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
    'completion',
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
  
  RETURN jsonb_build_object(
    'xp_earned', v_final_xp,
    'is_peak', v_is_peak,
    'multiplier', v_multiplier
  );
END;
$function$;

-- Update record_rating_xp to log XP history
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
  END IF;
  
  RETURN public.add_motoboy_xp(p_user_id, v_xp, false);
END;
$function$;

-- Update record_cancellation_progressive to also log to xp_history
CREATE OR REPLACE FUNCTION public.record_cancellation_progressive(p_user_id uuid, p_offer_id uuid, p_minutes_until_start integer)
 RETURNS TABLE(penalty_xp integer, penalty_reason text, new_total_xp integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_penalty INTEGER;
  v_reason TEXT;
  v_stats public.motoboy_stats;
  v_restaurant_name TEXT;
BEGIN
  -- Get restaurant name
  SELECT restaurant_name INTO v_restaurant_name FROM offers WHERE id = p_offer_id;
  
  -- Calculate progressive penalty based on time until start
  IF p_minutes_until_start < 180 THEN
    v_penalty := -100;
    v_reason := 'Cancelamento com menos de 3h de antecedência';
  ELSIF p_minutes_until_start < 360 THEN
    v_penalty := -50;
    v_reason := 'Cancelamento com 3-6h de antecedência';
  ELSE
    v_penalty := -25;
    v_reason := 'Cancelamento com mais de 6h de antecedência';
  END IF;
  
  -- Apply XP penalty
  SELECT * INTO v_stats FROM public.add_motoboy_xp(p_user_id, v_penalty, false);
  
  -- Update cancellation counters
  UPDATE public.motoboy_stats
  SET 
    total_cancellations = total_cancellations + 1,
    extras_without_cancel = 0
  WHERE user_id = p_user_id;
  
  -- Log to penalty_history
  INSERT INTO public.penalty_history (user_id, offer_id, penalty_type, xp_amount, reason, details)
  VALUES (
    p_user_id, 
    p_offer_id, 
    'cancellation', 
    v_penalty, 
    v_reason,
    jsonb_build_object(
      'minutes_until_start', p_minutes_until_start,
      'hours_until_start', ROUND(p_minutes_until_start / 60.0, 1)
    )
  );
  
  -- Log to xp_history
  INSERT INTO public.xp_history (user_id, xp_amount, event_type, description, offer_id, metadata)
  VALUES (
    p_user_id,
    v_penalty,
    'cancellation',
    v_reason,
    p_offer_id,
    jsonb_build_object(
      'restaurant_name', v_restaurant_name,
      'minutes_until_start', p_minutes_until_start,
      'hours_until_start', ROUND(p_minutes_until_start / 60.0, 1)
    )
  );
  
  RETURN QUERY SELECT ABS(v_penalty), v_reason, v_stats.total_xp;
END;
$function$;

-- Update apply_arrival_delay_penalty_v2 to also log to xp_history
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
BEGIN
  -- Get restaurant name
  SELECT restaurant_name INTO v_restaurant_name FROM offers WHERE id = p_offer_id;
  
  -- Get current time in Brasília timezone
  v_now := now() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Combine offer date and start time
  v_start_datetime := (p_offer_date::timestamp + p_time_start::interval) AT TIME ZONE 'America/Sao_Paulo';
  
  -- Calculate delay in minutes
  v_delay_minutes := EXTRACT(EPOCH FROM (v_now - v_start_datetime)) / 60;
  
  -- Determine penalty based on delay
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
  
  -- Apply penalty if any
  IF v_penalty_xp < 0 THEN
    PERFORM public.add_motoboy_xp(p_user_id, v_penalty_xp, false);
    
    -- Log to penalty_history
    INSERT INTO public.penalty_history (user_id, offer_id, penalty_type, xp_amount, reason, details)
    VALUES (
      p_user_id,
      p_offer_id,
      'delay',
      v_penalty_xp,
      v_reason,
      jsonb_build_object('delay_minutes', v_delay_minutes)
    );
    
    -- Log to xp_history
    INSERT INTO public.xp_history (user_id, xp_amount, event_type, description, offer_id, metadata)
    VALUES (
      p_user_id,
      v_penalty_xp,
      'delay',
      v_reason,
      p_offer_id,
      jsonb_build_object(
        'restaurant_name', v_restaurant_name,
        'delay_minutes', v_delay_minutes
      )
    );
  END IF;
  
  RETURN QUERY SELECT 
    v_delay_minutes AS delay_minutes,
    ABS(v_penalty_xp) AS penalty_xp,
    (v_penalty_xp < 0) AS applied,
    v_reason AS penalty_reason;
END;
$function$;