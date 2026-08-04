# Sprint 50 — Release Candidate e pós-deploy

## Arquitetura e fluxo operacional

O único fluxo que publica é um `push` em `main`: **verify → Critical browser flows
(E2E local) → migrate-and-health → deploy → Read-only production smoke**. `verify`
instala dependências, valida tipos/testes, compila e aplica o orçamento. O E2E local
usa build `e2e`, fixtures e APIs fictícias. O gate de migrations preserva baseline,
lista do histórico, migrations pendentes e `db push`; só então envia o artifact ao
GitHub Pages. O smoke roda após sucesso do deploy, sem secrets, escrita ou rollback.
Pull requests executam apenas validação e nunca chegam aos jobs condicionados a push
em `main`.

## Production Preflight

Em **Actions → Verify, migrate and deploy → Run workflow**, informe a branch ou SHA
final em `ref`, deixe diagnósticos desmarcados e execute. O ambiente
`production-preflight` precisa dos secrets administrativos documentados em
[`deployment-preflight.md`](deployment-preflight.md). O preflight faz build, testes,
baseline, lista e `db push --dry-run`; não envia artifact nem executa deploy. Registre
o link do run e confirme que o checkout mostra o SHA esperado.

## Como interpretar falhas

- **verify/orçamento:** corrija typecheck, teste ou o asset nomeado. O baseline desta
  sprint foi `index` 261.016 B, `client` 205.331 B, `leaflet` 148.814 B,
  `I18nProvider` 140.728 B e CSS principal 35.205 B; limites têm cerca de 10% de
  folga. Aumente `config/bundle-budget.json` somente com justificativa revisada.
- **E2E local:** falha é anterior ao deploy e usa somente `127.0.0.1`, fixtures e
  URLs fictícias. Abra o relatório e identifique projeto desktop ou 320 px. Uma URL
  não local encerra a configuração em modo fail-closed.
- **propagação:** o smoke aceita cinco tentativas (5/10/20/30/45 s) apenas até Pages
  retornar HTTP 200, HTML e referência de asset. Esgotamento indica Pages/domínio.
- **falha funcional do smoke:** não é repetida. Heading, navegação, asset, overflow,
  `pageerror` ou console inesperado deixam o workflow vermelho depois do deploy.

## Traces e screenshots

Artefatos só existem em falha. No run, abra **Artifacts**, baixe
`playwright-failure-<run>` ou `production-smoke-failure-<run>`, descompacte e rode
`npx playwright show-trace test-results/**/trace.zip`. Para o HTML, execute
`npx playwright show-report <diretório-do-relatório>`. Screenshots ficam no diretório
do teste que falhou.

## GitHub Pages, domínio e revisão publicada

Em **Settings → Pages**, confirme a origem GitHub Actions, domínio
`www.bancodesolucoes.com.br` e HTTPS obrigatório. Confira DNS/CNAME, depois
`curl -I https://www.bancodesolucoes.com.br/`. O `public/CNAME` deve coincidir. Para
identificar a revisão, abra o run mais recente de `main`, confira o SHA do checkout e
o environment `github-pages`; o deployment vinculado ao job `deploy` é a evidência
do commit publicado. Compare também o SHA do artifact `pages-dist` no mesmo run.

## Rollback manual

Não há rollback automático. Declare incidente quando produção não carregar, houver
asset essencial 4xx/5xx, erro JS que impeça fluxo público, domínio/HTTPS inválido,
regressão legal ou risco de escrita/exposição. Pause novos merges, preserve o run e
os traces, identifique o último SHA estável e crie uma branch a partir de `main`.
Reverta com `git revert <sha-instatável>` (nunca reescreva `main`), revise a PR e
execute todos os gates e o Production Preflight. Após aprovação, faça merge pelo
processo normal; o push publicará o revert. Para mudança de banco, não reverta
migration aplicada: use migration compensatória revisada conforme o runbook de
migrations.

### Checklist após rollback

- workflow completo verde, inclusive production smoke;
- deployment aponta para o SHA do revert e domínio/HTTPS estão corretos;
- home, busca, Privacidade, Termos, LGPD, Fale Conosco sem submissão e 404 funcionam;
- nenhum `pageerror`, console inesperado, asset 404 ou overflow em desktop/320 px;
- baseline/lista de migrations e health gates permanecem verdes;
- incidente registra causa, janela, evidências, revisão estável e ações seguintes.
