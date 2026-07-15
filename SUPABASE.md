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
