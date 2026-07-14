# Banco de Soluções

Banco de Soluções é uma plataforma open source para conectar problemas reais a soluções reutilizáveis, pessoas, empresas e projetos. A visão é construir uma base mundial de conhecimento colaborativo, onde desafios possam ser descritos com contexto, soluções possam ser comparadas por impacto e comunidades possam se organizar em torno da execução.

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

A integração ainda não está ativa. A pasta `src/lib` contém um módulo de configuração preparado para centralizar variáveis públicas do Supabase quando o backend for introduzido.

## Como contribuir

Leia o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para entender o fluxo de contribuição, padrões de código e critérios para propostas.

## Licença

Este projeto é open source. A licença definitiva será definida antes da primeira versão pública estável.
