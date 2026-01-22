-- =============================================
-- SISTEMA DE PENALIDADES PROFISSIONAL
-- =============================================

-- 1. Tabela de histórico de penalidades
CREATE TABLE public.penalty_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  penalty_type TEXT NOT NULL CHECK (penalty_type IN ('cancellation', 'delay')),
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_penalty_history_user_id ON penalty_history(user_id);
CREATE INDEX idx_penalty_history_created_at ON penalty_history(created_at DESC);

-- 2. Habilitar RLS
ALTER TABLE penalty_history ENABLE ROW LEVEL SECURITY;

-- 3. Política: motoboys veem apenas suas penalidades
CREATE POLICY "Users can view own penalties"
ON penalty_history FOR SELECT
USING (auth.uid() = user_id);

-- 4. Política: sistema pode inserir penalidades (via functions)
CREATE POLICY "Service can insert penalties"
ON penalty_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Habilitar realtime para notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.penalty_history;

-- 6. Função de cancelamento com penalidade progressiva
CREATE OR REPLACE FUNCTION public.record_cancellation_progressive(
  p_user_id UUID,
  p_offer_id UUID,
  p_minutes_until_start INTEGER
)
RETURNS TABLE(
  penalty_xp INTEGER,
  penalty_reason TEXT,
  new_total_xp INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_penalty INTEGER;
  v_reason TEXT;
  v_stats public.motoboy_stats;
BEGIN
  -- Calcular penalidade progressiva baseada no tempo até o início
  IF p_minutes_until_start < 180 THEN
    -- Menos de 3 horas: impacto crítico
    v_penalty := -100;
    v_reason := 'Cancelamento com menos de 3h de antecedência';
  ELSIF p_minutes_until_start < 360 THEN
    -- Entre 3 e 6 horas: impacto médio
    v_penalty := -50;
    v_reason := 'Cancelamento com 3-6h de antecedência';
  ELSE
    -- Mais de 6 horas: impacto menor
    v_penalty := -25;
    v_reason := 'Cancelamento com mais de 6h de antecedência';
  END IF;
  
  -- Aplicar penalidade de XP
  SELECT * INTO v_stats FROM public.add_motoboy_xp(p_user_id, v_penalty, false);
  
  -- Atualizar contadores de cancelamento
  UPDATE public.motoboy_stats
  SET 
    total_cancellations = total_cancellations + 1,
    extras_without_cancel = 0
  WHERE user_id = p_user_id;
  
  -- Registrar no histórico de penalidades
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
  
  RETURN QUERY SELECT ABS(v_penalty), v_reason, v_stats.total_xp;
END;
$$;

-- 7. Atualizar função de atraso para registrar no histórico
CREATE OR REPLACE FUNCTION public.apply_arrival_delay_penalty_v2(
  p_user_id UUID,
  p_offer_id UUID,
  p_offer_date DATE,
  p_time_start TIME WITHOUT TIME ZONE
)
RETURNS TABLE(
  delay_minutes INTEGER,
  penalty_xp INTEGER,
  applied BOOLEAN,
  penalty_reason TEXT
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
  v_reason TEXT;
BEGIN
  -- Obter hora atual em Brasília
  v_now := now() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Combinar data e hora do início do extra
  v_start_datetime := (p_offer_date::timestamp + p_time_start::interval) AT TIME ZONE 'America/Sao_Paulo';
  
  -- Calcular atraso em minutos
  v_delay_minutes := EXTRACT(EPOCH FROM (v_now - v_start_datetime)) / 60;
  
  -- Determinar penalidade baseada no atraso
  IF v_delay_minutes <= 15 THEN
    -- Pontual ou ligeiramente atrasado (tolerância)
    v_penalty_xp := 0;
    v_reason := NULL;
  ELSIF v_delay_minutes <= 30 THEN
    -- 15-30 min de atraso
    v_penalty_xp := -10;
    v_reason := 'Atraso de 15-30 minutos';
  ELSIF v_delay_minutes <= 60 THEN
    -- 30-60 min de atraso
    v_penalty_xp := -25;
    v_reason := 'Atraso de 30-60 minutos';
  ELSE
    -- Mais de 1 hora de atraso
    v_penalty_xp := -50;
    v_reason := 'Atraso superior a 1 hora';
  END IF;
  
  -- Aplicar penalidade se houver
  IF v_penalty_xp < 0 THEN
    PERFORM public.add_motoboy_xp(p_user_id, v_penalty_xp, false);
    
    -- Registrar no histórico de penalidades
    INSERT INTO public.penalty_history (user_id, offer_id, penalty_type, xp_amount, reason, details)
    VALUES (
      p_user_id,
      p_offer_id,
      'delay',
      v_penalty_xp,
      v_reason,
      jsonb_build_object('delay_minutes', v_delay_minutes)
    );
  END IF;
  
  RETURN QUERY SELECT 
    v_delay_minutes AS delay_minutes,
    ABS(v_penalty_xp) AS penalty_xp,
    (v_penalty_xp < 0) AS applied,
    v_reason AS penalty_reason;
END;
$$;