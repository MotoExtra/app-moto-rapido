-- Create snack_chat_messages table for snack exchange chat
CREATE TABLE public.snack_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange_id uuid NOT NULL REFERENCES public.snack_exchanges(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable Row Level Security
ALTER TABLE public.snack_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for snack_chat_messages
CREATE POLICY "Users can view messages for their exchanges"
ON public.snack_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.snack_exchanges se
    WHERE se.id = exchange_id
    AND (se.user_id = auth.uid() OR se.accepted_by = auth.uid())
  )
);

CREATE POLICY "Users can send messages to their exchanges"
ON public.snack_chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.snack_exchanges se
    WHERE se.id = exchange_id
    AND (se.user_id = auth.uid() OR se.accepted_by = auth.uid())
  )
);

-- Enable realtime for snack_chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.snack_chat_messages;