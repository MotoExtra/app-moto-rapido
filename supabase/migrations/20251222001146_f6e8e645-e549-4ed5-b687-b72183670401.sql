-- Tabela para armazenar localização em tempo real dos motoboys
CREATE TABLE public.motoboy_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  accuracy DECIMAL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- Enable RLS
ALTER TABLE public.motoboy_locations ENABLE ROW LEVEL SECURITY;

-- Motoboy pode inserir/atualizar sua própria posição
CREATE POLICY "Motoboys can upsert their own location"
ON public.motoboy_locations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Restaurantes podem ver localizações de motoboys que aceitaram seus extras
CREATE POLICY "Restaurants can view motoboy locations for their offers"
ON public.motoboy_locations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_id
    AND o.created_by = auth.uid()
    AND o.is_accepted = true
  )
);

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.motoboy_locations;

-- Índices para performance
CREATE INDEX idx_motoboy_locations_user_id ON public.motoboy_locations(user_id);
CREATE INDEX idx_motoboy_locations_offer_id ON public.motoboy_locations(offer_id);
CREATE INDEX idx_motoboy_locations_updated_at ON public.motoboy_locations(updated_at);