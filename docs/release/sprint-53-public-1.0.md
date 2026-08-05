# Sprint 53 — versão pública 1.0

## Identificação de versão

A versão pública do projeto é `1.0.0` e deve ser atualizada em dois pontos no mesmo PR de release:

1. `package.json`, campo `version`.
2. `src/version.ts`, constante `PUBLIC_VERSION`.

A interface expõe a versão apenas como texto acessível para operação e suporte, sem inserir novo elemento visual permanente no produto.

## SEO técnico e HashRouter

O domínio canônico oficial é `https://www.bancodesolucoes.com.br/`. Metadados técnicos básicos são aplicados no HTML inicial e atualizados por rota pública durante a navegação: `title`, `description`, `canonical`, Open Graph, Twitter Card e `robots`.

O app preserva o `HashRouter` existente. Essa decisão evita impacto de infraestrutura nesta sprint, mas tem limitação para indexação: muitos robôs tratam fragmentos `#/...` como parte cliente, não como rotas HTTP distintas. Por isso o `sitemap.xml` lista somente rotas públicas estáveis em hash e exclui páginas administrativas, privadas, callbacks, recuperação de senha e MFA.

## Segurança, privacidade e terceiros

Não foram adicionados analytics, cookies ou scripts de terceiros nesta sprint. Os terceiros já necessários em produção são:

- Supabase, usado para autenticação, dados, Storage e funções de contato quando configurado por variáveis públicas de ambiente.
- Leaflet/OpenStreetMap, usado para mapas públicos.

O bundle público não deve conter `service_role`, secrets, tokens administrativos ou credenciais privadas. Links externos devem manter `target="_blank"` acompanhado de `rel="noreferrer"` ou proteção equivalente.

## Checklist de release e rollback

1. Atualizar versão em `package.json` e `src/version.ts`.
2. Rodar `npm ci`.
3. Rodar `npm test` e `npm run test:previous`.
4. Rodar `npm run test:sprint53`.
5. Rodar `npm run security:audit:report` e `npm run security:audit`.
6. Rodar `npm run build` e `npm run check:bundle-budget`.
7. Rodar E2E crítico com `npm run build:e2e` e `npm run test:e2e`.
8. Validar 320 px, tablet e desktop via Playwright ou inspeção equivalente.
9. Validar `dist/robots.txt`, `dist/sitemap.xml` e metadados de `dist/index.html`.
10. Verificar ausência de secrets no `dist/` com busca por padrões proibidos.
11. Rodar `git diff --check`.
12. Executar Production Preflight manual no SHA final antes da aprovação do deploy.
13. Preencher `docs/release/release-manifest-template.md` com SHA, resultados e artefatos.

Rollback: identificar o último SHA saudável em `main`, executar o workflow de deploy/preflight para esse SHA, validar smoke somente-leitura em produção e registrar o rollback no manifesto sem expor secrets.

## Migrations

Esta sprint não inclui migrations e não altera o modelo de dados.
