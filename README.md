# Banco de Soluções

Banco de Soluções é uma plataforma open source para conectar problemas reais a soluções reutilizáveis, pessoas, empresas e projetos. A visão é construir uma base mundial de conhecimento colaborativo, onde desafios possam ser descritos com contexto, soluções possam ser comparadas por impacto e comunidades possam se organizar em torno da execução.

## Visão do produto

A visão completa do Banco de Soluções está documentada em [VISION.md](VISION.md), incluindo o papel das contribuições na preservação de conhecimento e na evolução de soluções aplicáveis.

## Objetivos

- Mapear problemas relevantes de forma estruturada.
- Catalogar soluções existentes, experimentais e propostas.
- Conectar pessoas, empresas e projetos por área de atuação.
- Incentivar colaboração aberta, documentação clara e evolução contínua.
- Preparar uma base técnica simples para evoluir com backend, autenticação e dados reais.

## Stack da Fase 1

- React
- TypeScript
- Vite
- TailwindCSS
- Dados mockados tipados
- GitHub Actions
- GitHub Pages

## Páginas implementadas

- Home
- Explorar Problemas
- Explorar Soluções
- Detalhes do Problema
- Detalhes da Solução
- Cadastrar Problema
- Cadastrar Solução
- Sobre

## Como executar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

O artefato final é gerado em `dist/`.

## Deploy

O projeto inclui workflow de GitHub Actions para build e publicação no GitHub Pages. O deploy é disparado em pushes para `main` e também pode ser iniciado manualmente pela aba Actions.

## Estrutura principal

```text
src/
  components/      Componentes reutilizáveis
  data/            Dados fictícios tipados
  lib/             Preparação para integrações futuras
  pages/           Páginas da aplicação
  types/           Tipos compartilhados
```

## Integração futura com Supabase

A integração ainda não está ativa para dados da aplicação. A infraestrutura inicial está documentada em [SUPABASE.md](SUPABASE.md), incluindo client, adapter, provider, diagnósticos, RLS, Auth, Storage e plano de migração futura. A rota `#/diagnostics` exibe o status atual sem substituir o `LocalStorageAdapter`.

## Como contribuir

Leia o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para entender o fluxo de contribuição, padrões de código e critérios para propostas.

## Licença

Este projeto é open source. A licença definitiva será definida antes da primeira versão pública estável.

## Decisões de arquitetura

As decisões sobre hash routing, persistência local, autorização no domínio, relação entre moderação/discussões/contribuições e limitações de segurança local estão documentadas em [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md).

## Sprint 13 — Supabase Auth e profiles

A aplicação usa Supabase Auth para autenticação, sessão e perfis quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas. Sem essas variáveis, o build continua válido e a interface mostra estado de Supabase não configurado.

- Cadastro: `signUp` envia apenas dados públicos editáveis; a confirmação de e-mail pode deixar a sessão nula até o usuário confirmar.
- Profile: a tabela `public.profiles` é criada por migration SQL e preenchida automaticamente por trigger em `auth.users`.
- Campos editáveis pelo formulário comum: `username`, `display_name`, `country`, `bio` e `avatar_url`; `role` não é editável pelo cliente.
- GitHub Actions: o build recebe `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de secrets, mas pull requests sem secrets continuam compilando.
- Domínios locais: problemas, soluções, comentários, reações, favoritos, contribuições e moderação continuam em localStorage via repositórios atuais.
- Limitações: permissões administrativas críticas em Supabase precisarão de claims confiáveis ou backend seguro em sprint posterior.

Consulte `SUPABASE.md` para aplicar e verificar manualmente a migração pelo SQL Editor.
