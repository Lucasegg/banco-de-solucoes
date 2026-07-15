# Infraestrutura Supabase

Esta sprint prepara a base de integração com Supabase sem alterar o comportamento atual da aplicação. O `LocalStorageAdapter` continua sendo o adapter ativo, e nenhum fluxo de usuários, comentários, favoritos, contribuições ou moderação foi migrado.

## Client

O client fica em `src/integrations/supabase/client.ts` e usa as variáveis públicas do Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Quando as variáveis não estão preenchidas, o client exportado é `null`. Isso permite que a aplicação rode localmente sem credenciais e evita ativar Supabase por acidente. O health check da tela de diagnósticos usa a REST API do projeto, com `HEAD /rest/v1/`, em vez de tratar sessão de Auth como conectividade geral.

## Adapter

`src/integrations/supabase/SupabaseAdapter.ts` é um scaffold assíncrono para uma migração futura. Ele não é registrado como substituto direto do `StorageAdapter`, porque o adapter atual é síncrono e Supabase depende de rede.

O objetivo é evitar uma falsa intercambialidade: antes de trocar o mecanismo ativo, os repositórios e hooks precisarão receber uma API assíncrona ou uma camada de serviço própria por domínio.

## Provider

`src/integrations/supabase/PersistenceProvider.tsx` centraliza qual adapter está ativo. Inicialmente, o provider expõe:

- adapter ativo: `LocalStorageAdapter`
- modo: `local`
- scaffold Supabase disponível como adapter futuro assíncrono

A API pública dos hooks existentes não foi alterada.

## RLS

Antes de migrar dados para Supabase, cada tabela deverá ter Row Level Security habilitado. As políticas devem ser desenhadas por domínio:

- leitura pública apenas para dados realmente públicos;
- escrita restrita ao usuário autenticado dono do registro;
- moderação restrita a perfis autorizados;
- auditoria de ações sensíveis.

## Auth

A autenticação atual continua local. A futura adoção do Supabase Auth deve acontecer em uma sprint própria, com plano de migração para sessão, cadastro, login, recuperação de senha e perfis.

## Storage

Nenhum arquivo foi migrado para Supabase Storage. Caso a aplicação passe a aceitar uploads, será necessário definir buckets, políticas de acesso, limites de tamanho e fluxo de limpeza.

## Migração futura

Uma migração segura deve acontecer por etapas:

1. modelar tabelas e políticas RLS;
2. implementar métodos reais no `SupabaseAdapter`;
3. criar testes de paridade entre adapters;
4. adaptar hooks/repositórios para uma fronteira assíncrona ou criar serviços por domínio;
5. ativar o `PersistenceProvider` por feature flag;
6. migrar um domínio por vez;
7. validar rollback para `LocalStorageAdapter` enquanto a migração estiver em progresso.

## Diagnósticos

A rota `#/diagnostics` mostra o adapter ativo, status de configuração Supabase, URL configurada, health check, versão da aplicação e modo atual.

## Sprint 13 — Auth, sessão e profiles reais

A Sprint 13 migra exclusivamente autenticação, sessão e perfis para Supabase Auth e PostgreSQL. Problemas, soluções, comentários, reações, favoritos, contribuições e moderação continuam usando os repositórios atuais com `LocalStorageAdapter`.

### Configuração pública

Use somente variáveis públicas do Vite, sem valores reais versionados:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Quando ausentes, o build continua funcionando e a UI informa `Supabase não configurado`. O frontend nunca usa `service_role`, secret key, access token ou refresh token hardcoded.

### Fluxo de cadastro e confirmação de e-mail

O cadastro chama `supabase.auth.signUp` e envia em `options.data` apenas `username`, `display_name`, `country`, `bio` e `avatar_url`. A role nunca é enviada pelo formulário. Se o Supabase exigir confirmação de e-mail, a sessão vem nula e a aplicação mostra mensagem para confirmar o e-mail, sem login automático artificial.

### Profiles, trigger e RLS

A migração versionada `supabase/migrations/20260715130000_create_profiles.sql` cria `public.profiles`, constraints de username/role, timestamps, trigger de `updated_at`, trigger `security definer` em `auth.users` e RLS. A trigger cria o profile automaticamente a partir de `raw_user_meta_data`, atribui sempre `member` e ignora qualquer role em metadata. Usuários autenticados leem perfis e atualizam apenas o próprio perfil; `id`, `role` e `created_at` não podem ser alterados pelo usuário comum. Permissões administrativas críticas ainda exigirão claims confiáveis ou validação segura no backend em sprint posterior.

### Como aplicar a migração pelo SQL Editor

1. Após revisar a PR, abra o painel do Supabase do projeto.
2. Acesse **SQL Editor**.
3. Copie todo o conteúdo de `supabase/migrations/20260715130000_create_profiles.sql`.
4. Cole no editor e execute uma única vez.
5. Não execute comandos com `service_role` no navegador e não copie credenciais para o repositório.

### Como verificar a migração

- **Tabela profiles:** em Table Editor, confirme `public.profiles` com `id`, `username`, `display_name`, `country`, `bio`, `avatar_url`, `role`, `created_at` e `updated_at`.
- **Trigger:** em Database > Triggers, confirme `on_auth_user_created_create_profile` em `auth.users`.
- **RLS:** confirme Row Level Security habilitado em `public.profiles`.
- **Políticas:** confirme as policies de leitura autenticada e atualização do próprio perfil.
- **Cadastro criando profile:** crie um usuário pelo fluxo da aplicação, confirme o e-mail se necessário e verifique se `public.profiles` recebeu o registro automaticamente sem chamada `insert` do frontend.
