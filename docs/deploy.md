# CI, deploy e diagnóstico

## Estado atual

A produção usa GitHub Actions e GitHub Pages no frontend e Supabase no backend.
O fluxo da `main` executa verificação, E2E, migrations/health, deploy e smoke somente leitura.

## Configuração

Este documento público descreve apenas categorias funcionais de configuração.
Detalhes técnicos de autenticação, identificação de ambiente e integração externa
permanecem nos arquivos operacionais apropriados e não são reproduzidos aqui.

## Pull requests

PRs executam validações estáticas, testes, auditorias, build e E2E. Alterações SQL são
detectadas e, quando aplicável, validadas contra PostgreSQL isolado. PR não aplica
migration em produção nem publica o site.

Mudanças em migrations, workflow, baseline ou configuração de banco exigem Production
Preflight no SHA final antes do merge.

## Push para main

Depois dos gates verdes, `migrate-and-health` restaura o build, valida a configuração
necessária, vincula o ambiente configurado, verifica baseline e migrations, executa
`supabase db push`, publica a Edge Function e prepara o artifact. Depois, o deploy
publica no GitHub Pages e o smoke valida a revisão em modo somente leitura.

## Baseline e histórico

Reconciliações históricas permanecem no Git para auditoria, mas não são instruções
rotineiras. Nunca edite migration aplicada ou altere histórico sem validação.
Para recuperação excepcional, consulte
[pipeline-migration-recovery.md](pipeline-migration-recovery.md).

## Validação pós-deploy

Confirme workflow verde no SHA esperado, migrations/health concluído, deploy concluído,
smoke somente leitura concluído e domínio canônico respondendo por HTTPS.

## Rollback

Frontend: reverta por PR para um SHA conhecido e execute novamente os gates.
Banco: use migration compensatória revisada; migration aplicada não é apagada nem reescrita.
