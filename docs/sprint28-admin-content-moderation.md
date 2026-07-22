# Sprint 28 — Moderação administrativa de problemas e soluções

## Objetivo e páginas

Esta sprint acrescenta as páginas protegidas `#/admin/problems` e `#/admin/solutions`. Elas reutilizam `AdminRoute`: visitantes são direcionados ao login e contas autenticadas sem `role = admin` recebem a página 403. O dashboard abre as novas páginas sem substituir as rotas administrativas legadas.

As páginas são **consultas administrativas paginadas**, de 25 itens por página, com busca local case-insensitive (aplicada somente à página retornada) e filtro pelos status efetivamente presentes na resposta. Há estados de carregamento, vazio, erro e nova tentativa, tabela em desktop e cards em mobile. São exibidos somente campos públicos úteis: título, resumo, responsável, status, categoria/região ou maturidade, datas e relacionamentos já retornados. O link de visualização usa a rota pública por hash.

## Levantamento do backend confirmado

| Capacidade | Problemas | Soluções |
| --- | --- | --- |
| Consulta paginada segura de campos públicos | Sim: `SELECT` com RLS e grant de colunas públicas; `.range()`/`count: exact` | Sim: `SELECT` público já usado pelo catálogo; `.range()`/`count: exact` |
| Não publicados, pendentes, denunciados | Não existe status/consulta administrativa específica | Não existe status/consulta administrativa específica |
| Arquivados | Sim, pelo status persistido `Arquivado`/`Arquivada` | Sim, pelo status persistido `Arquivada` |
| Publicar, despublicar, arquivar, restaurar, excluir, transferir autoria | Não há RPC administrativa dedicada e auditada | Não há RPC administrativa dedicada e auditada |
| Histórico | Linha do tempo pública: `get_problem_timeline(uuid)` | Não existe histórico equivalente dedicado |
| Denúncias relacionadas | Não existe integração para problemas | Não existe integração para soluções |

A RPC `publish_problem_update(uuid, text, text, text)` existe, mas é uma atualização oficial de organizações verificadas, moderadores e admins; não é uma API de moderação administrativa geral, não exige justificativa e portanto não é acionada por estas páginas. `review_contribution(uuid, text, text)` já atende propostas de contribuição no fluxo existente, não é uma ação sobre o registro principal e também não é duplicada aqui.

A auditoria existente registra mudanças de domínio via trigger com `problem.created`, `problem.updated`, `problem.deleted`, `solution.created`, `solution.updated` e `solution.deleted`; atualizações oficiais de problema também chamam `write_audit_event('problem.updated', ...)`. Como não há ação mutável nesta sprint, nenhuma nova ação de auditoria é inventada ou disparada pelo navegador.

## Regras de segurança e limitações

Não houve migration criada ou alterada. Não há service role no navegador, nem `update`/`delete` nos repositórios administrativos. A listagem não expõe e-mails, tokens, UUIDs de autoria, metadados de fonte, coordenadas ou dados de autenticação. A ausência de uma RPC/view administrativa autorizada especificamente para conteúdo impede consulta de itens privados/removidos, contagem de denúncias e qualquer mudança de status; esses itens permanecem deliberadamente indisponíveis em vez de usar escrita direta insegura.

A paginação é server-side. A busca e o filtro são locais à página, pois as RPCs/views administrativas com busca autorizada não existem; por isso o contador indica explicitamente os resultados da página atual.

## Roteiro de teste manual

1. Como visitante, abra `#/admin/problems` e `#/admin/solutions` e confirme o redirecionamento para login.
2. Como usuário comum, confirme a página 403 nas duas URLs.
3. Como admin, abra **Problemas** e **Soluções** no dashboard, pesquise, aplique status, navegue entre páginas e abra um item público.
4. Desconfigure temporariamente o Supabase para verificar erro sanitizado e **Tentar novamente**.
5. Verifique desktop/mobile, dark mode e textos longos. Não há diálogo de moderação nesta sprint, pois nenhuma ação de escrita segura foi confirmada.
