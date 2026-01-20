
-- =====================================================
-- SISTEMA DE GAMIFICAÇÃO - TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de estatísticas do motoboy
CREATE TABLE IF NOT EXISTS public.motoboy_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  completed_extras INTEGER NOT NULL DEFAULT 0,
  total_cancellations INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_work_date DATE,
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  extras_without_cancel INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de conquistas
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('quality', 'consistency', 'special')),
  xp_reward INTEGER NOT NULL DEFAULT 0,
  unlock_criteria JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de conquistas desbloqueadas
CREATE TABLE IF NOT EXISTS public.motoboy_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, achievement_id)
);

-- Tabela de desafios
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  target_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de progresso nos desafios
CREATE TABLE IF NOT EXISTS public.motoboy_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Tabela de prêmios do ranking
CREATE TABLE IF NOT EXISTS public.ranking_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank_position INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  reward_description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.motoboy_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboy_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboy_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_rewards ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own stats" ON public.motoboy_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.motoboy_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.motoboy_stats;
DROP POLICY IF EXISTS "Anyone can view stats for ranking" ON public.motoboy_stats;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.motoboy_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.motoboy_achievements;
DROP POLICY IF EXISTS "Users can update their own achievements" ON public.motoboy_achievements;
DROP POLICY IF EXISTS "Anyone can view active challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can view their own challenge progress" ON public.motoboy_challenges;
DROP POLICY IF EXISTS "Users can insert their own challenge progress" ON public.motoboy_challenges;
DROP POLICY IF EXISTS "Users can update their own challenge progress" ON public.motoboy_challenges;
DROP POLICY IF EXISTS "Anyone can view ranking rewards" ON public.ranking_rewards;

-- motoboy_stats policies
CREATE POLICY "Anyone can view stats for ranking"
  ON public.motoboy_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own stats"
  ON public.motoboy_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.motoboy_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- achievements: todos podem ver conquistas disponíveis
CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

-- motoboy_achievements: usuários veem suas conquistas
CREATE POLICY "Users can view their own achievements"
  ON public.motoboy_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.motoboy_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.motoboy_achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- challenges: todos podem ver desafios ativos
CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT
  USING (is_active = true);

-- motoboy_challenges: usuários veem/atualizam seu progresso
CREATE POLICY "Users can view their own challenge progress"
  ON public.motoboy_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge progress"
  ON public.motoboy_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
  ON public.motoboy_challenges FOR UPDATE
  USING (auth.uid() = user_id);

-- ranking_rewards: todos podem ver prêmios
CREATE POLICY "Anyone can view ranking rewards"
  ON public.ranking_rewards FOR SELECT
  USING (is_active = true);

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_motoboy_stats_updated_at ON public.motoboy_stats;
CREATE TRIGGER update_motoboy_stats_updated_at
  BEFORE UPDATE ON public.motoboy_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNÇÃO: Calcular nível baseado no XP
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_level(xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF xp >= 2000 THEN RETURN 5;
  ELSIF xp >= 1200 THEN RETURN 4;
  ELSIF xp >= 600 THEN RETURN 3;
  ELSIF xp >= 200 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$;

-- =====================================================
-- FUNÇÃO: Adicionar XP ao motoboy
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_motoboy_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_update_streak BOOLEAN DEFAULT false
)
RETURNS public.motoboy_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats public.motoboy_stats;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_new_streak INTEGER;
  v_best_streak INTEGER;
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
  
  RETURN v_stats;
END;
$$;

-- =====================================================
-- FUNÇÃO: Registrar extra completado
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_completed_extra(p_user_id UUID)
RETURNS public.motoboy_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats public.motoboy_stats;
BEGIN
  SELECT * INTO v_stats FROM public.add_motoboy_xp(p_user_id, 30, true);
  
  UPDATE public.motoboy_stats
  SET 
    completed_extras = completed_extras + 1,
    extras_without_cancel = extras_without_cancel + 1
  WHERE user_id = p_user_id
  RETURNING * INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- =====================================================
-- FUNÇÃO: Registrar cancelamento
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_cancellation(p_user_id UUID)
RETURNS public.motoboy_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats public.motoboy_stats;
BEGIN
  SELECT * INTO v_stats FROM public.add_motoboy_xp(p_user_id, -50, false);
  
  UPDATE public.motoboy_stats
  SET 
    total_cancellations = total_cancellations + 1,
    extras_without_cancel = 0
  WHERE user_id = p_user_id
  RETURNING * INTO v_stats;
  
  RETURN v_stats;
END;
$$;

-- =====================================================
-- FUNÇÃO: Registrar rating recebido
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_rating_xp(p_user_id UUID, p_rating INTEGER)
RETURNS public.motoboy_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp INTEGER;
BEGIN
  IF p_rating = 5 THEN
    v_xp := 15;
  ELSIF p_rating = 4 THEN
    v_xp := 8;
  ELSIF p_rating <= 2 THEN
    v_xp := -20;
  ELSE
    v_xp := 0;
  END IF;
  
  RETURN public.add_motoboy_xp(p_user_id, v_xp, false);
END;
$$;

-- =====================================================
-- FUNÇÃO: Obter ranking semanal
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_weekly_ranking(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  rank_position BIGINT,
  user_id UUID,
  name TEXT,
  avatar_url TEXT,
  total_xp INTEGER,
  current_level INTEGER,
  weekly_xp INTEGER,
  completed_extras INTEGER,
  current_streak INTEGER,
  score NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY 
      (ms.completed_extras * 10 + 
       COALESCE(ms.current_streak, 0) * 5 + 
       ms.weekly_xp - 
       ms.total_cancellations * 20) DESC
    ) as rank_position,
    ms.user_id,
    p.name,
    p.avatar_url,
    ms.total_xp,
    ms.current_level,
    ms.weekly_xp,
    ms.completed_extras,
    ms.current_streak,
    (ms.completed_extras * 10 + 
     COALESCE(ms.current_streak, 0) * 5 + 
     ms.weekly_xp - 
     ms.total_cancellations * 20)::NUMERIC as score
  FROM public.motoboy_stats ms
  JOIN public.profiles p ON p.id = ms.user_id
  WHERE p.user_type = 'motoboy'
  ORDER BY score DESC
  LIMIT p_limit;
END;
$$;
