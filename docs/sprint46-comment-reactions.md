# Sprint 46 — reações persistentes em comentários

## Arquitetura e dados

O fluxo é `ReactionBar → useDiscussions → CommentReactionRepository → RPC Supabase`. `comment_reactions` mantém uma linha estável por comentário, conta e tipo, com `active`, timestamps, FKs em cascata e índices de agregação/conta. Produção não lê nem combina reações do `localStorage`; o modo sem Supabase informa indisponibilidade.

## Segurança e RPCs

A tabela usa RLS habilitada e forçada e não concede DML a `anon` ou `authenticated`. `toggle_my_comment_reaction(uuid,text)` é a única escrita: deriva `auth.uid()`, valida os quatro tipos, recusa comentários ocultos, removidos ou excluídos, usa advisory lock transacional e retorna apenas estado/contagem. Auto-reação foi mantida como decisão de produto, mas nunca gera auto-notificação. Todas as funções `SECURITY DEFINER` fixam `search_path`.

`get_comment_reaction_summary(problem,solution)` exige exatamente um alvo e agrega todos os comentários públicos em uma chamada. Retorna somente comentário, tipo, contagem ativa e seleção da sessão; anônimos recebem `selected_by_user=false`. Nenhuma identidade de quem reagiu é projetada.

## Notificações, concorrência e moderação

Somente a primeira transição para ativa cria `comment.reacted`, na mesma transação, para `comments.user_id` e respeitando a preferência `comments`. A chave por comentário/ator/tipo torna o evento idempotente; desativação e reativação não criam spam. Exclusões de comentário, usuário ou pai removem linhas em cascata; ocultação/remoção é filtrada tanto na escrita como no resumo.

A interface faz atualização otimista com rollback. Um controlador com trava síncrona serializa a chave comentário/tipo; gerações de sessão limpam operações e resumos e impedem resultados antigos de alterar ou liberar operações da nova conta. Botões preservam teclado, foco visível, `aria-pressed`, `aria-live`, i18n e contagens para visitantes.

## Limitações e validação manual

Não há Realtime para a tabela interna: outras abas reconciliam no próximo carregamento. Não há reputação, ranking ou badges novos. Para validar: abrir um problema e uma solução; comparar contagens anônimas; autenticar duas contas; alternar os quatro tipos; testar clique duplo; ocultar/remover um comentário; conferir uma única notificação no autor; sair/trocar de conta durante uma operação; e executar `npm run test:sprint46` mais as assertions SQL no PostgreSQL isolado.
