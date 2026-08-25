# Arquitetura da versão 1.0

## Visão geral

O Banco de Soluções 1.0 é uma SPA React/TypeScript construída pelo Vite, publicada
como conteúdo estático no GitHub Pages e integrada ao Supabase. O domínio canônico é
`https://www.bancodesolucoes.com.br/`; o roteamento por hash permite acesso direto
sem exigir regras de rewrite no host.

```text
Browser (React + HashRouter + i18n)
  ├─ pages/components → hooks → repositories
  ├─ Supabase JS (anon key + sessão do usuário)
  └─ contact-request Edge Function
          ↓
Supabase Auth + PostgreSQL/RLS + Realtime + Storage
          ↓
Resend (e-mail do Fale Conosco)

GitHub Actions → verify → migrate-and-health → deploy → production-smoke
```

## Frontend

- `src/pages` compõe jornadas e estados de rota; `src/components` concentra UI
  reutilizável, autenticação e administração.
- `src/hooks` orquestra estado assíncrono; `src/repositories` é a fronteira de dados.
  Componentes não devem importar o cliente Supabase diretamente.
- `src/integrations/supabase` contém cliente, adapters e integração de sessão;
  `src/i18n` mantém catálogos tipados pt-BR/en-US.
- `src/routing` implementa o contrato do HashRouter e retorno seguro após login.
- `e2e` oferece jornadas determinísticas com backend simulado; o smoke de produção é
  separado e estritamente somente leitura.

## Supabase, migrations e RLS

As migrations ordenadas estão em `supabase/migrations`; elas são imutáveis depois de
aplicadas. Tabelas de identidade, conteúdo, interações, contribuições, denúncias,
notificações, taxonomia e reputação usam RLS. Leitura pública é limitada aos dados
publicáveis, ações de membro exigem `auth.uid()` e operações de moderação exigem papel
administrativo validado no banco. A `service_role` nunca pertence ao frontend.

A Edge Function `supabase/functions/contact-request` valida conteúdo e consentimento,
aplica rate limit persistente e entrega pelo Resend. Mudanças SQL exigem migration
aditiva, teste local, `test:pending-migrations` e preflight remoto; a Sprint 60 não cria
nem modifica migration, RLS ou permissões. O inventário histórico e os procedimentos
de baseline estão em [SUPABASE.md](SUPABASE.md).

## Autenticação e autorização

Supabase Auth fornece e-mail/senha, OAuth, recuperação PKCE e MFA TOTP. O contexto de
autenticação centraliza sessão e nível de garantia. Rotas de membro preservam o destino
e direcionam visitantes ao login; rotas administrativas exigem papel `admin`. A UI é
defesa em profundidade: autorização definitiva de dados permanece em RLS/RPCs.

## Entrega e operação

O workflow **Verify, migrate and deploy** executa `verify`; em PR com SQL também valida
PostgreSQL isolado. Um dispatch explícito executa `production-preflight` sem escrita.
Em `main`, `migrate-and-health` aplica migrations e prepara o artifact, `deploy`
publica no Pages e `production-smoke` observa o domínio. O workflow **Daily production
health monitor** repete o smoke somente leitura. Sequência, secrets, rollback e
diagnóstico estão no [runbook](docs/operations-runbook.md).

## Decisões e limites

Hash routing, segurança local e decisões históricas estão em
[ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md). A ausência de SSR limita a
indexação por rota; disponibilidade depende de GitHub Pages, Supabase, DNS e Resend;
ações autenticadas reais não são exercidas pelo smoke para evitar mutações. Consulte
os [riscos residuais do manifesto](docs/release-1.0-manifesto.md#riscos-residuais).
