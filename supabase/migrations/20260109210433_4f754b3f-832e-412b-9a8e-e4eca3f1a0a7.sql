-- Adicionar colunas para controle de CNH e bloqueio na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cnh_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;