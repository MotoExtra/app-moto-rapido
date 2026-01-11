-- Cron job para verificar e notificar motoboys sobre ativação de conta (a cada 2 minutos)
SELECT cron.schedule(
    'notify-account-activated-job',
    '*/2 * * * *',
    $$
    SELECT
        net.http_post(
            url := 'https://lkgvewhoqmieklsqxgjn.supabase.co/functions/v1/notify-account-activated',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZ3Zld2hvcW1pZWtsc3F4Z2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjQ5NjgsImV4cCI6MjA3ODc0MDk2OH0.442adk3d4FmI6GJQpGVNgya56bq2rPRm0XTaJ9Y6YQ8"}'::jsonb,
            body := concat('{"time": "', now(), '"}')::jsonb
        ) AS request_id;
    $$
);