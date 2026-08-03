# Sprint 49 — testes E2E e estabilização

## Registro da análise inicial (antes da implementação)

Base auditada: `main` local no merge `44a6cdd913a331b4677f7cb7a6f06cdd931eadcf`. A sincronização remota foi tentada, mas o proxy deste ambiente devolveu HTTP 403; a referência local corresponde exatamente ao SHA obrigatório. A implementação ocorre em `sprint-49-e2e-stabilization`, sem merge.

A aplicação é uma SPA React/Vite com roteamento próprio por hash (`src/routing/hashRouter.ts`), contextos de autenticação, consentimento e persistência, e integrações Supabase concentradas em adapters/repositórios. Os testes existentes usam o runner nativo do Node e verificações TypeScript/contratos; não havia runner de navegador. O workflow único preserva os gates `verify`, migrações locais, `production-preflight`, `migrate-and-health` e `deploy`.

Fluxos críticos identificados:

- anônimo: início, menu/rodapé, busca, documentos legais, contato, perfil público e rotas inválidas;
- membro: restauração de sessão, consentimento vigente, MFA, conta/perfil, privacidade do perfil e logout;
- autorização: membro comum não pode acessar nenhuma rota administrativa;
- transversal: idiomas PT-BR/en-US, teclado, foco, semântica, responsividade e falhas assíncronas compreensíveis.

### Decisão arquitetural

Playwright é a escolha mais compatível: suporta Chromium real/headless, projetos de viewport, `webServer` integrado ao preview Vite (com health wait e encerramento garantido), interceptação determinística na borda HTTP e traces/relatórios retidos apenas em falhas. A suíte usará build e preview locais, URL/anon key exclusivamente fictícios e bloqueará por padrão tráfego externo. Fixtures de rede e sessão existirão apenas sob `e2e/`; nenhum gate, RLS, `AuthContext` ou migration será relaxado.

O job E2E será dependente de `verify`, separado do deploy, com Node e browser fixados, timeout explícito e upload condicional de artefatos de falha. O `production-preflight` permanecerá independente e sem deployment.

> As seções de matriz, operação, limitações e diagnóstico serão atualizadas após a implementação e execução da suíte.

## Arquitetura implementada

`playwright.config.ts` define dois projetos Chromium (desktop e 320 px), build Vite em modo `e2e`, preview estrito em `127.0.0.1:4173`, health wait e encerramento do processo pelo `webServer`. A fixture `e2e/fixtures.ts` intercepta toda a pseudo-API local e bloqueia tráfego externo. Console errors e exceções de página fazem cada cenário falhar. Não há delays fixos: as esperas são por URL, role, nome acessível ou estado anunciado.

O harness de autenticação é carregado dinamicamente somente quando `VITE_E2E_FIXTURES=true` no modo E2E; builds normais preservam os providers e gates reais. O modo E2E usa somente `http://127.0.0.1:4173/__e2e_supabase` e uma chave pública explicitamente fictícia. Respostas de busca, contato e perfil são fixtures em memória; nenhum request alcança Supabase, serviço de e-mail ou produção. Não foram alterados AuthContext, RLS, migrations ou gates legais.

## Matriz de fluxos

| Área | Cobertura automatizada |
| --- | --- |
| Anônimo | início; menu e rodapé; busca vazia/sucesso/erro; privacidade/termos/LGPD; contato e validação/consentimento/sucesso/429; perfil público; indisponibilidade uniforme; atividade; link seguro; 404; percent-encoding inválido; console |
| Autorização | restauração anônima; redirecionamento de perfil e admin; ausência de acesso administrativo |
| Autenticado | sessão simulada; consentimento obrigatório; MFA; edição do perfil; ativação/desativação pública; navegação do proprietário privado; logout |
| Administrativo | membro recebe 403; administrador autorizado abre o dashboard |
| Acessibilidade/i18n | headings, labels, roles/status/aria-live, teclado/foco, links acionáveis e PT-BR/en-US |
| Responsividade | todos os cenários em desktop e Chromium com viewport de 320 x 720; verificação explícita de overflow no fluxo transversal |

## Dados simulados e integrações

A fixture contém somente pessoas e conteúdo sintéticos (`Ana Silva`, `Maria Teste`, `Horta comunitária`, domínios `example.org`/`example.test`). RPCs de busca e perfil público e a Edge Function de contato são interceptadas. Um bloqueio final aborta qualquer HTTP(S) fora do preview local. A suíte nunca lê secrets e nunca envia e-mail.

## Comandos locais

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:e2e
# cenário isolado ou inspeção
npx playwright test e2e/anonymous.spec.ts --project=desktop-chromium
npx playwright show-report
```

`npm run test:e2e` executa o build automaticamente antes de iniciar o preview. `npm run test:previous` agrega todos os scripts de regressão disponíveis das sprints anteriores.

## CI e deploy

O job `e2e` roda somente depois de `verify`, tem timeout de 15 minutos, Node 24.4.1, Playwright 1.54.2 e Chromium correspondente. Relatório, screenshot e trace são produzidos/recolhidos somente em falha e retidos por sete dias. O job não usa environments/secrets e não faz deploy. Em push para `main`, `migrate-and-health` depende de `verify` e `e2e`, tornando a suíte um gate de deploy. O dispatch independente `Production Preflight` permanece sem deploy e não depende do E2E.

## Diagnóstico de falhas e traces

1. Baixe `playwright-failure-<run id>` no resumo da execução do GitHub Actions.
2. Leia o reporter HTML com `npx playwright show-report <diretório>`.
3. Abra um trace com `npx playwright show-trace test-results/.../trace.zip` e confira timeline, DOM, console e requests.
4. Reproduza o teste e projeto indicados pelo reporter; use `--headed` apenas para investigação local.
5. Uma tentativa adicional existe somente na CI para separar eventual instabilidade de uma regressão; falhas não são ocultadas.

## Limitações conhecidas

A automação deliberadamente não prova RLS ou entrega de e-mail reais; esses itens pertencem aos testes SQL/Edge Function e ao preflight. Sessão, consentimento, MFA, perfil e RBAC são exercitados no navegador pelo harness exclusivo do modo E2E; MFA físico e persistência real permanecem no checklist manual porque usar um projeto real violaria zero writes/secrets. Não há snapshot visual de página inteira.

## Checklist manual complementar

- [ ] Conta de homologação: sessão restaurada e consentimento atual aceito.
- [ ] TOTP de homologação: desafio correto, código inválido e logout.
- [ ] Editar perfil próprio e alternar perfil público/privado; confirmar visualização pelo proprietário.
- [ ] Confirmar 403 para membro e dashboard para admin em homologação isolada.
- [ ] Percorrer foco e zoom de 200% em navegador assistivo.
- [ ] Conferir entrega de contato apenas no ambiente de homologação com caixa de e-mail sink.
- [ ] Executar Production Preflight via `workflow_dispatch` com a branch/SHA da PR e `run_service_diagnostics=false`; confirmar que nenhum deploy foi iniciado.
