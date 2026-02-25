
-- Allow offer creators (motoboys who created the offer) to send chat messages
CREATE POLICY "Offer creators can insert chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = chat_messages.offer_id
      AND o.created_by = auth.uid()
  )
);

-- Allow offer creators (motoboys) to view chat messages for their created offers
-- (restaurants already have this via existing policy, but motoboy creators don't)
CREATE POLICY "Offer creators can view chat messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM offers o
    WHERE o.id = chat_messages.offer_id
      AND o.created_by = auth.uid()
  )
);
