-- Allow restaurants to view their own expired offers from the archive
CREATE POLICY "Restaurants can view their own expired offers archive"
ON public.expired_offers_archive
FOR SELECT
USING (auth.uid() = created_by);