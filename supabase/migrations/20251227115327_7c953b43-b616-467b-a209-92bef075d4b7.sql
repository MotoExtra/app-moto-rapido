-- Create storage bucket for CNH documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('cnh-documents', 'cnh-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own CNH documents
CREATE POLICY "Users can upload their own CNH documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'cnh-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own CNH documents
CREATE POLICY "Users can view their own CNH documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cnh-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all CNH documents for review
CREATE POLICY "Admins can view all CNH documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'cnh-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);