# Persistência — produção e camadas de acesso

## Estado atual

O ambiente de produção usa **Supabase/PostgreSQL real e persistente**. A fonte de verdade dos dados de produção é o backend Supabase, protegido por autenticação, RLS, constraints, RPCs e demais contratos versionados no repositório.

O `LocalStorageAdapter` pertence à evolução histórica da arquitetura e pode existir como utilitário local/compatibilidade, mas **não deve ser descrito nem tratado como mecanismo principal de persistência da produção**.

## Fluxo de produção

```text
UI
↓
Hooks / Services
↓
Repositories
↓
Supabase client / RPCs / Edge Functions
↓
Supabase Auth + PostgreSQL/RLS + Realtime + Storage
```

- **UI e componentes** consomem hooks/serviços e não devem concentrar regras de segurança.
- **Hooks e serviços** orquestram estado assíncrono e operações por domínio.
- **Repositories** encapsulam leitura, escrita, parsing e contratos de persistência.
- **Supabase/PostgreSQL** é a autoridade persistente do ambiente publicado.
- **RLS/RPCs** são a camada obrigatória de autorização para dados.
- **Storage** é usado somente nos fluxos que possuem bucket/policy previstos.
- **Edge Functions** recebem responsabilidades server-side específicas, como o contato.

## Dados locais

Estado local do navegador pode ser usado apenas para preferências de interface, compatibilidade, cache ou testes quando explicitamente previsto. Ele não deve armazenar ou decidir privilégios administrativos, autoria, autorização persistente ou regras de negócio que precisem ser confiáveis.

Dados mockados e fixtures pertencem a desenvolvimento/testes. Eles não representam o estado real da produção.

## Banco e migrations

O schema está versionado em `supabase/migrations/`. Regras obrigatórias:

1. nunca editar ou apagar migration já aplicada;
2. criar migration nova e revisável para mudanças de schema/RLS/grants/RPCs;
3. validar mudanças SQL no PostgreSQL isolado quando aplicável;
4. executar os gates de migrations e Production Preflight exigidos;
5. aplicar em produção somente pelo fluxo de deploy aprovado;
6. em rollback de banco, preferir migration compensatória revisada, nunca reescrita de histórico.

## Segurança

O frontend pode receber somente configuração pública prevista, como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Segredos administrativos, tokens de gerenciamento, senha do banco e credenciais equivalentes nunca são versionados, documentados com valores reais ou enviados ao navegador.

Consulte [SUPABASE.md](SUPABASE.md), [SECURITY.md](SECURITY.md) e [docs/operations-runbook.md](docs/operations-runbook.md) para o contrato operacional completo.
