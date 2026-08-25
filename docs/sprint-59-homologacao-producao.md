# Sprint 59 — Homologação funcional completa em produção

## Escopo, método e baseline

Homologação de estabilização realizada sobre a revisão que contém o merge obrigatório `94a4b070a4ded88d790dd84f62f4fa5e2e53e983`. A produção canônica é `https://www.bancodesolucoes.com.br/`. A inspeção em produção é deliberadamente **somente leitura**: o interceptor fail-closed do smoke bloqueia `POST`, `PUT`, `PATCH` e `DELETE`, exceto RPCs públicos explicitamente classificados como consultas e respondidos localmente. Nenhum cadastro, contato, comentário, reação, denúncia, contribuição ou ato administrativo real foi enviado.

As evidências combinam: (1) smoke contra o artefato publicado; (2) E2E determinístico contra build local e API simulada; (3) contratos cumulativos, auditoria de segurança, build e orçamento do bundle. “Coberto por E2E” não significa que a operação foi repetida contra dados reais de produção.

### Registro da execução neste ambiente

- A suíte cumulativa até a Sprint 55, os contratos 57–59, typecheck, build, orçamento do bundle e `git diff --check` passaram. O contrato 56 passou após ser atualizado para reconhecer a adição cumulativa do gate 59.
- `npm ci` não concluiu porque o registry respondeu HTTP 403 ao tarball de `@types/leaflet`; a instalação pôde ser restaurada exclusivamente do cache local com `npm install --offline`, sem alterar o lockfile.
- `npm run security:audit:report` e `npm run security:audit` falharam de modo fechado porque o registry retornou um relatório de erro, não um resultado de vulnerabilidades.
- `npm run test:e2e` e `npm run test:production-smoke` não puderam ser executados: o Chromium não existe na imagem e `npx playwright install chromium` recebeu HTTP 403 do CDN. Portanto, os novos cenários de produção estão **pendentes de comprovação dinâmica no CI**; as afirmações abaixo sobre o smoke descrevem o contrato automatizado e a evidência publicada anterior, não uma execução local bem-sucedida nesta sprint.

Legenda: **Aprovado** = evidência executável suficiente; **Aprovado localmente** = fluxo validado sem escrita real; **Limitado** = depende de credencial ou integração externa indisponível e não foi executado em produção.

## Visitante anônimo

| Cenário | Resultado | Evidência |
|---|---|---|
| Inicial, pesquisa, catálogos de problemas/soluções e mapa | Aprovado | `npm run test:production-smoke` visita as rotas, valida heading, HTTPS, console e overflow em desktop/320 px; `npm run test:e2e` cobre estados vazio, sucesso e falha. |
| Detalhes de problema/solução e perfis públicos | Aprovado localmente | `e2e/anonymous.spec.ts` e `e2e/public-profile.spec.ts` exercitam dados determinísticos. A produção pode estar vazia, portanto IDs reais não são pressupostos. |
| PT-BR/EN-US | Aprovado | Smoke troca o idioma, valida `lang`, texto traduzido e persistência após reload; testes locais verificam paridade dos catálogos. |
| Privacidade, Termos e LGPD | Aprovado | Smoke abre diretamente cada hash e valida seus títulos; contrato legal cumulativo da Sprint 38. |
| Fale Conosco | Aprovado localmente | Produção abre a página sem enviar dados. Validação, consentimento, sucesso simulado e rate limit estão em `e2e/anonymous.spec.ts` e Sprint 37. |
| Cadastro e login | Aprovado localmente | Telas e validações cobertas pelos E2E; nenhuma conta descartável foi criada em produção. |
| Rotas protegidas e continuidade | Aprovado | Smoke confirma que o formulário protegido não é montado, que `/admin` redireciona e que o hash pretendido é preservado em `sessionStorage`. |

## Membro autenticado

| Cenário | Resultado | Evidência |
|---|---|---|
| Login, logout, perfil próprio, edição e privacidade | Aprovado localmente | `e2e/authenticated.spec.ts` e contratos de autenticação/perfil. Não executado em produção por ausência deliberada de credencial de homologação. |
| Criar problema e solução, obrigatórios, erro recuperável e envio duplicado | Aprovado localmente | `e2e/first-contribution.spec.ts`, `npm run test:sprint58`; valida lock de submissão, valores preservados e feedback acessível. |
| Confirmação e moderação | Aprovado localmente | O E2E confirma mensagem de sucesso compatível com moderação e uma única chamada simulada. |
| Comentários, reações e notificações | Aprovado localmente | `e2e/authenticated.spec.ts` e contratos cumulativos das Sprints 44–46. |
| Ausência de controles administrativos | Aprovado localmente | `e2e/authorization.spec.ts` e `e2e/first-contribution.spec.ts`. |

## Administrador

| Cenário | Resultado | Evidência |
|---|---|---|
| Painel e controles autorizados | Aprovado localmente | E2E de autorização e contratos das Sprints 28, 42 e 43. Não executado em produção: nenhuma credencial administrativa foi fornecida e criar/elevá-la violaria o escopo. |
| Moderação e denúncias | Aprovado localmente | Repositórios simulados e contratos das Sprints 42–43, sem mutação de produção. |
| Restrição para visitante e membro | Aprovado | Visitante é redirecionado no smoke; separação membro/admin é coberta pelo E2E local e RLS existente. |
| Fluxo comum de contribuição | Aprovado localmente | Jornada Sprint 58 permanece no gate bloqueante. |

