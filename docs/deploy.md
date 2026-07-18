# CI, deploy e diagnóstico

## Categorias de secrets

### Supabase CLI — migrations

- `SUPABASE_ACCESS_TOKEN`: token de gerenciamento consumido exclusivamente pela CLI;
- `SUPABASE_PROJECT_REF`: referência do projeto;
- `SUPABASE_DB_PASSWORD`: senha do banco remoto.

O access token de gerenciamento **não é um JWT do projeto** e nunca é enviado a `/rest`, `/auth` ou `/storage`.

### Health check server-side

- `SUPABASE_URL`: URL do projeto;
- `SUPABASE_SERVICE_ROLE_KEY`: credencial estável usada pela RPC e pelos checks somente leitura de Auth e Storage.

A service role existe somente nos secrets protegidos do GitHub Actions. Ela nunca recebe prefixo `VITE_`, nunca vai para o frontend, artefatos ou logs e deve ser rotacionada se houver suspeita de exposição.

### Build público

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`.

Somente essas configurações públicas são incorporadas pelo Vite.

## Pull requests

O job `verify` executa `npm ci`, typecheck, testes da Sprint 26, `git diff --check` e build. Pull requests não aplicam migrations, não consultam produção, não usam credenciais server-side e não fazem deploy. Assim, a validação de uma PR não depende da disponibilidade do projeto Supabase.

## Push para `main`

Após `verify` ficar verde, o job `migrate-and-health`:

1. conecta a Supabase CLI ao projeto usando uma versão fixa;
2. executa `npm run check:migration-baseline`, sem modificar o banco;
3. executa `supabase db push`;
4. executa `npm run check:database` usando a service role;
5. configura Pages e envia o artifact já verificado.

O job `deploy` depende de `migrate-and-health`. Falha de migration, schema incompatível, RPC/assinatura/coluna ausente ou indisponibilidade de Auth/Storage impede tanto o artifact de Pages quanto o deploy.

## Baseline inicial do projeto existente

As Sprints 25 e 25.1 foram aplicadas manualmente pelo SQL Editor antes da automação, e o projeto não possuía `supabase_migrations.schema_migrations`. Por isso, o primeiro merge da Sprint 26 exige uma ação manual, única e auditável. O workflow **não** executa `migration repair`: ele apenas verifica o baseline e interrompe antes de `db push` quando houver divergência.

Primeiro execute as consultas somente leitura abaixo no SQL Editor. Elas devem retornar todas as sete colunas, quatro funções e seis índices esperados:

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'problems'
  and column_name in ('latitude', 'longitude', 'geolocation_precision', 'geolocation_source',
    'geocoded_at', 'source_verified_at', 'source_metadata')
order by column_name;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('public_problem_coordinate', 'get_problems_in_bounds',
    'get_problem_region_summary', 'get_public_problem_location')
order by p.proname;

select indexname
from pg_indexes
where schemaname = 'public' and tablename = 'problems'
  and indexname in ('problems_latitude_idx', 'problems_longitude_idx', 'problems_status_map_idx',
    'problems_category_map_idx', 'problems_city_map_idx', 'problems_state_map_idx')
order by indexname;
```

**Pare imediatamente se algum objeto estiver ausente. Nunca execute `migration repair` sem confirmar antes que todos os objetos da migration já existem no banco.** O repair registra histórico; ele não cria os objetos.

Procedimento manual, usando a mesma Supabase CLI `2.39.2` fixada no workflow:

1. Configure `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` e `SUPABASE_DB_PASSWORD` em um terminal administrativo seguro.
2. Execute `npx --yes supabase@2.39.2 link --project-ref "$SUPABASE_PROJECT_REF"`.
3. Faça a prévia com `npx --yes supabase@2.39.2 migration list --linked`.
4. Somente após validar os objetos acima, registre as migrations manuais uma única vez:
   - `npx --yes supabase@2.39.2 migration repair --status applied 20260717250000`
   - `npx --yes supabase@2.39.2 migration repair --status applied 20260717251000`
5. Execute novamente `npx --yes supabase@2.39.2 migration list --linked` e `npm run check:migration-baseline`.
6. Confirme que `20260717250000` e `20260717251000` aparecem local e remotamente e que apenas `20260717260000` permanece pendente. Se qualquer migration anterior também aparecer somente como local, pare e audite seus objetos antes de registrar seu histórico; nunca faça repair em lote às cegas.
7. Execute `npx --yes supabase@2.39.2 db push` para aplicar a Sprint 26.
8. Execute `npm run check:database` com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

A PR só deve ser mergeada depois de configurar os secrets, concluir esse baseline, confirmar a lista e garantir que o primeiro push não tentará reaplicar as Sprints 25 e 25.1. O deploy completo ainda não foi validado em produção.

## Validação pós-deploy e rollback

Após publicar, acesse `#/admin/system` como administrador e confirme `database`, `schema_version`, `required_rpcs`, `required_columns`, `auth`, `storage` e `response_time`, incluindo versão, latências e timestamp.

Nunca apague ou edite uma migration aplicada. Em caso de falha, reverta primeiro o frontend e crie uma migration compensatória idempotente usando `IF NOT EXISTS`, `ON CONFLICT` e `CREATE OR REPLACE FUNCTION`; depois repita migrations, health check e deploy.
