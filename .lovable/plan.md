

## Reduzir página inicial do histórico de XP para 5 itens

Ajuste simples: mostrar apenas 5 eventos por padrão no histórico de XP, com o botão "Carregar mais" logo abaixo. Isso deixa a tela mais limpa e carrega mais rápido.

### Mudança

**Arquivo:** `src/components/gamification/XPHistoryTimeline.tsx`

- Alterar a constante `PAGE_SIZE` de `20` para `5`
- Isso afeta tanto o carregamento inicial quanto cada "Carregar mais" (sempre traz 5 por vez)

### Detalhes técnicos

- Linha 48: `const PAGE_SIZE = 20;` passa para `const PAGE_SIZE = 5;`
- Toda a lógica de paginação (hasMore, loadMore, query com `.limit(PAGE_SIZE)`) já usa essa constante, então não precisa de mais nenhuma alteração

