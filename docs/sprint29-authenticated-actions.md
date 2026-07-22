# Sprint 29 — ações autenticadas

## Regra global
`anon` mantém apenas leitura do catálogo, mapa, detalhes, busca e filtros públicos. Toda escrita exige uma sessão `authenticated`; RLS, grants e validações das RPCs continuam sendo a autoridade final. Não há service role no navegador.

## Matriz de auditoria

| Ação | Superfície | Backend | Anon antes/depois | Alteração e teste |
|---|---|---|---|---|
| Criar/editar/excluir problema | formulários/detalhe | `problems` | RLS já exigia autoria; agora grants anon revogados | rota autenticada; auditoria estática |
| Criar/editar/excluir solução e vínculos | formulários/detalhe | tabelas/RPCs de soluções | RLS/autoria; RPCs possuíam risco de `PUBLIC EXECUTE` | revogar `PUBLIC`/anon e conceder authenticated |
| Comentário, resposta, edição/exclusão | detalhe/discussões | `comments` | RLS/auth.uid | grants anon revogados; validação de RPC revisada |
| Denunciar/moderar/melhor resposta | discussões/admin | RPCs de comentários | RPCs agora sem `PUBLIC`/anon | grant authenticated; funções validam sessão/papel/autoria |
| Favorito e reações | detalhe/favoritos | `favorites`, `reactions` | RLS já usa `auth.uid()` | grants anon de escrita revogados |
| Contribuição e revisão | detalhe/contribuições | `contributions`, `review_contribution` | RLS/role; RPC agora sem anon | rota autenticada e grant authenticated |
| Atualização oficial | linha do tempo | `publish_problem_update` | agora sem anon | RPC exige auth.uid e papel verificado/moderador/admin |
| Notificações | página privada | RPCs de notificações | agora sem anon | rota autenticada e grant authenticated |
| Imagens | formulários | `storage.objects` | escrita anon revogada | policies por prefixo `auth.uid()`; leitura pública preservada |
| Administração | `/admin/*` | AdminRoute/RPCs | já protegido | AdminRoute continua exigindo sessão e papel |

Não há implementações de organizações, projetos, convites, seguir conteúdo, voto separado, denúncia de problema/solução ou anexos além das imagens nesta base. Não foram encontradas páginas públicas de perfis/organizações; `profiles` segue protegido conforme política existente.

## Rotas e retorno

`AuthenticatedRoute` é a autoridade única de redirecionamento para rotas autenticadas: seu `useEffect` idempotente bloqueia sem flash `/problems/new`, `/solutions/new`, perfil, conta, contribuições, favoritos, notificações e detalhes privados de contribuições. As rotas de leitura de problemas, soluções, mapa, home e busca continuam públicas. O `App` não possui fluxo concorrente para essas rotas. O retorno é guardado somente em `sessionStorage`; `isSafeReturnTo` aceita apenas hash interno que começa com `#/`, rejeitando URLs externas, `//`, barras invertidas e esquemas. Login e cadastro consomem esse retorno e nunca reenviam uma mutação destrutiva automaticamente.

## Backend, limitações e roteiro

A migration nova é transacional e não altera migrations anteriores. Ela revoga escrita de `anon`, remove o `EXECUTE` padrão `PUBLIC`/anon das RPCs mutáveis e cria políticas de escrita no storage para prefixos pertencentes ao usuário. Policies/RPCs existentes foram revisadas quanto a `auth.uid()`, papel, autoria e `search_path`; a validação estática não substitui uma conexão a um projeto Supabase.

Para validação manual com Supabase: como anon, tente `INSERT/UPDATE/DELETE` nas tabelas da matriz, invocar cada RPC mutável e enviar para cada bucket; todos devem receber 401/403. Confirme `SELECT` público em problemas/soluções/mapa. Como usuário, confirme apenas autoria; como moderador/admin confirme as ações de papel. No navegador, abra rotas protegidas deslogado, entre/crie conta e confirme o retorno; tente `#//evil.example` e confirme que cai em perfil. Verifique teclado, sessão expirada, desktop/mobile e dark mode.

Riscos conhecidos: o repositório não disponibiliza ambiente Supabase local/configurado nesta execução, portanto não foi feita prova dinâmica de RLS. A UI existente já evita diversas mutações sem usuário, mas o banco foi endurecido para não depender dessa camada.