## Experiência e acessibilidade

| Cenário | Resultado | Evidência |
|---|---|---|
| 320 px, tablet e desktop; overflow | Aprovado | Playwright usa projetos 320 px e desktop; layouts responsivos usam breakpoints de tablet; helper mede `scrollWidth` em toda rota do smoke. |
| Teclado, foco visível e skip link | Aprovado | Smoke focaliza/aciona o skip link e confirma foco em `main`; E2E local percorre controles por teclado. |
| Labels, erros e contraste | Aprovado localmente | E2E verifica labels/alertas; cores e anéis de foco são contratos do design existente. Contraste não recebeu alegação de auditoria instrumental externa. |
| Console e estados loading/vazio/sucesso/falha | Aprovado localmente | Smoke falha em `console.error`/`pageerror`; E2E simula os quatro estados sem depender da produção. |
| Textos completos nos idiomas | Aprovado | Smoke valida alternância real; `npm run test:sprint36` valida paridade de chaves. |

## Produção e integrações

| Cenário | Resultado | Evidência |
|---|---|---|
| Domínio, HTTPS, assets e Supabase health | Aprovado | Smoke exige origem canônica HTTPS e assets 2xx; jobs `migrate-and-health` e `production-preflight` continuam fail-closed. |
| Migrations sincronizadas | Limitado localmente | Gate executa `supabase db push --dry-run` com secrets do CI. Não foi acessado banco remoto neste ambiente; `npm run test:pending-migrations` valida segurança estática. |
| Fale Conosco, Resend e remetente | Limitado | Edge Function, allowlist de secrets e configuração são cobertos pela Sprint 37/CI; entrega de e-mail real não foi disparada para evitar escrita e spam. |
| Monitoramento e diagnósticos | Aprovado por contrato | Workflow `production-monitor.yml` executa smoke read-only; saúde e diagnósticos existentes não foram alterados. |
| HashRouter após reload/acesso direto | Aprovado | Smoke acessa hashes diretamente e recarrega após troca de idioma. |
| SEO, sitemap, robots e metadados | Aprovado | Smoke valida canonical/version, `robots.txt`, `sitemap.xml` e ausência de rotas privadas. |
| Actions, deploy e smoke | Aprovado por contrato | Sprint 59 entra no job bloqueante sem retirar gates; deploy/smoke continuam dependentes de verify, preflight e health. O deploy desta branch só será comprovado pela execução da PR. |

## Defeitos encontrados

### Lacuna H59-01 — autenticação, acessibilidade e i18n não estavam no smoke publicado

- **Reprodução:** revisar `e2e/production-smoke.spec.ts` na baseline mostrava apenas carregamento, SEO e rotas públicas; não havia asserção de skip link, persistência EN-US ou preservação do destino protegido.
- **Causa raiz:** o smoke anterior era intencionalmente mínimo para release, enquanto essas jornadas existiam apenas na suíte local simulada.
- **Correção aplicada:** ampliação mínima do smoke read-only com foco/skip link, troca e reload de idioma, bloqueio de conteúdo protegido e `return-to` seguro.
- **Regressão:** `scripts/sprint59ProductionAcceptance.test.ts` exige os cenários e o bloqueio de mutações; `npm run test:production-smoke` os executa no domínio canônico.
- **Impactos verificados:** nenhuma alteração no código de autenticação, autorização, banco, RLS ou deploy; apenas observação do navegador e CI/contrato.

Nenhum defeito funcional comprovado no código da aplicação exigiu correção. Não foram feitas mudanças cosméticas ou arquiteturais.

## Confirmações de segurança e mudança

- Migrations criadas ou alteradas: **não**.
- Dependências modificadas: **não**; `package-lock.json` permanece inalterado.
- Secrets ou arquivos de ambiente modificados: **não**.
- RLS e permissões alteradas: **não**.
- Registros de teste em produção: **nenhum criado**, portanto não há remoção pendente.
- Entradas e links externos: contratos cumulativos preservam sanitização e `noopener noreferrer`; nenhuma nova entrada foi adicionada.
- Impacto no deploy: um teste de contrato adicional no job `verify`; nenhum artefato, migration, variável ou procedimento de deploy mudou. O smoke ampliado permanece read-only e fail-closed.

## Riscos residuais

1. Jornadas autenticadas de membro e administrador, envio do contato/Resend, moderação e notificações **não foram executados em produção** por falta de contas de homologação e pela proibição de escrita; a evidência é local/simulada e contratual.
2. Sincronismo remoto de migrations e saúde completa do Supabase dependem dos secrets protegidos e dos jobs GitHub; não podem ser afirmados a partir de uma execução local sem credenciais.
3. Conteúdo variável pode deixar produção sem detalhe/perfil público disponível; esses cenários permanecem cobertos deterministicamente no E2E local.
4. Contraste foi revisado pelos padrões existentes, mas não houve medição com ferramenta externa nesta sprint.
5. Estado do deploy e monitoramento posteriores ao SHA final só pode ser confirmado nas execuções da PR/main.

## Decisão final de homologação

**APROVADO COM RESSALVAS para seguir à sprint de encerramento**, condicionado aos gates obrigatórios verdes na PR e ao preflight/smoke do deploy. A superfície pública foi homologada em produção sem mutação; jornadas que exigem identidade ou escrita estão aprovadas pelo ambiente determinístico, não por operação real. Os riscos acima são explícitos e não justificam ampliar permissões, criar dados ou alterar arquitetura nesta sprint.
