-- Criar tabela de ofertas/extras
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  radius INTEGER NOT NULL,
  needs_bag BOOLEAN DEFAULT false,
  delivery_range TEXT NOT NULL,
  experience TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  payment TEXT,
  observations TEXT,
  phone TEXT,
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  is_accepted BOOLEAN DEFAULT false,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de extras aceitos
CREATE TABLE public.accepted_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accepted_offers ENABLE ROW LEVEL SECURITY;

-- Políticas para offers (todos podem ver ofertas não aceitas)
CREATE POLICY "Ofertas públicas são visíveis para todos"
ON public.offers
FOR SELECT
USING (is_accepted = false OR auth.uid() = accepted_by);

CREATE POLICY "Sistema pode inserir ofertas"
ON public.offers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar ofertas"
ON public.offers
FOR UPDATE
USING (true);

-- Políticas para accepted_offers
CREATE POLICY "Usuários podem ver seus próprios extras aceitos"
ON public.accepted_offers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem aceitar extras"
ON public.accepted_offers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus extras"
ON public.accepted_offers
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para offers
ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;
ALTER TABLE public.offers REPLICA IDENTITY FULL;