# Sprint 55 — auditoria final e consolidação da versão 1.0

## Versão e revisão auditadas

- Versão pública: `1.0.0`.
- SHA auditado como ponto de partida: `8bda3efbbaf1af56629ec8ae39f9c88827f31d06` (`main` após o hotfix do smoke do mapa).
- A revisão candidata final é o SHA do commit desta Sprint 55, a ser registrado no PR e no run do checkout. O SHA não pode ser gravado dentro do próprio commit sem tornar o registro autorreferente e inválido.
- Esta sprint não inclui migrations, alteração de secrets ou funcionalidade de grande porte. A única correção de produto fecha a lacuna de favicon/ícone do manifest.

## Resultado da auditoria pública

A matriz local determinística cobre desktop Chromium e viewport móvel de 320 × 720 px. Home, busca, catálogos, mapa, detalhe, contato, Privacidade, Termos, LGPD e 404 passam pelos mesmos limites de layout, tratamento de erro de rota e console. Os testes exercitam navegação por teclado, skip link, labels acessíveis, estados de carregamento, vazio, sucesso e erro. O CSS global mantém foco `:focus-visible`; a revisão visual não encontrou texto informativo dependente apenas de cor.

O HTML e os contratos client-side possuem título, descrição, canonical raiz, Open Graph e Twitter Card. `robots.txt` permite a raiz e referencia o sitemap; por usar HashRouter, o sitemap publica corretamente apenas a URL HTTP raiz, nunca fragments ou rotas privadas. O manifest possui nome, cores, escopo, start URL e ícone existente. Links internos críticos são navegados pelo E2E e assets essenciais são verificados pelo smoke.

## Checklist de go-live

- [ ] Confirmar que o checkout do run aponta para o SHA final do PR aprovado.
- [ ] Executar `npm ci`, testes cumulativos/Sprint 55, build, bundle budget, E2E nos dois viewports, auditoria de segurança e `git diff --check`.
- [ ] Revisar o diff e confirmar: nenhuma migration, nenhum secret e nenhum gate removido.
- [ ] Executar **Production Preflight** manual no SHA final; anexar a URL do run e não prosseguir se qualquer etapa falhar.
- [ ] Conferir Pages, CNAME, HTTPS, canonical, favicon, manifest, robots e sitemap.
- [ ] Após merge aprovado por humano, conferir `verify → e2e → migrate-and-health → deploy → production-smoke` e registrar a URL do run.
- [ ] Conferir o **Production Monitor** seguinte ou dispará-lo manualmente, registrando a URL do run.
- [ ] Atualizar o manifesto 1.0 com SHA publicado, data UTC e links das evidências.

## Checklist de rollback

- [ ] Declarar incidente, pausar merges e preservar logs, traces, screenshots, SHA e janela temporal.
- [ ] Identificar o último SHA comprovadamente saudável; criar branch e `git revert <sha-instável>` sem reescrever `main`.
- [ ] Se houver banco envolvido, nunca apagar/reverter migration aplicada: criar migration compensatória revisada.
- [ ] Rodar todos os gates e Production Preflight no revert; abrir PR normal e obter aprovação.
- [ ] Depois da publicação, validar domínio/HTTPS, rotas públicas, console, assets e smoke somente leitura.
- [ ] Registrar causa raiz, impacto, revisão restaurada, links dos runs e ações preventivas.

## Investigação de falhas em produção

1. Classifique: disponibilidade/Pages, DNS/TLS, asset, JavaScript, Supabase/leitura, SEO/legal ou violação da barreira de escrita.
2. Abra o run correspondente e confirme SHA/evento. Baixe o artifact de falha e use `npx playwright show-trace test-results/**/trace.zip` ou `npx playwright show-report playwright-report`.
3. Compare status HTTP, URL efetiva, `pageerror`, console, request bloqueado e primeiro contrato que falhou. Nunca adicione exceção genérica ou retry funcional para ocultar a causa.
4. Reproduza localmente com fixtures. Não aponte testes mutáveis para produção. Para incidente real, preserve evidência antes do rollback.
5. Corrija na menor camada responsável e repita todos os gates. Ampliação da allowlist de RPC exige revisão SQL documentada de toda a cadeia chamada.

## Inventário de workflows

| Workflow/job | Disparo | Efeito | Condição de segurança |
|---|---|---|---|
| `Verify, migrate and deploy / verify` | PR e push em `main` | testes/build, sem publicação | qualquer comando não-zero bloqueia a cadeia |
| `Critical browser flows` | após `verify` | E2E local | target mutável limitado a loopback |
| `Production Preflight` | manual | dry-run, sem deploy | secrets obrigatórios e baseline falham fechados |
| `migrate-and-health` / `deploy` | somente push em `main` | banco/função e Pages | depende de verify/E2E; secrets e baseline obrigatórios |
| `Read-only production smoke` | após deploy | leitura pública | mutações abortadas antes da rede |
| `Daily production health monitor` | 11:00 UTC ou manual | mesmo smoke somente leitura | sem secrets/deploy; falha preserva diagnóstico |

## Limitações do ambiente

A execução local valida código, build e contratos, mas não equivale a executar GitHub Actions, acessar environments/secrets, publicar, consultar o estado do Supabase vinculado ou provar o estado futuro de produção. Portanto, esta auditoria não declara Production Preflight, deploy, smoke pós-deploy ou Production Monitor verdes sem o link de cada execução. Os links históricos da versão publicada permanecem no manifesto 1.0; novos resultados devem ser anexados ao PR e ao manifesto somente depois de existirem.
