

## Análise: Tempo de expiração dos extras

Você tem razão em questionar os 30 minutos. Vamos analisar:

### Por que 30 minutos é problemático

- O motoboy pode ter terminado o trabalho mas esqueceu de clicar "Finalizar"
- O restaurante fica bloqueado sem poder ver a avaliação
- O motoboy fica bloqueado sem poder aceitar outro extra
- 30 minutos é tempo demais de espera para algo que já acabou

### Sugestão: **5 minutos** após o horário final

Um buffer de 5 minutos é o ideal porque:

1. **Dá margem** para o motoboy finalizar manualmente se ainda estiver no local
2. **É curto o suficiente** para não bloquear ninguém desnecessariamente
3. **A avaliação aparece rápido** — tanto para o restaurante quanto para o motoboy
4. **Extras "pendentes/arrived"** (motoboy não apareceu) são cancelados rapidamente, liberando o sistema

### O que será alterado

- **Função `auto_complete_expired_extras`**: Trocar `INTERVAL '30 minutes'` por `INTERVAL '5 minutes'` em todas as 3 queries (cancel pending, release offer, complete in_progress)
- Nenhuma alteração no frontend — o cron job já roda a cada 15 minutos, então na prática o extra será processado entre 5 e 20 minutos após o término

### Consideração sobre o cron job

O cron job que chama essa função roda **a cada 15 minutos**. Isso significa que mesmo com o buffer de 5 minutos, pode levar até ~20 minutos no pior caso. Se quiser mais agilidade, podemos também reduzir o intervalo do cron para **cada 5 minutos**.

### Resumo das mudanças

| Item | Antes | Depois |
|------|-------|--------|
| Buffer de expiração | 30 min | 5 min |
| Cron job (opcional) | 15 min | 5 min |
| Arquivos alterados | 1 migration SQL | 1 migration SQL |

