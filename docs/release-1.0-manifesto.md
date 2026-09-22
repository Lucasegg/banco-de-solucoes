# Manifesto de entrega — Banco de Soluções 1.0

## Estado atual

**PUBLICADA E EM PRODUÇÃO.** A versão 1.0 está em operação no domínio canônico
<https://www.bancodesolucoes.com.br/>. A evidência histórica de go-live permanece
registrada em [docs/release/1.0.0-manifest.md](release/1.0.0-manifest.md); execuções
mais recentes de `main` devem ser usadas para comprovar o estado atual de cada revisão.

## Escopo entregue

A versão 1.0 inclui catálogo público de problemas/soluções, busca textual e geográfica,
taxonomia/recomendações, identidade e perfis, contribuições moderadas, interações,
reputação, notificações, contato, páginas legais/LGPD, administração, acessibilidade,
i18n e operação de produção.

## Arquitetura e segurança

A SPA React/TypeScript/Vite no GitHub Pages usa Supabase Auth, PostgreSQL com RLS,
Realtime, Storage e Edge Function; Resend entrega contato. A arquitetura completa está
em [ARCHITECTURE.md](../ARCHITECTURE.md). Autorização combina guards de interface e
políticas/RPCs no banco; credenciais privilegiadas ficam fora do browser; migrations são
versionadas e o smoke bloqueia mutações.

Nenhum documento público deve conter valores reais de secrets, tokens, senhas, chaves,
identificadores privados de infraestrutura ou dados pessoais desnecessários.

## Acessibilidade e operação

Teclado, skip link, foco, landmarks, mensagens acessíveis, viewport estreito/desktop e
catálogos pt-BR/en-US têm cobertura automatizada, sem alegação de certificação WCAG
externa. A operação possui verify, E2E, preflight, migrations/health, deploy, smoke
pós-deploy e monitor diário. Incidentes e rollback seguem o
[runbook](operations-runbook.md).

## Evidências

Evidências de runs, SHAs e PRs são históricas por natureza. Um run verde comprova somente
a revisão que ele executou. Para estado corrente, valide o SHA da `main`, o último
**Verify, migrate and deploy** e o smoke pós-deploy correspondente. Não reutilize um run
antigo como prova de saúde atual.

## Riscos residuais e limitações conhecidas

- GitHub Pages, Supabase, DNS, OAuth e Resend são dependências externas.
- Smoke não cria conta, conteúdo, contato ou ação administrativa; integrações mutáveis
  exigem validação controlada e consentida.
- Contraste não possui certificação instrumental externa; acessibilidade requer revisão
  contínua com mudanças de UI.
- Não há licença definitiva; uso/redistribuição não são automaticamente autorizados.
- Conteúdo depende de moderação humana, e atendimento LGPD depende do administrador.

## Manutenção futura

Manter fluxo branch/PR, dependências em lotes pequenos, migration aditiva imutável,
regressão por defeito e revisão periódica de logs, custos, entregabilidade,
acessibilidade, secrets, DNS/certificado e políticas. Toda mudança relevante deve
atualizar arquitetura, runbook e riscos junto do código.
