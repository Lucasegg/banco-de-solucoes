# Sprint 51 — Segurança de dependências, supply chain e preparação da versão final

## Resultado real do audit no CI

O CI da PR #86 apontou uma vulnerabilidade moderada em `postcss <=8.5.22`, com correção disponível em `8.5.25`. O pacote é dependência direta de desenvolvimento/build no `package.json` e também aparece no caminho transitivo de ferramentas de CSS (`tailwindcss`, `autoprefixer` e plugins PostCSS). O impacto real no Banco de Soluções é limitado ao pipeline de build e processamento de CSS; não há uso runtime do PostCSS no bundle de produção servido ao navegador. Ainda assim, como a ferramenta processa CSS no build, a correção foi aplicada de forma compatível e controlada.

| Pacote | Direta/transitiva | Escopo | Severidade | Caminho | Impacto real | Versão corrigida | Estratégia | Risco de quebra |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `postcss` | direta de dev/build e transitiva via ferramentas CSS | desenvolvimento/build | moderada | `postcss`; `tailwindcss -> postcss`; `autoprefixer -> postcss` | risco restrito ao processamento de CSS no build, sem dependência runtime no app | `8.5.25` | pin compatível em devDependencies e lockfile, sem major e sem `npm audit fix --force` | baixo: patch dentro do major 8 |

## Resultado final do audit

Após a correção para `postcss@8.5.25`, o gate `npm run security:audit` usa `npm audit --omit=dev --json` e bloqueia vulnerabilidades altas ou críticas aplicáveis à produção. Vulnerabilidades restantes esperadas: nenhuma de produção alta/crítica. Vulnerabilidades de desenvolvimento devem permanecer visíveis no `npm audit --json` completo e ser tratadas por Dependabot ou exceção temporária explícita quando não houver correção compatível.

## Correções realizadas

- `scripts/securityAudit.ts` agora é fail-closed: rejeita JSON com `error`, JSON inválido, relatório vazio/incompleto, ausência de `metadata.vulnerabilities`, timeout e falhas de registry sem relatório válido.
- O exit code não zero normal do `npm audit` continua aceito apenas quando há relatório JSON válido de vulnerabilidades.
- `postcss` foi atualizado de `latest`/`8.5.19` para `8.5.25`, sem troca de major.
- Todas as Actions em `.github/workflows/deploy.yml` foram fixadas por SHA completo de 40 caracteres com comentário da versão legível.
- `npm run test:sprint51` cobre os contratos da Sprint 51 e os cenários unitários do audit gate.
- Dependabot, SBOM, Node 24.15.0 e política `SECURITY.md` permanecem ativos.

## Configuração do Dependabot

O Dependabot cobre `npm` e `github-actions`, roda semanalmente contra `main`, limita PRs abertas e usa labels `dependencies`, `security`, `npm` e `github-actions`. Os grupos conservadores incluem somente `patch` e `minor`; majors permanecem separados para revisão manual. Merge automático não foi habilitado.

## Pinagem das Actions

Pinagem concluída com SHAs oficiais consultados nos tags/releases das Actions:

| Action | Versão legível | SHA |
| --- | --- | --- |
| `actions/checkout` | `v5.1.0` | `fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09` |
| `actions/setup-node` | `v5.0.0` | `a0853c24544627f65ddf259abe73b1d18a591444` |
| `dorny/paths-filter` | `v3.0.3` | `d1c1ffe0248fe513906c8e24db8ea791d46f8590` |
| `denoland/setup-deno` | `v2.0.5` | `22d081ff2d3a40755e97629de92e3bcbfa7cf2ed` |
| `actions/upload-artifact` | `v7.0.1` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/download-artifact` | `v7.0.0` | `37930b1c2abaa49bbe596cd826c3c89aef350131` |
| `actions/configure-pages` | `v6.0.0` | `45bfe0192ca1faeb007ade9deae92b16b8254a0d` |
| `actions/upload-pages-artifact` | `v5.0.0` | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| `actions/deploy-pages` | `v5.0.0` | `cd2ce8fcbc39b97be8ca5fce6e763baed58fa128` |

Não foi usado `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION`.

## Versão Node

A fonte versionada é `.nvmrc`, definida como Node 24.15.0. O workflow usa `node-version-file: .nvmrc` em verify, E2E, Production Preflight, diagnostics, migrations e production smoke. O lockfile permanece `lockfileVersion: 3`, compatível com npm moderno do Node 24.

## Geração do SBOM

`npm run sbom:generate` executa `npm sbom --json`, grava `sbom.cyclonedx.json` e valida JSON com Node. O arquivo gerado não é versionado porque pode conter metadados de build desnecessários. O artifact `sprint51-sbom-${{ github.sha }}` é publicado somente em push para `main` e retido por 14 dias.

## Operação do novo gate

O gate roda no job `verify` antes do build. Ele chama `npm audit --omit=dev --json` com timeout de 120 segundos, valida a estrutura oficial do relatório, imprime resumo acionável e falha em vulnerabilidades altas/críticas de produção. Falhas de rede, registry, JSON inválido, resposta `error` ou timeout viram falha explícita.

## Rollback

Se o gate bloquear indevidamente, reverta apenas os arquivos de Sprint 51 (`scripts/securityAudit.ts`, `scripts/securityAudit.test.ts`, `scripts/sprint51SecurityHardening.test.ts`, `.github/dependabot.yml`, `.nvmrc`, `SECURITY.md`, documentação, lockfile, package e workflow`). Não altere migrations, não execute deploy manual e repita os gates antes de nova revisão.

## Checklist da versão final

- [ ] `npm ci` verde em ambiente com registry acessível.
- [ ] `npm audit --json` e `npm audit --omit=dev --json` anexados à PR.
- [ ] `npm run security:audit` verde ou bloqueio documentado com exceção temporária explícita.
- [ ] `npm test`, `npm run test:sprint51`, `npm run test:previous`, `npm run test:sprint50`, `npm run build`, bundle budget e E2E verdes.
- [ ] CI completo verde.
- [ ] Production Preflight executado no SHA final.
- [ ] Production smoke preservado após deploy por pipeline, sem deploy manual.
- [ ] Riscos residuais revisados antes do merge manual.
