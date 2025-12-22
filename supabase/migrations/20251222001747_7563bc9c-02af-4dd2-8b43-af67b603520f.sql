-- Tabela para histórico de rotas percorridas
CREATE TABLE public.motoboy_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  accuracy DECIMAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.motoboy_location_history ENABLE ROW LEVEL SECURITY;

-- Motoboy pode inserir seu próprio histórico
CREATE POLICY "Motoboys can insert their own location history"
ON public.motoboy_location_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Motoboy pode ver seu próprio histórico
CREATE POLICY "Motoboys can view their own location history"
ON public.motoboy_location_history
FOR SELECT
USING (auth.uid() = user_id);

-- Restaurantes podem ver histórico de motoboys que trabalham em seus extras
CREATE POLICY "Restaurants can view motoboy location history for their offers"
ON public.motoboy_location_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_id
    AND o.created_by = auth.uid()
    AND o.is_accepted = true
  )
);

-- Índices para performance
CREATE INDEX idx_motoboy_location_history_user_offer ON public.motoboy_location_history(user_id, offer_id);
CREATE INDEX idx_motoboy_location_history_recorded_at ON public.motoboy_location_history(recorded_at DESC);
CREATE INDEX idx_motoboy_location_history_offer_id ON public.motoboy_location_history(offer_id);