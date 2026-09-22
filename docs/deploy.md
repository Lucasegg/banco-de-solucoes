# CI, deploy e diagnóstico

## Estado atual

A produção usa GitHub Actions + GitHub Pages para o frontend e Supabase para backend,
banco, Auth, Realtime, Storage e Edge Functions. O fluxo normal de `main` executa
verify, E2E, migrations/health, deploy e smoke somente leitura.

Este documento não contém valores reais de credenciais. Somente nomes de variáveis e
procedimentos seguros podem ser versionados.

## Categorias de configuração

### Supabase CLI — migrations

Os jobs administrativos usam secrets protegidos do GitHub Actions para autenticar a CLI
e vincular o projeto. Os valores nunca devem aparecer em Markdown, logs, exemplos,
screenshots ou commits.

Nomes usados pelo pipeline:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

### Diagnóstico server-side

Nomes usados apenas em jobs/serviços autorizados:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Essas credenciais nunca recebem prefixo `VITE_` e nunca são entregues ao browser.

### Build público

Somente a configuração pública prevista pelo Vite pode ser incorporada ao frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Pull requests

PRs executam validações estáticas, testes, auditorias, build e E2E. Alterações SQL são
detectadas e, quando aplicável, validadas contra PostgreSQL isolado. PR não aplica
migration em produção nem publica o site.

Mudanças em migrations, workflow, baseline ou configuração de banco exigem Production
Preflight no SHA final antes do merge.

## Push para `main`

Depois de `verify` e E2E verdes, o job `migrate-and-health`:

1. restaura o build verificado;
2. valida presença das configurações obrigatórias sem imprimir valores;
3. vincula o projeto Supabase configurado;
4. verifica baseline e lista de migrations;
5. valida migrations pendentes;
6. executa `supabase db push`;
7. publica a Edge Function prevista;
8. prepara o artifact do GitHub Pages.

Depois, `deploy` publica o artifact e `production-smoke` valida o domínio em modo
somente leitura.

## Baseline e histórico

O projeto teve reconciliações históricas antes da automação completa. Esses eventos
continuam preservados no histórico do Git e em documentos específicos de recuperação,
mas não são instruções rotineiras de operação.

Para operação normal:

- nunca edite migration já aplicada;
- nunca marque migration como aplicada sem prova dos objetos;
- nunca use `migration repair` como tentativa de “fazer passar”;
- nunca use flags de inclusão ampla sem um plano aprovado;
- trate divergência de histórico como incidente de banco.

Quando uma recuperação excepcional for necessária, consulte
[pipeline-migration-recovery.md](pipeline-migration-recovery.md) e valide primeiro o
estado remoto atual. Não execute procedimentos históricos às cegas.

## Validação pós-deploy

Confirme:

- workflow de `main` verde no SHA esperado;
- `migrate-and-health` concluído;
- deploy do Pages concluído;
- smoke somente leitura concluído;
- domínio canônico respondendo por HTTPS.

A tela administrativa de diagnóstico, quando usada, deve ser acessada apenas por conta
autorizada e nunca deve expor credenciais em captura, issue ou log público.

## Rollback

Frontend: reverta por PR para um SHA conhecido e execute novamente os gates.

Banco: migration aplicada não é apagada nem reescrita. Use migration compensatória
revisada e validada.

Em incidente, preserve evidências e evite mudanças destrutivas improvisadas.
