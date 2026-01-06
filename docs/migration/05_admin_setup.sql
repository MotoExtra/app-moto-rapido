-- ============================================
-- MIGRAÇÃO LOVABLE CLOUD -> SUPABASE PRÓPRIO
-- Script 5: Configurar Admin
-- ============================================

-- INSTRUÇÕES:
-- 1. Primeiro, crie o usuário admin no Supabase Dashboard:
--    - Vá em Authentication > Users
--    - Clique em "Add user" > "Create new user"
--    - Email: admin@motopay.com.br
--    - Defina uma senha segura
--    - Marque "Auto Confirm User" se disponível
--
-- 2. Copie o UUID do usuário criado
--
-- 3. Execute o SQL abaixo substituindo 'USER_UUID_AQUI' pelo UUID do admin

-- ============================================
-- CONCEDER ROLE DE ADMIN
-- ============================================

-- Substitua 'USER_UUID_AQUI' pelo UUID real do usuário admin
-- Exemplo: SELECT public.grant_admin_role('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

SELECT public.grant_admin_role('USER_UUID_AQUI');

-- OU inserir diretamente:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('USER_UUID_AQUI', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- VERIFICAR SE ADMIN FOI CONFIGURADO
-- ============================================

-- Verificar roles:
-- SELECT ur.*, au.email 
-- FROM public.user_roles ur
-- JOIN auth.users au ON ur.user_id = au.id
-- WHERE ur.role = 'admin';

-- Testar função has_role:
-- SELECT public.has_role('USER_UUID_AQUI', 'admin');
