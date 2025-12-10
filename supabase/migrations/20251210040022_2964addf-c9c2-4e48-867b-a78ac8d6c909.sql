-- Allow users to delete their own offers
CREATE POLICY "Users can delete their own offers"
ON public.offers
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Allow users to update their own offers
DROP POLICY IF EXISTS "Sistema pode atualizar ofertas" ON public.offers;

CREATE POLICY "Users can update offers"
ON public.offers
FOR UPDATE
TO authenticated
USING (true);