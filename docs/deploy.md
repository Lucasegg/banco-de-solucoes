# CI, deploy e diagnóstico

## Categorias de secrets

Cadastre todos os secrets em **Settings → Secrets and variables → Actions → New
repository secret** no repositório do GitHub. Use exatamente os nomes abaixo e
copie os valores das áreas indicadas no dashboard da Supabase:

### Supabase CLI — migrations

- `SUPABASE_ACCESS_TOKEN`: crie um token pessoal em **Account Settings → Access
  Tokens**. Ele fica disponível no ambiente do job com esse nome, que é o nome
  reconhecido pela Supabase CLI;
- `SUPABASE_PROJECT_REF`: copie o **Reference ID** em **Project Settings →
  General**. O valor deve conter **somente o Reference ID** (por exemplo,
  `abcdefghijklmnopqrst`), nunca a URL completa do projeto, e é passado a
  `supabase link --project-ref`;
- `SUPABASE_DB_PASSWORD`: use a senha definida na criação do projeto. Se ela não
  estiver disponível no gerenciador de senhas da equipe, redefina-a em **Project
  Settings → Database** antes de atualizar o secret.

O access token de gerenciamento **não é um JWT do projeto** e nunca é enviado a `/rest`, `/auth` ou `/storage`.

### Health check server-side

- `SUPABASE_URL`: copie a **Project URL** exibida em **Project Settings → API**;
- `SUPABASE_SERVICE_ROLE_KEY`: copie a chave `service_role` em **Project Settings
  → API → Project API keys**. Essa é a credencial server-side usada pela RPC e
  pelos checks somente leitura de Auth e Storage.

A service role existe somente nos secrets protegidos do GitHub Actions. Ela nunca recebe prefixo `VITE_`, nunca vai para o frontend, artefatos ou logs e deve ser rotacionada se houver suspeita de exposição.

O job valida os cinco nomes obrigatórios antes de executar a CLI e informa apenas
o nome que estiver ausente. A validação não imprime, não mascara parcialmente e
não registra os valores. O health check server-side usa exclusivamente
`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`; `VITE_SUPABASE_ANON_KEY` não é uma
credencial válida para essa etapa.

### Build público

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_ANON_KEY`.

Somente essas configurações públicas são incorporadas pelo Vite.

## Pull requests

O job `verify` executa `npm ci`, typecheck, testes da Sprint 26, `git diff --check` e build. Pull requests não aplicam migrations, não consultam produção, não usam credenciais server-side e não fazem deploy. Assim, a validação de uma PR não depende da disponibilidade do projeto Supabase.

## Verificação do hotfix de autenticação no ambiente publicado

O workflow publica somente pushes para `main`: a PR, por si só, não altera o site. Para confirmar que uma publicação contém este hotfix (inclusive ao investigar a PR #52), confira o SHA do commit do run de GitHub Actions que concluiu o job `deploy` e compare-o com o SHA que contém a alteração em `AuthenticatedRoute`. Em seguida, abra o site publicado em uma janela anônima (ou após limpar os dados do site), acesse diretamente `#/problems/new` e `#/solutions/new` e faça refresh em cada rota. Antes do login, deve aparecer apenas a tela “Entre ou crie uma conta para continuar”; campos, seletores e controles de upload não devem existir no DOM.

Não há registro de service worker neste repositório e o artifact publicado é o diretório `dist` criado pelo Vite. Portanto, não atribua uma divergência a cache sem evidência: valide primeiro o SHA do deployment, o artifact associado ao run e a resposta atual do host. Se o SHA estiver correto e o comportamento persistir, faça um hard reload e inspecione se a URL/host acessado é o ambiente de GitHub Pages configurado pelo job `deploy`.

## Push para `main`

Após `verify` ficar verde, o job `migrate-and-health`:

1. conecta a Supabase CLI ao projeto usando uma versão fixa;
2. executa `npm run check:migration-baseline`, sem modificar o banco;
3. executa `supabase db push`;
4. executa `npm run check:database` usando a service role e os endpoints estáveis de dados, autenticação e armazenamento;
5. configura Pages e envia o artifact já verificado.

