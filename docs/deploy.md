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
2. executa `supabase db push`;
3. executa `npm run check:database` usando a service role;
4. configura Pages e envia o artifact já verificado.

O job `deploy` depende de `migrate-and-health`. Falha de migration, schema incompatível, RPC/assinatura/coluna ausente ou indisponibilidade de Auth/Storage impede tanto o artifact de Pages quanto o deploy.

## Validação pós-deploy e rollback

Após publicar, acesse `#/admin/system` como administrador e confirme `database`, `schema_version`, `required_rpcs`, `required_columns`, `auth`, `storage` e `response_time`, incluindo versão, latências e timestamp.

Nunca apague ou edite uma migration aplicada. Em caso de falha, reverta primeiro o frontend e crie uma migration compensatória idempotente usando `IF NOT EXISTS`, `ON CONFLICT` e `CREATE OR REPLACE FUNCTION`; depois repita migrations, health check e deploy.
