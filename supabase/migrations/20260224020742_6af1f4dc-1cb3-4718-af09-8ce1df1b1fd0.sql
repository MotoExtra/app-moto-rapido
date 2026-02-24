
-- Function to check and unlock achievements for a user
CREATE OR REPLACE FUNCTION public.check_and_unlock_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  achievement_rec RECORD;
  criteria jsonb;
  criteria_type text;
  criteria_value numeric;
  criteria_min_ratings integer;
  current_val numeric;
  should_unlock boolean;
  rating_5_count integer;
  avg_rating numeric;
  total_ratings integer;
  streak_good integer;
  stats_rec RECORD;
BEGIN
  -- Fetch motoboy stats
  SELECT * INTO stats_rec FROM motoboy_stats WHERE user_id = p_user_id;
  
  -- Calculate rating stats from xp_history
  SELECT 
    COALESCE(SUM(CASE WHEN event_type IN ('rating_5', 'rating') AND xp_amount = 15 THEN 1 ELSE 0 END), 0),
    COALESCE(COUNT(*), 0)
  INTO rating_5_count, total_ratings
  FROM xp_history 
  WHERE user_id = p_user_id 
    AND event_type IN ('rating', 'rating_5', 'rating_4', 'rating_bad');

  -- Calculate avg_rating from xp_history
  SELECT COALESCE(AVG(
    CASE 
      WHEN event_type = 'rating_5' OR (event_type = 'rating' AND xp_amount = 15) THEN 5
      WHEN event_type = 'rating_4' OR (event_type = 'rating' AND xp_amount = 8) THEN 4
      WHEN event_type = 'rating_bad' THEN 2
      ELSE 3
    END
  ), 0) INTO avg_rating
  FROM xp_history 
  WHERE user_id = p_user_id 
    AND event_type IN ('rating', 'rating_5', 'rating_4', 'rating_bad');

  -- Calculate streak of good ratings
  SELECT COUNT(*) INTO streak_good
  FROM (
    SELECT event_type, xp_amount,
      ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM xp_history
    WHERE user_id = p_user_id
      AND event_type IN ('rating', 'rating_5', 'rating_4', 'rating_bad')
    ORDER BY created_at DESC
  ) sub
  WHERE (event_type IN ('rating_5', 'rating_4') 
    OR (event_type = 'rating' AND xp_amount >= 8))
    AND rn <= (
      SELECT COALESCE(MIN(rn2) - 1, COUNT(*))
      FROM (
        SELECT ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn2, event_type, xp_amount
        FROM xp_history
        WHERE user_id = p_user_id
          AND event_type IN ('rating', 'rating_5', 'rating_4', 'rating_bad')
        ORDER BY created_at DESC
      ) bad
      WHERE event_type = 'rating_bad' OR (event_type = 'rating' AND xp_amount < 0)
    );

  -- Loop through all achievements not yet unlocked
  FOR achievement_rec IN 
    SELECT a.* FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM motoboy_achievements ma 
      WHERE ma.achievement_id = a.id AND ma.user_id = p_user_id
    )
  LOOP
    criteria := achievement_rec.unlock_criteria;
    criteria_type := criteria->>'type';
    criteria_value := COALESCE((criteria->>'value')::numeric, 1);
    should_unlock := false;

    CASE criteria_type
      WHEN 'rating_5_count' THEN
        should_unlock := rating_5_count >= criteria_value;
      WHEN 'avg_rating' THEN
        criteria_min_ratings := COALESCE((criteria->>'min_ratings')::integer, 0);
        should_unlock := total_ratings >= criteria_min_ratings AND avg_rating >= criteria_value;
      WHEN 'streak_good_rating' THEN
        should_unlock := streak_good >= criteria_value;
      WHEN 'streak' THEN
        should_unlock := stats_rec IS NOT NULL AND stats_rec.current_streak >= criteria_value;
      WHEN 'no_cancel_streak' THEN
        should_unlock := stats_rec IS NOT NULL AND stats_rec.extras_without_cancel >= criteria_value;
      WHEN 'completed_extras' THEN
        should_unlock := stats_rec IS NOT NULL AND stats_rec.completed_extras >= criteria_value;
      WHEN 'total_xp' THEN
        should_unlock := stats_rec IS NOT NULL AND stats_rec.total_xp >= criteria_value;
      ELSE
        should_unlock := false;
    END CASE;

    IF should_unlock THEN
      INSERT INTO motoboy_achievements (user_id, achievement_id)
      VALUES (p_user_id, achievement_rec.id)
      ON CONFLICT DO NOTHING;
      
      -- Award XP for the achievement
      IF achievement_rec.xp_reward > 0 THEN
        INSERT INTO xp_history (user_id, event_type, xp_amount, description)
        VALUES (p_user_id, 'achievement', achievement_rec.xp_reward, 
                'Conquista desbloqueada: ' || achievement_rec.name);
        
        UPDATE motoboy_stats 
        SET total_xp = total_xp + achievement_rec.xp_reward,
            updated_at = now()
        WHERE user_id = p_user_id;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to check achievements after xp_history insert
CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't recurse on achievement events
  IF NEW.event_type = 'achievement' THEN
    RETURN NEW;
  END IF;
  
  PERFORM check_and_unlock_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create trigger on xp_history
CREATE TRIGGER trigger_check_achievements_on_xp
  AFTER INSERT ON xp_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

-- Also trigger on motoboy_stats updates (for streak/extras changes)
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_and_unlock_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_achievements_on_stats_update
  AFTER UPDATE ON motoboy_stats
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements_on_stats();
