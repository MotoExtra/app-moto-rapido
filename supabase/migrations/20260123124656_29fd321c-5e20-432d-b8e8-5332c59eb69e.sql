-- Create function to check and award streak bonuses
CREATE OR REPLACE FUNCTION public.check_and_award_streak_bonus(p_user_id uuid, p_new_streak integer)
RETURNS TABLE(bonus_awarded boolean, bonus_xp integer, milestone_days integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bonus_xp INTEGER := 0;
  v_milestone INTEGER := 0;
  v_already_awarded BOOLEAN;
BEGIN
  -- Check each milestone from highest to lowest
  -- Only award the bonus once per milestone reached
  
  -- 30 days milestone: +300 XP
  IF p_new_streak = 30 THEN
    v_bonus_xp := 300;
    v_milestone := 30;
  -- 14 days milestone: +120 XP
  ELSIF p_new_streak = 14 THEN
    v_bonus_xp := 120;
    v_milestone := 14;
  -- 7 days milestone: +50 XP
  ELSIF p_new_streak = 7 THEN
    v_bonus_xp := 50;
    v_milestone := 7;
  -- 3 days milestone: +20 XP
  ELSIF p_new_streak = 3 THEN
    v_bonus_xp := 20;
    v_milestone := 3;
  END IF;
  
  -- If there's a bonus to award
  IF v_bonus_xp > 0 THEN
    -- Check if we already awarded this milestone (prevent duplicates)
    SELECT EXISTS(
      SELECT 1 FROM xp_history 
      WHERE user_id = p_user_id 
        AND event_type = 'streak_bonus'
        AND (metadata->>'milestone_days')::integer = v_milestone
        AND created_at > NOW() - INTERVAL '24 hours'
    ) INTO v_already_awarded;
    
    IF NOT v_already_awarded THEN
      -- Add the bonus XP
      UPDATE motoboy_stats
      SET total_xp = total_xp + v_bonus_xp,
          weekly_xp = weekly_xp + v_bonus_xp,
          current_level = public.calculate_level(total_xp + v_bonus_xp)
      WHERE user_id = p_user_id;
      
      -- Log to xp_history
      INSERT INTO xp_history (user_id, xp_amount, event_type, description, metadata)
      VALUES (
        p_user_id,
        v_bonus_xp,
        'streak_bonus',
        'Bônus de ' || v_milestone || ' dias consecutivos',
        jsonb_build_object(
          'milestone_days', v_milestone,
          'current_streak', p_new_streak
        )
      );
      
      -- Trigger push notification for streak bonus
      PERFORM net.http_post(
        url := 'https://lkgvewhoqmieklsqxgjn.supabase.co/functions/v1/notify-xp-gain',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'user_id', p_user_id,
          'event_type', 'streak_bonus',
          'xp_amount', v_bonus_xp,
          'milestone_days', v_milestone
        )
      );
      
      RETURN QUERY SELECT true, v_bonus_xp, v_milestone;
      RETURN;
    END IF;
  END IF;
  
  RETURN QUERY SELECT false, 0, 0;
END;
$$;

-- Update add_motoboy_xp to call streak bonus check when updating streak
CREATE OR REPLACE FUNCTION public.add_motoboy_xp(p_user_id uuid, p_xp_amount integer, p_update_streak boolean DEFAULT false)
RETURNS motoboy_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stats public.motoboy_stats;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_new_streak INTEGER;
  v_best_streak INTEGER;
  v_streak_bonus RECORD;
BEGIN
  SELECT * INTO v_stats FROM public.motoboy_stats WHERE user_id = p_user_id;
  
  IF v_stats IS NULL THEN
    INSERT INTO public.motoboy_stats (user_id, total_xp, current_level, current_streak, best_streak, last_work_date)
    VALUES (p_user_id, 0, 1, 0, 0, NULL)
    RETURNING * INTO v_stats;
  END IF;
  
  v_new_xp := GREATEST(0, v_stats.total_xp + p_xp_amount);
  v_new_level := public.calculate_level(v_new_xp);
  
  v_new_streak := v_stats.current_streak;
  v_best_streak := v_stats.best_streak;
  
  IF p_update_streak THEN
    IF v_stats.last_work_date = CURRENT_DATE - INTERVAL '1 day' THEN
      v_new_streak := v_stats.current_streak + 1;
    ELSIF v_stats.last_work_date = CURRENT_DATE THEN
      v_new_streak := v_stats.current_streak;
    ELSE
      v_new_streak := 1;
    END IF;
    v_best_streak := GREATEST(v_stats.best_streak, v_new_streak);
  END IF;
  
  UPDATE public.motoboy_stats
  SET 
    total_xp = v_new_xp,
    current_level = v_new_level,
    current_streak = v_new_streak,
    best_streak = v_best_streak,
    weekly_xp = weekly_xp + GREATEST(0, p_xp_amount),
    last_work_date = CASE WHEN p_update_streak THEN CURRENT_DATE ELSE last_work_date END,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_stats;
  
  -- Check for streak bonus if streak was updated and increased
  IF p_update_streak AND v_new_streak > 1 THEN
    SELECT * INTO v_streak_bonus FROM public.check_and_award_streak_bonus(p_user_id, v_new_streak);
    
    -- If bonus was awarded, refresh the stats
    IF v_streak_bonus.bonus_awarded THEN
      SELECT * INTO v_stats FROM public.motoboy_stats WHERE user_id = p_user_id;
    END IF;
  END IF;
  
  RETURN v_stats;
END;
$$;