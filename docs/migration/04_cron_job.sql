-- ============================================
-- MIGRAÇÃO LOVABLE CLOUD -> SUPABASE PRÓPRIO
-- Script 4: Cron Job para check-pending-ratings
-- ============================================

-- IMPORTANTE: Substitua os valores abaixo com as credenciais do seu novo projeto Supabase:
-- - YOUR_PROJECT_REF: o ID do seu projeto (ex: abcdefghijklmnop)
-- - YOUR_ANON_KEY: a anon key do seu projeto

-- ============================================
-- HABILITAR EXTENSÕES NECESSÁRIAS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- CRIAR CRON JOB
-- ============================================

-- Verificar ratings pendentes a cada 5 minutos
SELECT cron.schedule(
    'check-pending-ratings-job',
    '*/5 * * * *', -- a cada 5 minutos
    $$
    SELECT
        net.http_post(
            url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-pending-ratings',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
            body := concat('{"time": "', now(), '"}')::jsonb
        ) AS request_id;
    $$
);

-- ============================================
-- COMANDOS ÚTEIS PARA GERENCIAR CRON JOBS
-- ============================================

-- Ver todos os cron jobs agendados:
-- SELECT * FROM cron.job;

-- Ver histórico de execução:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Desabilitar um cron job:
-- SELECT cron.unschedule('check-pending-ratings-job');

-- Executar manualmente (para teste):
-- SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-pending-ratings',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body := '{}'::jsonb
-- );
