-- =====================================================
-- 1. RATING TAGS SYSTEM
-- =====================================================

-- Tabela para armazenar tags de avaliação
CREATE TABLE rating_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('positive', 'negative', 'neutral')),
  applicable_to TEXT NOT NULL CHECK (applicable_to IN ('motoboy', 'restaurant', 'both')),
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de relacionamento rating <-> tags
CREATE TABLE rating_tag_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID REFERENCES ratings(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES rating_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(rating_id, tag_id)
);

-- RLS para rating_tags (leitura pública)
ALTER TABLE rating_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active rating tags" ON rating_tags
FOR SELECT USING (is_active = true);

-- RLS para rating_tag_selections
ALTER TABLE rating_tag_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert tag selections for their ratings" ON rating_tag_selections
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM ratings r
    WHERE r.id = rating_tag_selections.rating_id
    AND (r.restaurant_id = auth.uid() OR r.motoboy_id = auth.uid())
  )
);
CREATE POLICY "Users can view tag selections" ON rating_tag_selections
FOR SELECT USING (true);

-- Inserir tags padrão para motoboys
INSERT INTO rating_tags (name, category, applicable_to, icon, sort_order) VALUES
('Pontual', 'positive', 'motoboy', 'Clock', 1),
('Educado', 'positive', 'motoboy', 'Heart', 2),
('Ágil', 'positive', 'motoboy', 'Zap', 3),
('Cuidadoso', 'positive', 'motoboy', 'Shield', 4),
('Proativo', 'positive', 'motoboy', 'Star', 5),
('Boa comunicação', 'positive', 'motoboy', 'MessageCircle', 6),
('Atrasou', 'negative', 'motoboy', 'Clock', 10),
('Desorganizado', 'negative', 'motoboy', 'AlertTriangle', 11),
('Rude', 'negative', 'motoboy', 'Frown', 12),
('Sem bag térmica', 'negative', 'motoboy', 'Package', 13);

-- Inserir tags padrão para restaurantes
INSERT INTO rating_tags (name, category, applicable_to, icon, sort_order) VALUES
('Bem organizado', 'positive', 'restaurant', 'CheckCircle', 1),
('Pedidos prontos', 'positive', 'restaurant', 'Package', 2),
('Bom tratamento', 'positive', 'restaurant', 'Heart', 3),
('Pagou em dia', 'positive', 'restaurant', 'DollarSign', 4),
('Ambiente agradável', 'positive', 'restaurant', 'Smile', 5),
('Desorganizado', 'negative', 'restaurant', 'AlertTriangle', 10),
('Longa espera', 'negative', 'restaurant', 'Clock', 11),
('Pagamento atrasado', 'negative', 'restaurant', 'XCircle', 12),
('Tratamento ruim', 'negative', 'restaurant', 'Frown', 13);

-- =====================================================
-- 2. PAYMENT CONFIRMATION
-- =====================================================

ALTER TABLE accepted_offers 
ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_amount TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- =====================================================
-- 3. PEAK HOURS SYSTEM
-- =====================================================

CREATE TABLE peak_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  multiplier NUMERIC DEFAULT 2.0,
  is_active BOOLEAN DEFAULT true,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE peak_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view peak hours" ON peak_hours
FOR SELECT USING (is_active = true);

-- Inserir horários de pico padrão (almoço e jantar)
INSERT INTO peak_hours (day_of_week, start_time, end_time, multiplier) VALUES
(0, '11:00', '14:00', 2.0), (0, '18:00', '21:00', 2.0),
(1, '11:00', '14:00', 2.0), (1, '18:00', '21:00', 2.0),
(2, '11:00', '14:00', 2.0), (2, '18:00', '21:00', 2.0),
(3, '11:00', '14:00', 2.0), (3, '18:00', '21:00', 2.0),
(4, '11:00', '14:00', 2.0), (4, '18:00', '21:00', 2.0),
(5, '11:00', '14:00', 2.0), (5, '18:00', '21:00', 2.0),
(6, '11:00', '14:00', 2.0), (6, '18:00', '21:00', 2.0);

