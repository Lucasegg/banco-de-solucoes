# Banco de Soluções

Plataforma colaborativa para documentar problemas reais, comparar soluções e conectar
pessoas e organizações. A versão do pacote é **1.0.0** e o ambiente canônico é
<https://www.bancodesolucoes.com.br/>.

> A entrega 1.0 somente pode ser declarada concluída quando os gates do SHA candidato,
> o Production Preflight e o Daily production health monitor estiverem verdes. Veja o
> [manifesto de entrega](docs/release-1.0-manifesto.md).

## Começar

Requer a versão Node indicada em `.nvmrc`.

```bash
npm ci
npm run dev
```

Validação essencial:

```bash
npm test
npm run test:previous
npm run test:sprint60
npm run build
npm run test:e2e
```

Somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são configuração pública do
frontend. Copie `.env.example` para uso local e nunca versione credenciais.

## Documentação 1.0

- [Arquitetura e estrutura técnica](ARCHITECTURE.md)
- [Supabase, migrations, RLS e Edge Functions](SUPABASE.md)
- [Runbook operacional: CI, deploy, monitor, incidentes e rollback](docs/operations-runbook.md)
- [Auditoria final das jornadas](docs/sprint-60-final-audit.md)
- [Manifesto de entrega 1.0](docs/release-1.0-manifesto.md)
- [Decisões arquiteturais](ARCHITECTURE_DECISIONS.md)
- [Segurança](SECURITY.md) e [persistência](PERSISTENCE.md)
- [Desenvolvimento por branch e PR](CONTRIBUTING.md)
- [Visão](VISION.md), [requisitos](PRD.md) e [roadmap](ROADMAP.md)

## Estrutura

`src/` contém a SPA, `supabase/migrations/` e `supabase/functions/` contêm o backend
versionado, `e2e/` reúne jornadas Playwright, `scripts/` contém contratos e verificações,
e `.github/workflows/` define entrega e monitoramento. O build gera `dist/`; publicação
ocorre exclusivamente pelo GitHub Actions em `main`.

## Manutenção

Não faça mudanças diretamente em `main`. Abra uma branch por sprint/correção, mantenha
migrations aplicadas imutáveis, acrescente regressão para defeitos e obtenha revisão,
Actions e preflight verdes antes do merge. Consulte [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

O repositório ainda não possui licença definitiva. Código publicamente visível não
concede automaticamente permissão de uso, modificação ou redistribuição.
