-- Permitir que admins atualizem o status da CNH dos motoboys
CREATE POLICY "Admins can update motoboy profiles"
ON public.profiles
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);