-- Função para verificar horário de pico
CREATE OR REPLACE FUNCTION is_peak_hour(p_city TEXT DEFAULT NULL)
RETURNS TABLE(is_peak BOOLEAN, multiplier NUMERIC) AS $$
DECLARE
  v_now TIME;
  v_day INTEGER;
BEGIN
  v_now := (now() AT TIME ZONE 'America/Sao_Paulo')::TIME;
  v_day := EXTRACT(DOW FROM now() AT TIME ZONE 'America/Sao_Paulo');
  
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM peak_hours ph
      WHERE ph.day_of_week = v_day
        AND ph.is_active = true
        AND v_now BETWEEN ph.start_time AND ph.end_time
        AND (ph.city IS NULL OR ph.city = p_city)
    ),
    COALESCE(
      (SELECT MAX(ph.multiplier) FROM peak_hours ph
       WHERE ph.day_of_week = v_day
         AND ph.is_active = true
         AND v_now BETWEEN ph.start_time AND ph.end_time
         AND (ph.city IS NULL OR ph.city = p_city)),
      1.0
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Função para completar extra com multiplicador
CREATE OR REPLACE FUNCTION complete_extra_with_peak_bonus(p_user_id UUID, p_offer_id UUID, p_city TEXT DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_multiplier NUMERIC;
  v_is_peak BOOLEAN;
  v_base_xp INTEGER := 30;
  v_final_xp INTEGER;
  v_stats motoboy_stats;
BEGIN
  -- Verificar horário de pico
  SELECT ph.is_peak, ph.multiplier INTO v_is_peak, v_multiplier FROM is_peak_hour(p_city) ph;
  
  v_final_xp := ROUND(v_base_xp * v_multiplier);
  
  -- Adicionar XP
  PERFORM add_motoboy_xp(p_user_id, v_final_xp, true);
  
  -- Atualizar estatísticas
  UPDATE motoboy_stats
  SET completed_extras = completed_extras + 1,
      extras_without_cancel = extras_without_cancel + 1
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'xp_earned', v_final_xp,
    'is_peak', v_is_peak,
    'multiplier', v_multiplier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. RECURRING OFFERS SYSTEM
-- =====================================================

CREATE TABLE recurring_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  lat NUMERIC,
  lng NUMERIC,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  delivery_range TEXT NOT NULL,
  delivery_quantity TEXT,
  radius INTEGER DEFAULT 5,
  needs_bag BOOLEAN DEFAULT false,
  can_become_permanent BOOLEAN DEFAULT false,
  includes_meal BOOLEAN DEFAULT false,
  payment TEXT,
  observations TEXT,
  phone TEXT,
  days_of_week INTEGER[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_generated_date DATE
);

CREATE INDEX idx_recurring_offers_restaurant ON recurring_offers(restaurant_id);
CREATE INDEX idx_recurring_offers_active ON recurring_offers(is_active) WHERE is_active = true;

ALTER TABLE recurring_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurants can view own recurring offers" ON recurring_offers
FOR SELECT USING (restaurant_id = auth.uid());

CREATE POLICY "Restaurants can create recurring offers" ON recurring_offers
FOR INSERT WITH CHECK (restaurant_id = auth.uid());

CREATE POLICY "Restaurants can update own recurring offers" ON recurring_offers
FOR UPDATE USING (restaurant_id = auth.uid());

CREATE POLICY "Restaurants can delete own recurring offers" ON recurring_offers
FOR DELETE USING (restaurant_id = auth.uid());

-- Função para gerar ofertas recorrentes
CREATE OR REPLACE FUNCTION generate_recurring_offers()
RETURNS INTEGER AS $$
DECLARE
  v_template RECORD;
  v_restaurant RECORD;
  v_target_date DATE;
  v_day_of_week INTEGER;
  v_count INTEGER := 0;
BEGIN
  FOR v_target_date IN 
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', '1 day')::DATE
  LOOP
    v_day_of_week := EXTRACT(DOW FROM v_target_date);
    
    FOR v_template IN 
      SELECT ro.*, r.fantasy_name, r.phone as restaurant_phone, r.city as restaurant_city
      FROM recurring_offers ro
      JOIN restaurants r ON r.id = ro.restaurant_id
      WHERE ro.is_active = true
        AND v_day_of_week = ANY(ro.days_of_week)
        AND (ro.last_generated_date IS NULL OR ro.last_generated_date < v_target_date)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM offers o
        WHERE o.created_by = v_template.restaurant_id
          AND o.offer_date = v_target_date
          AND o.time_start = v_template.time_start
          AND o.time_end = v_template.time_end
          AND o.address = v_template.address
      ) THEN
        INSERT INTO offers (
          restaurant_name, description, address, city, lat, lng, offer_date,
          time_start, time_end, delivery_range, delivery_quantity, radius,
          needs_bag, can_become_permanent, includes_meal,
          payment, observations, phone, created_by, offer_type
        ) VALUES (
          v_template.fantasy_name,
          v_template.description,
          v_template.address,
          COALESCE(v_template.city, v_template.restaurant_city),
          v_template.lat,
          v_template.lng,
          v_target_date,
          v_template.time_start,
          v_template.time_end,
          v_template.delivery_range,
          v_template.delivery_quantity,
          v_template.radius,
          v_template.needs_bag,
          v_template.can_become_permanent,
          v_template.includes_meal,
          v_template.payment,
          v_template.observations,
          COALESCE(v_template.phone, v_template.restaurant_phone),
          v_template.restaurant_id,
          'restaurant'
        );
        
        v_count := v_count + 1;
      END IF;
    END LOOP;
    
    UPDATE recurring_offers
    SET last_generated_date = v_target_date, updated_at = now()
    WHERE is_active = true
      AND v_day_of_week = ANY(days_of_week)
      AND (last_generated_date IS NULL OR last_generated_date < v_target_date);
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. RESTAURANT INSIGHTS (Materialized View)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS restaurant_insights AS
SELECT 
  r.id as restaurant_id,
  COUNT(DISTINCT o.id) as total_extras_created,
  COUNT(DISTINCT CASE WHEN o.is_accepted THEN o.id END) as total_accepted,
  COUNT(DISTINCT ao.user_id) as unique_motoboys,
  ROUND(AVG(EXTRACT(EPOCH FROM (ao.accepted_at - o.created_at))/60)::numeric, 1) as avg_acceptance_time_minutes,
  COUNT(DISTINCT CASE WHEN o.offer_date = CURRENT_DATE THEN o.id END) as extras_today,
  COUNT(DISTINCT CASE WHEN o.offer_date >= CURRENT_DATE - INTERVAL '7 days' THEN o.id END) as extras_this_week,
  COUNT(DISTINCT CASE WHEN o.offer_date >= CURRENT_DATE - INTERVAL '30 days' THEN o.id END) as extras_this_month,
  ROUND(AVG(rt.rating)::numeric, 1) as avg_rating_received,
  COUNT(rt.id) as total_ratings_received,
  ROUND((COUNT(DISTINCT CASE WHEN o.is_accepted THEN o.id END)::numeric / NULLIF(COUNT(DISTINCT o.id), 0) * 100)::numeric, 1) as acceptance_rate
FROM restaurants r
LEFT JOIN offers o ON o.created_by = r.id
LEFT JOIN accepted_offers ao ON ao.offer_id = o.id
LEFT JOIN ratings rt ON rt.restaurant_id = r.id AND rt.rating_type = 'motoboy_to_restaurant'
GROUP BY r.id;

CREATE UNIQUE INDEX idx_restaurant_insights_id ON restaurant_insights(restaurant_id);

-- Função para atualizar insights
CREATE OR REPLACE FUNCTION refresh_restaurant_insights()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY restaurant_insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;