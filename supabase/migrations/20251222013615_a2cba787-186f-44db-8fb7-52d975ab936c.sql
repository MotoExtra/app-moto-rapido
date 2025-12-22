-- Criar tabela de mensagens de chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('restaurant', 'motoboy')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Habilitar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Política: Restaurantes podem ver mensagens das suas ofertas
CREATE POLICY "Restaurants can view chat messages for their offers"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = chat_messages.offer_id
    AND o.created_by = auth.uid()
  )
);

-- Política: Motoboys podem ver mensagens das ofertas que aceitaram
CREATE POLICY "Motoboys can view chat messages for accepted offers"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accepted_offers ao
    WHERE ao.offer_id = chat_messages.offer_id
    AND ao.user_id = auth.uid()
  )
);

-- Política: Restaurantes podem inserir mensagens nas suas ofertas
CREATE POLICY "Restaurants can insert chat messages for their offers"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'restaurant'
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = chat_messages.offer_id
    AND o.created_by = auth.uid()
  )
);

-- Política: Motoboys podem inserir mensagens nas ofertas que aceitaram
CREATE POLICY "Motoboys can insert chat messages for accepted offers"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_type = 'motoboy'
  AND sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.accepted_offers ao
    WHERE ao.offer_id = chat_messages.offer_id
    AND ao.user_id = auth.uid()
  )
);

-- Política: Usuários podem atualizar read_at das mensagens que receberam
CREATE POLICY "Users can update read_at for received messages"
ON public.chat_messages
FOR UPDATE
USING (
  sender_id != auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = chat_messages.offer_id
      AND o.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.accepted_offers ao
      WHERE ao.offer_id = chat_messages.offer_id
      AND ao.user_id = auth.uid()
    )
  )
);

-- Habilitar Realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Criar índice para performance
CREATE INDEX idx_chat_messages_offer_id ON public.chat_messages(offer_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);