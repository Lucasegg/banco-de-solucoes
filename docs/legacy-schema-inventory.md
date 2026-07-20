# Inventário das migrations legadas (Sprints 13–24)

Esta é a matriz de auditoria usada pelo Hotfix 26.2. Ela foi derivada de cada arquivo
entre `20260715130000` e `20260717240000`; a reconciliação só considera uma versão
completa quando os objetos abaixo, e não só a tabela principal, forem verificados.

| Migration | Escopo auditado |
|---|---|
| 20260715130000 | `profiles`: identidade, username/role constraints, índices, funções/triggers Auth, RLS policies. |
| 20260715150000 | `problems`, `solutions`, `solution_problems`: colunas, FKs/checks, índices, updated-at triggers, RLS e RPCs de solução. |
| 20260715170000 | `comments`, `comment_reports`: árvores, reports, constraints, índices, contadores, triggers, RLS e RPCs de moderação. |
| 20260716120000 | `favorites`: alvo exclusivo, índices únicos/parciais e RLS de proprietário. |
| 20260716150000 | Campos de perfil (`website`, organização e sociais), constraints/índice de username, trigger de imutáveis. |
| 20260716160000 | Buckets `avatars`, `problem-images`, `solution-images` e policies `storage.objects`; proteção de perfil. |
| 20260716170000 | Integração social/Auth: geração de slug/username e `handle_new_auth_user_profile`. |
| 20260717120000 | Sprint 20: `comments.user_id`, proteção, `reactions`, seus índices/RLS e `get_reaction_summary`. |
| 20260717160000 | Sprint 21: `contributions`, `contribution_audit`, FKs, índices, RLS, revisão e histórico. |
| 20260717190000 | Sprint 22: RBAC, `audit_events`, índices/RLS/imutabilidade, auditoria de domínios e validação de contribuição. |
| 20260717210000 | Sprint 23: `notifications`, RLS/grants, funções de leitura/marcação e triggers de notificação. |
| 20260717230000 | Catálogo verificado: proveniência, metadata segura, índice de fonte externa e importação inicial (não repetida). |
| 20260717240000 | Sprint 24: papéis/status, `problem_timeline`, RLS/grants, timeline e publicação oficial. |

As migrations 25 e 25.1 não são alteradas. A migration de reconciliação recria apenas
funções seguras essenciais do mapa e preserva suas permissões; a validação operacional
em `docs/deploy.md` cobre as assinaturas restantes antes do baseline.
