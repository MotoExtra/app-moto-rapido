

## Plano: Confirmação de E-mail no Cadastro de Motoboy

### O que será feito

Após clicar em "Concluir cadastro", o motoboy será redirecionado para uma **tela de confirmação de e-mail** com instruções claras para verificar sua caixa de entrada e clicar no link enviado. O sistema de autenticação já envia o e-mail automaticamente (via `signUp` com `emailRedirectTo`), mas atualmente o auto-confirm está ativado, então precisamos desativá-lo.

### Etapas

1. **Desativar auto-confirmação de e-mail**
   - Usar a ferramenta `configure_auth` para garantir que e-mails precisam ser confirmados antes do login
   - Isso faz o sistema enviar automaticamente um e-mail de verificação no `signUp`

2. **Criar página `EmailConfirmation`** (`src/pages/EmailConfirmation.tsx`)
   - Tela profissional com logo do app, ícone de e-mail animado
   - Mensagem clara: "Verifique seu e-mail"
   - Exibe o e-mail do usuário cadastrado
   - Instruções passo a passo (abrir e-mail, clicar no link, verificar spam)
   - Botão "Reenviar e-mail" com cooldown de 60 segundos
   - Botão "Voltar para Login" no final
   - Visual alinhado com a identidade do app (laranja/azul escuro)

3. **Adicionar rota `/confirmar-email`** no `App.tsx`

4. **Atualizar `SignupMotoboy.tsx`**
   - Após cadastro bem-sucedido, redirecionar para `/confirmar-email?email=xxx` em vez de `/login/motoboy`
   - Manter o logout imediato após cadastro

5. **Atualizar `SignupRestaurant.tsx`**
   - Aplicar o mesmo fluxo para restaurantes (consistência)

6. **Atualizar `Login.tsx` e `LoginRestaurant.tsx`**
   - Tratar o erro de e-mail não confirmado, exibindo mensagem amigável com opção de reenviar

### Tela de Confirmação — Layout

```text
┌──────────────────────────┐
│        [Logo]            │
│                          │
│     ✉️ (ícone animado)   │
│                          │
│  Verifique seu e-mail    │
│                          │
│  Enviamos um link de     │
│  confirmação para:       │
│  usuario@email.com       │
│                          │
│  ┌────────────────────┐  │
│  │ 1. Abra seu email  │  │
│  │ 2. Clique no link  │  │
│  │ 3. Volte e faça    │  │
│  │    login            │  │
│  └────────────────────┘  │
│                          │
│  ⚠️ Verifique a pasta   │
│     de spam              │
│                          │
│  [Reenviar e-mail (58s)] │
│  [Ir para Login]         │
└──────────────────────────┘
```

### Detalhes Técnicos

- O `emailRedirectTo` no signup será atualizado para `${window.location.origin}/login/motoboy` para que após confirmar, o usuário vá direto para o login
- Reenvio usa `supabase.auth.resend({ type: 'signup', email })`
- O e-mail é passado via query param na URL para exibir na tela
- Nenhuma migração de banco necessária

