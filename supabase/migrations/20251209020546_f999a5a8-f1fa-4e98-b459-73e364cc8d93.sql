-- Add DELETE policy for accepted_offers so users can cancel their own pending offers
CREATE POLICY "Users can cancel their own pending offers"
ON accepted_offers
FOR DELETE
USING (auth.uid() = user_id AND status = 'pending');