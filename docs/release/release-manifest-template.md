# Manifesto de release

- Versão: 1.0.0
- SHA: `<preencher no release>`
- Data UTC: `<preencher no release>`
- Ambiente: produção pública (`https://www.bancodesolucoes.com.br/`)
- Migrations incluídas: nenhuma nesta sprint
- Auditorias: `<npm test, test:previous, test:sprint53, security:audit:report, security:audit>`
- Artefato SBOM: `sbom.cyclonedx.json` gerado pelo workflow/comando `npm run sbom:generate`
- Production Preflight: `<resultado e link do workflow>`
- Smoke de produção: `<resultado e link do workflow>`
- Bundle budget: `<resultado>`
- Validação SEO/robots/sitemap: `<resultado>`
- Verificação de secrets no dist: `<resultado>`
- Rollback: redeploy do último SHA saudável de `main`, seguido de Production Preflight e smoke somente-leitura

Este manifesto não deve conter secrets, tokens, chaves privadas ou valores administrativos sensíveis.
