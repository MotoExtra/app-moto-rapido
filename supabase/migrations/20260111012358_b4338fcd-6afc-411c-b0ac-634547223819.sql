-- Política para permitir que admins acessem documentos de CNH
CREATE POLICY "Admins can access all CNH documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cnh-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Política para o próprio usuário acessar sua CNH
CREATE POLICY "Users can access their own CNH"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cnh-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para usuários enviarem sua própria CNH
CREATE POLICY "Users can upload their own CNH"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cnh-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para usuários atualizarem sua própria CNH
CREATE POLICY "Users can update their own CNH"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'cnh-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);