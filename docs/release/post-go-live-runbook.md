# Runbook curto de manutenção pós-go-live

Referência operacional da versão `1.0.0`. Registre sempre horário UTC, SHA,
impacto e links das execuções; nunca copie secrets para tickets ou logs.

## Rotina diária

1. Em **Actions → Daily production health monitor**, confira a execução das
   11:00 UTC e confirme conclusão, SHA/ref e domínio testado. Ausência de run é
   incidente operacional; não equivale a resultado verde.
2. Se falhar, preserve o artifact `production-monitor-failure-<run-id>` e
   compare com o último run verde. Não dispare formulário de contato nem faça
   outra mutação para “testar”.
3. Verifique raiz/HTTPS, assets, busca, catálogos, mapa, contato sem submissão,
   páginas legais, 404, `robots.txt`, `sitemap.xml`, canonical e versão.
4. Registre o resultado no canal/ticket operacional. Só declare verde citando a
   URL de uma execução concluída.

## Investigação de falhas

1. Classifique o incidente: DNS/TLS, GitHub Pages/deploy, asset/JavaScript,
   Supabase/Auth/Storage/RPC, Resend/contato, conteúdo legal ou barreira de
   escrita.
2. Confirme SHA e evento do run. Abra relatório/trace com
   `npx playwright show-report playwright-report` ou
   `npx playwright show-trace <trace.zip>` e identifique o primeiro contrato
   quebrado, sem retries ou allowlists mais amplas.
3. Consulte status e logs do provedor afetado sem expor credenciais. Reproduza
   com fixtures locais; preserve evidências antes de corrigir ou reverter.
4. Corrija a menor camada responsável em PR normal e reexecute gates,
   Production Preflight e validação pós-deploy.

## Rollback

Pause merges para indisponibilidade persistente, asset essencial quebrado, erro
JavaScript bloqueante, risco de escrita/exposição ou violação legal relevante.
Escolha o último SHA comprovadamente saudável e crie PR de
`git revert <sha-instavel>`; não force-push nem reescreva `main`. O revert passa
por CI e Preflight e, depois do deploy, por smoke somente leitura. Preserve causa,
impacto, SHA restaurado e links. Não há rollback automático.

## Dependências e vulnerabilidades

- Atualize uma dependência por PR pequena, justificada e com lockfile; não use
  intervalos mais permissivos para contornar alertas. Leia changelog/advisory e
  avalie runtime, bundle, API e compatibilidade antes de atualizar.
- Execute `npm ci`, testes cumulativos, auditorias de segurança, build, bundle
  budget e E2E. Mudança major ou de runtime exige plano próprio e rollback.
- Vulnerabilidade explorável ou crítica: restrinja exposição se necessário,
  preserve o advisory, priorize correção mínima e rode os gates fail-closed.
  Não crie allowlist genérica; exceção temporária exige risco, escopo, responsável
  e expiração documentados.

## Banco e migrations compensatórias

Nunca edite, apague ou marque artificialmente como revertida uma migration já
aplicada. Faça backup, escreva migration compensatória aditiva/idempotente,
revise RLS, grants, funções e dados afetados, teste em ambiente seguro e execute
Production Preflight. Só então siga `migrate-and-health → deploy → smoke`. Uma
migration destrutiva requer processo extraordinário fora deste runbook.

## Checklist dos provedores

- **DNS/domínio:** `www` resolve para GitHub Pages, domínio raiz redireciona para
  o oficial, HTTPS/certificado estão válidos e `public/CNAME` continua correto.
- **GitHub Pages:** origem GitHub Actions, deployment no SHA esperado, artifact
  `dist` e domínio customizado/HTTPS sem regressão.
- **Supabase:** projeto correto, Auth/redirects no domínio oficial, RLS/grants,
  Storage, Edge Functions, histórico de migrations e health check. Rotacione
  credenciais somente pelo procedimento administrativo apropriado.
- **Resend:** domínio/remetente verificados, Edge Function configurada e logs sem
  PII desnecessária. Faça teste de envio apenas em ambiente/controlado e com
  autorização; o Production Monitor nunca envia.
- **Domínio público:** confira home e rotas hash críticas, canonical,
  `robots.txt`, `sitemap.xml`, favicon/manifest e ausência de erro crítico no
  console.

Detalhes do monitor permanecem em
[`docs/sprint54-production-monitoring.md`](../sprint54-production-monitoring.md);
o registro definitivo do go-live está no [manifesto](1.0.0-manifest.md).
