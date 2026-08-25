# Manifesto de entrega — Banco de Soluções 1.0

## Estado da decisão

**CANDIDATA, NÃO ENCERRADA.** A conclusão formal só ocorre após todos os gates do SHA
final da Sprint 60, Production Preflight e Daily production health monitor ficarem
verdes e seus links serem registrados na PR. Documentação ou execução anterior não
substitui essa evidência.

## Escopo entregue e sprints

As Sprints 1–60 construíram e estabilizaram a versão 1.0; a Sprint 59 foi integrada pela
PR #107 no merge `6acf9ed60d9c60ec74d1bf287650e7f428c926d5`. O escopo inclui catálogo público
de problemas/soluções, busca textual e geográfica, taxonomia/recomendações, identidade e
perfis, contribuições moderadas, interações, reputação, notificações, contato, páginas
legais/LGPD, administração, acessibilidade, i18n e operação de produção.

## Arquitetura e segurança

A SPA React/TypeScript/Vite no GitHub Pages usa Supabase Auth, PostgreSQL com RLS,
Realtime, Storage e Edge Function; Resend entrega contato. A arquitetura completa está
em [ARCHITECTURE.md](../ARCHITECTURE.md). Autorização combina guards de interface e
políticas/RPCs no banco; credenciais privilegiadas ficam fora do browser; migrations são
versionadas e o smoke bloqueia mutações.

## Acessibilidade e operação

Teclado, skip link, foco, landmarks, mensagens acessíveis, 320 px/desktop e catálogos
pt-BR/en-US têm cobertura automatizada, sem alegação de certificação WCAG externa. A
operação possui verify, E2E, preflight, migrations/health, deploy, smoke pós-deploy e
monitor diário. Incidentes e rollback seguem o [runbook](operations-runbook.md).

## Evidências de produção

O baseline pós-Sprint 59 é o [run 32802239294](https://github.com/Lucasegg/banco-de-solucoes/actions/runs/32802239294),
no qual verify, E2E, migrate-and-health, deploy e a reexecução do smoke ficaram verdes.
A primeira tentativa teve `ECONNRESET` em `manifest.webmanifest`; a causa operacional foi
registrada, nenhuma assertion funcional falhou e a execução seguinte passou inteira.
Os links do preflight e monitor da Sprint 60 ainda estão **PENDENTES** na PR e devem
referenciar exatamente o SHA final.

## Riscos residuais e limitações conhecidas

- HashRouter sem SSR/prerender limita SEO individual de rotas.
- GitHub Pages, Supabase, DNS, OAuth e Resend são dependências externas.
- Smoke não cria conta, conteúdo, contato ou ação administrativa; integrações mutáveis
  exigem validação controlada e consentida.
- Contraste não possui certificação instrumental externa; acessibilidade requer revisão
  contínua com mudanças de UI.
- Não há licença definitiva; uso/redistribuição não são automaticamente autorizados.
- Conteúdo depende de moderação humana, e atendimento LGPD depende do administrador.

## Fora do escopo

Novas funcionalidades, aplicativo nativo, SSR, tradução automática de conteúdo,
operação offline, SLA comercial, auditoria externa/certificação, troca de infraestrutura,
alteração de domínio, nova migration/RLS e automação de ações destrutivas não integram a
Sprint 60.

## Critérios de conclusão 1.0

1. Baseline da Sprint 59 presente e patch revisado sem mudança sensível não declarada.
2. `npm ci`, contratos cumulativos/57–60, auditorias, migrations estáticas, build, bundle,
   E2E e `git diff --check` verdes.
3. PR revisada e Actions verdes no SHA final.
4. Production Preflight e Daily production health monitor verdes no mesmo SHA, com URLs.
5. Deploy e smoke pós-deploy verdes antes de declarar a versão publicada concluída.

## Manutenção futura

Manter fluxo branch/PR, dependências em lotes pequenos, migration aditiva imutável,
regressão por defeito e revisão periódica de logs, custos, entregabilidade, acessibilidade,
secrets, DNS/certificado e políticas. Uma futura mudança deve atualizar arquitetura,
runbook e riscos junto do código; não reutilize o marco 1.0 como evidência do novo SHA.
