# Sprint 32 — Busca avançada, filtros e relevância

`/search` pesquisa apenas o catálogo público de problemas e soluções. Problemas
consideram título, resumo, descrição, categoria, tags, cidade e estado; soluções
consideram título, resumo, descrição, categoria, tags, organização e métrica de
impacto. Campos administrativos, auditoria, e-mails, metadados de fonte e mensagens
privadas não são retornados nem pesquisados.

## Filtros, ordenação e URL

Problemas aceitam categoria, status, estado, cidade, tags, período, com/sem solução,
favoritos e autoria própria. Soluções aceitam categoria, organização, tags, período,
problema relacionado, favoritos, autoria própria, evidências e métrica. Os dois últimos
filtros de usuário só aparecem para sessão autenticada. A URL hash aceita exclusivamente
parâmetros conhecidos (`tab`, `q`, filtros, `sort` e `page`), normaliza texto e ignora
valores inválidos. A paginação é de 20 itens, limitada no servidor a 50.

Relevância somente é oferecida com termo textual e usa `websearch_to_tsquery` e
`ts_rank_cd` com peso maior para título, seguido de resumo, descrição e taxonomias.
Todas as ordenações têm `id` como desempate. O campo usa debounce de 350 ms. O destaque
é criado com nós React, sem HTML do banco.

## Segurança e banco

As RPCs `search_problems` e `search_solutions` são `security invoker`: permanecem sob
RLS da sessão e não usam credencial privilegiada. Favoritos e autoria são calculados
exclusivamente contra `auth.uid()`; nenhum identificador de usuário é argumento da RPC.
As funções retornam somente colunas necessárias aos cartões e excluem itens arquivados.

A migration aditiva cria dois GIN para os documentos textuais ponderados, índices de
filtros por catálogo e o índice inverso de vínculos solução–problema. Não foram alteradas
migrations existentes, pipeline ou políticas existentes. Não foram criadas extensões.

## Limitações e testes

O catálogo atual não possui coluna geral de visibilidade para problemas e soluções;
`Arquivado`/`Arquivada` é tratado como conteúdo removido na busca. As opções livres
(categoria, cidade e organização) não carregam listas inteiras no cliente. A suíte
Sprint 32 audita os contratos de segurança, URL, UI e migration.

## Auditoria corretiva

O schema de migrations confirma que `problems` usa `summary` opcional e `description`,
`category`, `city`, `state`, `tags`, `status`, `author_id`, `author_name`, `likes`,
`comments`, `created_at` e `updated_at`; `solutions` usa os mesmos campos aplicáveis,
mais `organization`, `impact_metric` e `evidence_links`. `favorites` relaciona `user_id`
a `problem_id` ou `solution_id`, e `solution_problems` usa os UUIDs `solution_id` e
`problem_id`. Não há coluna de privacidade/moderação para problemas ou soluções no schema
atual; as policies de leitura existentes são públicas e a busca, executada como invoker,
não as ignora. Arquivados são removidos explicitamente, e não são retornados campos
administrativos.

Os GIN usam precisamente o mesmo `tsvector` ponderado do `@@`: A título, B resumo,
C descrição e D taxonomia/localização. `safe_search_tsquery` normaliza e limita a 160
caracteres, captura termos websearch malformados e usa `plainto_tsquery` como fallback.
`problemId` só segue para a RPC quando for UUID canônico; os demais viram `null`.
Os filtros de solução por evidências e impacto devem evoluir para estado tri-state completo
(todos/com/sem); o contrato SQL já aceita `boolean|null`. `relevance` sem texto é
normalizado para `recent` no servidor.
