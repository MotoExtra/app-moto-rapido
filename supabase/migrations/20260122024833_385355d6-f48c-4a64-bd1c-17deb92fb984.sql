-- Function to apply arrival delay penalty
CREATE OR REPLACE FUNCTION public.apply_arrival_delay_penalty(
  p_user_id UUID,
  p_offer_date DATE,
  p_time_start TIME
)
RETURNS TABLE(
  delay_minutes INTEGER,
  penalty_xp INTEGER,
  applied BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE;
  v_start_datetime TIMESTAMP WITH TIME ZONE;
  v_delay_minutes INTEGER;
  v_penalty_xp INTEGER;
BEGIN
  -- Get current time in Brasília timezone
  v_now := now() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Combine offer_date and time_start to get the scheduled start
  v_start_datetime := (p_offer_date::timestamp + p_time_start::interval) AT TIME ZONE 'America/Sao_Paulo';
  
  -- Calculate delay in minutes (negative means early, positive means late)
  v_delay_minutes := EXTRACT(EPOCH FROM (v_now - v_start_datetime)) / 60;
  
  -- Only apply penalty if late (delay > 0)
  IF v_delay_minutes <= 15 THEN
    -- On time or early (up to 15 min late is acceptable)
    v_penalty_xp := 0;
  ELSIF v_delay_minutes <= 30 THEN
    -- 15-30 min late: -10 XP
    v_penalty_xp := -10;
  ELSIF v_delay_minutes <= 60 THEN
    -- 30-60 min late: -25 XP
    v_penalty_xp := -25;
  ELSE
    -- +1 hour late: -50 XP
    v_penalty_xp := -50;
  END IF;
  
  -- Apply the penalty if any
  IF v_penalty_xp < 0 THEN
    PERFORM public.add_motoboy_xp(p_user_id, v_penalty_xp, false);
  END IF;
  
  RETURN QUERY SELECT 
    v_delay_minutes AS delay_minutes,
    ABS(v_penalty_xp) AS penalty_xp,
    (v_penalty_xp < 0) AS applied;
END;
$$;