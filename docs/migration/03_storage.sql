-- ============================================
-- MIGRAÇÃO LOVABLE CLOUD -> SUPABASE PRÓPRIO
-- Script 3: Storage Buckets e Policies
-- ============================================

-- ============================================
-- CRIAR BUCKETS
-- ============================================

-- Bucket para avatares (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Bucket para documentos CNH (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cnh-documents', 'cnh-documents', false);

-- ============================================
-- STORAGE POLICIES - AVATARS
-- ============================================

-- Qualquer um pode ver avatares
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Usuários podem fazer upload do próprio avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem atualizar o próprio avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem deletar o próprio avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- STORAGE POLICIES - CNH DOCUMENTS
-- ============================================

-- Usuários podem ver seus próprios documentos
CREATE POLICY "Users can view their own CNH documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'cnh-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins podem ver todos os documentos CNH
CREATE POLICY "Admins can view all CNH documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'cnh-documents' AND 
    public.has_role(auth.uid(), 'admin')
);

-- Usuários podem fazer upload dos próprios documentos
CREATE POLICY "Users can upload their own CNH documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'cnh-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Usuários podem atualizar os próprios documentos
CREATE POLICY "Users can update their own CNH documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'cnh-documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);
