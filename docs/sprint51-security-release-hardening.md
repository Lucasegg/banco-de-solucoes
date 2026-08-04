# Sprint 51 — Segurança de dependências, supply chain e preparação da versão final

## Resultado do audit inicial

A validação local em 2026-08-04 tentou executar `npm ci`, `npm audit --json`, `npm audit --omit=dev --json` e `npm outdated`. O ambiente retornou HTTP 403 para registry.npmjs.org e GitHub via proxy corporativo, portanto os relatórios JSON completos não puderam ser obtidos localmente. Antes desta sprint, o pipeline informava 3 vulnerabilidades npm: 1 moderada e 2 altas.

Como o registry não respondeu, nenhuma dependência foi atualizada arbitrariamente, nenhum major foi trocado e `npm audit fix --force` não foi executado. A revisão residual deve ser refeita em CI com acesso ao registry.

| Vulnerabilidade | Escopo | Severidade | Caminho | Impacto no Banco de Soluções | Correção | Estratégia | Risco de quebra |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pendente de confirmação pelo registry | A classificar entre runtime e dev | 1 moderada e 2 altas informadas pelo CI anterior | Pendente do JSON do `npm audit` | Pendente: o novo gate bloqueia altas/críticas de produção; dev/build devem ser documentadas como exceção temporária se não houver correção compatível | Pendente do campo `fixAvailable` | Atualizar somente patches/minors compatíveis comprovados por testes | A classificar por pacote |

## Correções realizadas

- Criado `npm run security:audit`, baseado em `npm audit --omit=dev --json`, para bloquear vulnerabilidades altas ou críticas aplicáveis à produção sem parsing frágil de texto.
- Adicionado `npm run test:sprint51` com contratos de workflow, Dependabot, SBOM, Node e política de segurança.
- Criada configuração semanal do Dependabot para npm e GitHub Actions, com limite de PRs abertas, labels e grupos apenas para patch/minor.
- Padronizado Node em `.nvmrc` com Node 24.15.0 e uso de `node-version-file` nos jobs que instalam Node.
- Adicionado SBOM gerado pelo npm a partir do lockfile, validado como JSON e publicado como artifact somente em push para `main`, com retenção limitada.
- Criada política `SECURITY.md`.

## Riscos residuais e exceções temporárias

A exceção temporária é a ausência de audit completo neste ambiente por HTTP 403 do registry. Responsável: mantenedor da release final. Risco: uma vulnerabilidade alta de produção pode permanecer até o CI com rede válida executar o novo gate. Mitigação: o gate falha em erro de rede, não retorna falso verde, e bloqueia altas/críticas de produção. Prazo de revisão: próxima execução de CI no SHA final da PR e, no máximo, antes da aprovação da versão final.

## Configuração do Dependabot

O Dependabot cobre `npm` e `github-actions`, roda semanalmente contra `main`, limita PRs abertas e usa labels `dependencies`, `security`, `npm` e `github-actions`. Os grupos conservadores incluem somente `patch` e `minor`; majors permanecem separados para revisão manual. Merge automático não foi habilitado.

## Pinagem das Actions

As Actions foram revisadas e permanecem em majors oficiais atuais (`actions/checkout@v5`, `actions/setup-node@v5`, artifacts v4, Pages v3/v4/v5 e `denoland/setup-deno@v2`). A pinagem por SHA completo deve ser aplicada quando o ambiente permitir resolver os SHAs oficiais dos tags sem risco de apontar para commits inválidos. Não foi usado `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION`.

## Versão Node

A fonte versionada é `.nvmrc`, definida como Node 24.15.0. O workflow usa `node-version-file: .nvmrc` em verify, E2E, Production Preflight, diagnostics, migrations e production smoke. O lockfile permanece `lockfileVersion: 3`, compatível com npm moderno do Node 24.

## Geração do SBOM

`npm run sbom:generate` executa `npm sbom --json`, grava `sbom.cyclonedx.json` e valida JSON com Node. O arquivo gerado não é versionado porque pode conter metadados de build desnecessários. O artifact `sprint51-sbom-${{ github.sha }}` é publicado somente em push para `main` e retido por 14 dias.

## Operação do novo gate

O gate roda no job `verify` antes do build. Ele chama `npm audit --omit=dev --json` com timeout de 120 segundos, classifica dependências de produção, imprime resumo acionável e falha em vulnerabilidades altas/críticas. Falhas de rede, JSON inválido ou timeout viram falha explícita.

## Rollback

Se o gate bloquear indevidamente, reverta apenas os arquivos de Sprint 51 (`scripts/securityAudit.ts`, `scripts/sprint51SecurityHardening.test.ts`, `.github/dependabot.yml`, `.nvmrc`, `SECURITY.md`, documentação e alterações de workflow/package`). Não altere migrations, não execute deploy manual e repita `npm ci`, `npm test`, `npm run test:previous`, `npm run test:sprint50`, `npm run build`, `npm run check:bundle-budget` e E2E antes de nova revisão.

## Checklist da versão final

- [ ] `npm ci` verde em ambiente com registry acessível.
- [ ] `npm audit --json` e `npm audit --omit=dev --json` anexados à PR.
- [ ] `npm run security:audit` verde ou bloqueio documentado com exceção temporária explícita.
- [ ] `npm test`, `npm run test:sprint51`, `npm run test:previous`, `npm run test:sprint50`, `npm run build`, bundle budget e E2E verdes.
- [ ] CI completo verde.
- [ ] Production Preflight executado no SHA final.
- [ ] Production smoke preservado após deploy por pipeline, sem deploy manual.
- [ ] Riscos residuais revisados antes do merge manual.
