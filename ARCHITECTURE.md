# Arquitetura — Banco de Soluções

## Visão geral

Nesta fase, o Banco de Soluções é uma aplicação frontend estática. A arquitetura privilegia simplicidade, tipagem e separação clara entre apresentação, dados mockados e pontos futuros de integração.

## Camadas

```text
Interface React
  ↓
Componentes e páginas
  ↓
Dados mockados tipados
  ↓
Contrato futuro com Supabase
```

## Estrutura de diretórios

```text
src/
  components/      Layout, navegação, cartões e elementos reutilizáveis
  data/            Problemas e soluções fictícios
  lib/             Configuração de integrações externas
  pages/           Telas principais
  types/           Tipos de domínio
```

## Modelo de domínio inicial

### Problema

Representa um desafio real com título, resumo, categoria, impacto, região, tags e soluções relacionadas.

### Solução

Representa uma abordagem, produto, processo ou projeto que responde a um ou mais problemas. Inclui maturidade, organização responsável, métricas de impacto e tags.

## Estratégia de dados

A Fase 1 usa dados mockados para validar navegação, conteúdo e componentes. A transição para Supabase deve manter os tipos de domínio como contrato principal e substituir gradualmente os módulos em `src/data` por consultas reais.

## Preparação para Supabase

O arquivo `src/lib/supabase.ts` centraliza variáveis públicas esperadas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Enquanto não houver backend, o módulo apenas expõe configuração e um indicador de disponibilidade.

## Deploy

O GitHub Actions executa instalação, build e publicação do diretório `dist` no GitHub Pages em pushes para `main`.

## Princípios técnicos

- Começar simples antes de otimizar.
- Manter a experiência acessível e minimalista.
- Usar TypeScript como documentação viva do domínio.
- Separar dados, componentes e páginas.
- Evitar acoplamento prematuro com backend.
