# Deploy, health check e rollback

## Secrets obrigatórios

Configure no ambiente protegido do GitHub Actions:

- `SUPABASE_URL`: URL do projeto;
- `SUPABASE_ANON_KEY`: chave pública usada como `apikey` nas chamadas server-side;
- `SUPABASE_ACCESS_TOKEN`: token de sessão de uma conta `admin`, usado somente no CI;
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: configuração pública do build do frontend.

`SUPABASE_ACCESS_TOKEN` não pode usar prefixo `VITE_`, ser gravado em logs, incluído em artefatos ou disponibilizado ao navegador. O script não possui fallback para variáveis do Vite. Renove ou revogue o token conforme a política operacional do projeto.

## Ordem do deploy

1. Faça backup e aplique migrations com `supabase db push` antes de promover o frontend.
2. Execute `npm ci`.
3. Execute `npm test` e `npm run test:sprint26`.
4. Execute `npm run build`.
5. Execute `npm run check:database` com os três secrets server-side configurados.
6. Publique somente quando todos os comandos terminarem com exit code zero.

O workflow executa o health check antes do build e bloqueia o deploy quando a migration, versão, coluna ou assinatura de RPC estiver incompatível, ou quando Auth/Storage não responderem. O check é somente leitura: consulta a sessão atual e a lista de buckets, sem upload ou modificação de arquivos.

## Validação pós-deploy

1. Acesse `#/admin/system` com uma conta administradora.
2. Confirme os checks `database`, `schema_version`, `required_rpcs`, `required_columns`, `auth`, `storage` e `response_time`.
3. Confirme a versão esperada e encontrada, latências e timestamp.
4. Consulte logs estruturados com o prefixo `BancoDeSolucoes` e os logs do PostgREST sem copiar credenciais.

## Migrations e rollback

Migrations futuras devem ser incrementais e idempotentes: use `CREATE TABLE IF NOT EXISTS`, `INSERT ... ON CONFLICT` e `CREATE OR REPLACE FUNCTION`. Não apague nem edite uma migration já aplicada e não use SQL destrutivo para corrigir um deploy.

Em caso de falha, reverta primeiro o frontend. Para o banco, crie uma migration compensatória idempotente, registre uma nova versão em `app_schema_version`, aplique-a e repita toda a validação. O deploy deve permanecer bloqueado enquanto `health.ok` não for `true`.
