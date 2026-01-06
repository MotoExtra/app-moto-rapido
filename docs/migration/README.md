# Guia de Migração: Lovable Cloud → Supabase Próprio

## 📋 Pré-requisitos

1. **Criar conta no Supabase**: https://supabase.com
2. **Criar novo projeto Supabase**
3. **Anotar as credenciais**:
   - Project URL (ex: `https://abcdefgh.supabase.co`)
   - Anon Key (chave pública)
   - Service Role Key (chave privada - NUNCA expor no frontend)
   - Project ID (ex: `abcdefgh`)

---

## 🔧 Etapas da Migração

### Etapa 1: Executar Scripts SQL

Execute os scripts SQL **na ordem** no SQL Editor do Supabase Dashboard:

1. **`01_schema.sql`** - Cria tabelas, funções e triggers
2. **`02_rls_policies.sql`** - Configura Row Level Security
3. **`03_storage.sql`** - Cria buckets de storage
4. **`04_cron_job.sql`** - Configura cron job (editar com suas credenciais)
5. **`05_admin_setup.sql`** - Configura usuário admin

### Etapa 2: Configurar Secrets das Edge Functions

No Supabase Dashboard, vá em **Project Settings > Edge Functions > Secrets** e adicione:

| Secret Name | Descrição |
|------------|-----------|
| `VAPID_PUBLIC_KEY` | Chave pública VAPID para push notifications |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID para push notifications |

> **Como gerar VAPID Keys**: https://web-push-codelab.glitch.me/

### Etapa 3: Deploy das Edge Functions

1. Instale o Supabase CLI:
```bash
npm install -g supabase
```

2. Faça login:
```bash
supabase login
```

3. Link ao projeto:
```bash
supabase link --project-ref SEU_PROJECT_ID
```

4. Deploy das functions:
```bash
supabase functions deploy notify-offer-accepted
supabase functions deploy notify-new-offer
supabase functions deploy notify-motoboy-arrived
supabase functions deploy notify-snack-exchange
supabase functions deploy notify-rating-reminder
supabase functions deploy check-pending-ratings
```

### Etapa 4: Configurar Auth

No Supabase Dashboard, vá em **Authentication > Providers** e configure:

1. **Email Provider**: Habilitado
2. **Confirm email**: Desabilitado (para desenvolvimento) ou configurar SMTP
3. **Site URL**: URL do seu app (ex: `https://seuapp.lovable.app`)

### Etapa 5: Atualizar Credenciais no Lovable

Crie um arquivo `.env.local` ou atualize as variáveis de ambiente no Lovable:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_anon_key_aqui
VITE_SUPABASE_PROJECT_ID=SEU_PROJECT_ID
```

---

## 📁 Lista de Edge Functions

| Function | Descrição |
|----------|-----------|
| `notify-offer-accepted` | Notifica quando extra é aceito |
| `notify-new-offer` | Notifica motoboys sobre novos extras |
| `notify-motoboy-arrived` | Notifica restaurante quando motoboy chega |
| `notify-snack-exchange` | Notifica sobre trocas de lanche |
| `notify-rating-reminder` | Lembra de avaliar |
| `check-pending-ratings` | Verifica avaliações pendentes (cron) |

---

## ⚠️ Diferenças Importantes

### No Lovable Cloud (automático):
- Deploy automático de Edge Functions
- Secrets gerenciadas automaticamente
- Cron jobs pré-configurados

### No Supabase Próprio (manual):
- Deploy via CLI: `supabase functions deploy`
- Secrets configuradas no Dashboard
- Cron jobs via SQL (pg_cron)

---

## 🔐 Segurança

- **NUNCA** exponha a Service Role Key no frontend
- Configure RLS em TODAS as tabelas
- Use a função `has_role()` para verificar permissões
- Configure CORS adequadamente nas Edge Functions

---

## 🧪 Testando

1. Crie um usuário de teste
2. Verifique se consegue fazer login
3. Teste criar um extra
4. Verifique se as notificações funcionam
5. Teste o fluxo completo de aceitar extra

---

## 📞 Suporte

- Documentação Supabase: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