O job `deploy` depende de `migrate-and-health`. Falha de migration, baseline, histórico de migrations ou indisponibilidade dos serviços essenciais impede tanto o artifact de Pages quanto o deploy. A versão aplicada é verificada pelo histórico oficial de migrations, não por uma RPC. Antes do merge de alterações de migrations, workflows, scripts de deploy/baseline, `scripts/checkDatabase.ts` ou configuração do banco, execute e registre o [Production preflight](deployment-preflight.md).

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

## Hotfix 26.2 — recuperação de histórico legado do Supabase

### Diagnóstico confirmado

A produção tem somente `20260717250000` (`public_problem_map`) e
`20260717251000` (`hotfix_map_rpc_cache`) em `supabase_migrations.schema_migrations`.
Os objetos `profiles`, `problems`, `solutions`, `comments` e `favorites` existem, mas
`reactions`, `contributions`, `contribution_audit`, `audit_events`, `notifications` e
`problem_timeline` não existem. A existência de uma tabela **não** prova que suas
colunas, constraints, índices, funções, triggers, RLS, grants ou Storage policies foram
aplicados. Portanto, não use `supabase db push --include-all` e não marque todo o
histórico como aplicado antes da reconciliação.

A migration `20260717259000_hotfix26_2_reconcile_legacy_schema.sql` é aditiva e
idempotente: ela preserva linhas/IDs, não executa seeds ou imports e não contém
`DROP TABLE`/`TRUNCATE`. O workflow não chama `db push`, `--include-all` nem
`migration repair`; nenhuma service role é entregue ao frontend.

### Fase A — auditoria (somente leitura)

No ambiente administrativo seguro (nunca no browser), configure `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` e execute:

```bash
npm ci
npm run audit:legacy-schema
npx --yes supabase@2.39.2 migration list --linked
```

Guarde a saída da auditoria e confirme o histórico de duas versões antes de seguir.
O script não imprime credenciais e retorna erro quando detecta divergências.

### Fase B — reconciliação do schema

Faça backup e aplique **somente** a migration auditável, sem reaplicar legadas:

```bash
npx --yes supabase@2.39.2 link --project-ref "$SUPABASE_PROJECT_REF"
npx --yes supabase@2.39.2 db execute --linked --file supabase/migrations/20260717259000_hotfix26_2_reconcile_legacy_schema.sql
npm run audit:legacy-schema
```

Se a versão instalada da CLI não disponibilizar `db execute --file`, execute o mesmo
arquivo pelo SQL Editor administrativo do Supabase, registre a evidência e **não**
insira linhas em `supabase_migrations.schema_migrations` por SQL da aplicação.

### Fase C — validação

Revise a saída da auditoria e valide manualmente colunas de perfis/sociais, proveniência
do catálogo, comentários, favoritos, reações, contribuições/auditoria, notificações,
timeline, RPCs/triggers de Sprints 20–24, e grants das RPCs do mapa 25/25.1. Reexecute
a migration uma vez em staging para confirmar idempotência.

### Fase D — baseline manual do histórico

**Somente após a Fase C**, use a CLI oficial para registrar o baseline (nunca SQL
manual e nunca GitHub Actions):

```bash
for version in 20260715130000 20260715150000 20260715170000 20260716120000 20260716150000 20260716160000 20260716170000 20260717120000 20260717160000 20260717190000 20260717210000 20260717230000 20260717240000 20260717259000; do
  npx --yes supabase@2.39.2 migration repair --linked --status applied "$version"
done
npx --yes supabase@2.39.2 migration list --linked
npm run check:migration-baseline
```

`repair` é uma ação humana explícita, registrada no change ticket; ela nunca é
automatizada. Não marque uma versão se a auditoria ainda reportar seu objeto completo
como divergente.

### Fase E — aplicação da Sprint 26

Com o baseline validado, aplique a migration normal da Sprint 26 (sem `--include-all`):

```bash
npx --yes supabase@2.39.2 db push
```

### Fase F — health check e deploy

```bash
npm run check:database
npm run audit:legacy-schema
npm run build
```

Somente depois dos checks verdes, habilite o deploy. O pipeline apenas verifica e faz
auditoria; ele não tenta corrigir histórico nem schema de produção automaticamente.
