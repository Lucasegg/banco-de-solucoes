# Recuperação do pipeline de migrations

## Incidente e escopo

Os pushes de `main` após as PRs #52, #53 e #54 alcançaram `migrate-and-health` depois de `verify`, mas falharam no mesmo ponto: `npx --yes supabase@2.39.2 db push` ao iniciar `20260722290000_sprint29_authenticated_actions`. O erro confirmado foi `SQLSTATE 42883`: a migration fazia `REVOKE` com uma assinatura presumida de `create_solution_with_problems` que não existe no banco remoto. Como migrations são sequenciais e transacionais, a primeira pendência abortou o push e bloqueou `20260722300000_hotfix_favorites_authorship`; portanto as três falhas têm a mesma causa raiz.

Não há `origin` configurado no ambiente de recuperação, nem credenciais/link do Supabase localmente. Assim, este checkout não pode consultar o catálogo remoto ou os runs do Actions diretamente. A evidência disponível é a situação confirmada no incidente e o baseline documentado no repositório: `20260717260000` é a última migration remota aplicada; Sprint 29 e o hotfix de autoria são pendentes, nesta ordem. Não há ambiente conhecido registrado com Sprint 29 aplicada ou com checksum divergente. Execute a lista abaixo no job antes do push e anexe sua saída mascarada à PR para confirmar isso:

```sh
npx --yes supabase@2.39.2 migration list --linked
```

Ela deve mostrar as migrations locais e remotas, `20260722290000` como primeira pendente, `20260722300000` como pendente posterior, e nenhuma migration remota sem arquivo local. Não foi usado `migration repair`: o SQL pendente deve ser executado, não marcado artificialmente como aplicado. Migrations anteriores ao baseline não foram modificadas.

## Correção excepcional

A Sprint 29 é a única migration histórica alterada porque comprovadamente nunca foi aplicada ao remoto. Ela agora exige explicitamente as tabelas obrigatórias via `to_regclass`, dando erro de integridade claro para um baseline incompleto, e resolve funções existentes com `pg_proc`, `pg_namespace`, `oid::regprocedure` e `format`. Logo, RPC ausente, assinatura divergente e overload não causam `42883`; somente objetos realmente existentes recebem alterações de privilégio.

### Matriz de grants

| Grupo | RPCs | Depois da Sprint 29 |
| --- | --- | --- |
| Cliente autenticado | `create_solution_with_problems`, `update_solution_with_problems`, `report_comment`, `mark_comment_best_answer`, `moderate_comment_visibility`, `review_contribution`, `publish_problem_update`, `mark_notification_read`, `mark_all_notifications_read`, `update_user_role` | `PUBLIC` e `anon` revogados; `authenticated` recebe `EXECUTE` para cada overload existente. Os corpos preexistentes validam autoria, moderação ou admin conforme aplicável. |
| Interna | `create_notification`, `write_audit_event` | `PUBLIC`, `anon` e `authenticated` revogados. São chamadas por funções/fluxos internos. |

As assinaturas reais, `SECURITY DEFINER`, `search_path`, overloads e grants devem ser registrados da execução remota do catálogo abaixo antes do merge. O checkout não afirma resultados que não pôde observar:

```sql
select n.nspname as schema_name, p.proname as function_name,
  p.oid::regprocedure as signature, p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
  coalesce(array_to_string(p.proconfig, ', '), '(default)') as function_config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = any (array[
  'create_solution_with_problems','update_solution_with_problems','report_comment',
  'mark_comment_best_answer','moderate_comment_visibility','review_contribution',
  'publish_problem_update','mark_notification_read','mark_all_notifications_read',
  'update_user_role','create_notification','write_audit_event'])
order by p.proname, p.oid::regprocedure::text;
```

## Tabelas e storage

Sprint 29 treats `profiles`, `problems`, `solutions`, `solution_problems`, `comments`, `comment_reports`, `favorites`, `reactions`, `contributions`, `contribution_audit`, `notifications`, `problem_timeline`, `audit_events` and `storage.objects` as mandatory prior-baseline objects. `to_regclass` verifies every one before the fixed table revokes run. Storage policy names are dropped idempotently and recreated for `avatars`, `problem-images` and `solution-images`. The frontend path contract is an authenticated user's UUID as the first folder; the policies retain public-read model and restrict insert/update/delete to that prefix. Review `storage.buckets` and `pg_policies` remotely before deployment.

The favorites/authorship migration remains timestamped after Sprint 29, uses no RPC signatures, deletes only older rows in exact duplicate favorite pairs, and recreates named policies idempotently inside its transaction. No concrete defect was found, so it was not changed.

## Safeguards, validation, and rollback

`scripts/pendingMigrationsSafety.test.ts` derives all local files after the documented remote baseline, checks chronological transactional order, rejects rigid signatures for every audited RPC, asserts the catalog/regprocedure design, rejects service-role references and self-marking history, and pins the checksum of the prior baseline migration. CI runs it in `verify` and again immediately before `db push`; migrations and health checks have no `continue-on-error`, and deployment still requires `migrate-and-health`.

Dynamic Supabase validation was not available in this environment: the pinned CLI download (`npx --yes supabase@2.39.2`) was blocked by registry policy with HTTP 403, so no linked-project query, reset, lint, dry-run, or SQL application was claimed as executed. Before merge/run the next deploy, run:

```sh
npx supabase db reset
npx supabase db lint
npx --yes supabase@2.39.2 migration list --linked
npx --yes supabase@2.39.2 db push --dry-run
```

Then validate catalog grants, `to_regclass` table list, buckets/policies, anon write/RPC denial, authenticated allowed RPCs, admin/moderator body checks, internal-RPC denial, and ownership rules. If the production push fails, do not repair history: stop deployment (it is already gated), preserve the error and transaction rollback, correct only the still-pending migration after verifying remote history, and rerun the same validation. Rollback of a successfully applied migration must be a new forward migration that restores the intended grants/policies, never a history rewrite.
