# PRD — Banco de Soluções

## 1. Visão

Criar uma plataforma colaborativa e open source que conecte problemas, soluções, pessoas, empresas e projetos em uma base mundial de conhecimento acionável.

## 2. Problema

Informações sobre problemas sociais, técnicos, ambientais, educacionais e organizacionais costumam estar dispersas. Soluções promissoras são difíceis de descobrir, comparar, validar e adaptar a novos contextos.

## 3. Público-alvo

- Pessoas que desejam registrar problemas reais.
- Pesquisadores e especialistas que analisam causas e evidências.
- Empreendedores e empresas que propõem soluções.
- Comunidades e governos que buscam referências de execução.
- Desenvolvedores open source que desejam colaborar com a plataforma.

## 4. Proposta de valor

- Transformar problemas em registros claros, comparáveis e pesquisáveis.
- Relacionar soluções a problemas específicos.
- Destacar impacto, maturidade, evidências e responsáveis.
- Facilitar descoberta e colaboração entre atores.

## 5. Escopo da Fase 1

### Incluído

- Aplicação estática em React, TypeScript, Vite e TailwindCSS.
- Documentação fundacional do produto e arquitetura.
- Navegação entre páginas principais.
- Dados mockados tipados para problemas e soluções.
- Formulários sem persistência real.
- Preparação para integração futura com Supabase.
- Pipeline de build e GitHub Pages.

### Fora de escopo por enquanto

- Autenticação.
- Banco de dados real.
- Busca avançada server-side.
- Comentários, votos e reputação.
- Moderação automatizada.
- Internacionalização completa.

## 6. Funcionalidades

| Funcionalidade | Descrição | Fase |
| --- | --- | --- |
| Home | Apresenta visão, métricas mockadas e chamadas para ação | 1 |
| Explorar Problemas | Lista problemas com filtros visuais simples | 1 |
| Explorar Soluções | Lista soluções conectadas a problemas | 1 |
| Detalhes | Mostra contexto, impacto e relacionamentos | 1 |
| Cadastro | Formulários para novos problemas e soluções | 1 |
| Supabase | Preparação de configuração e contratos | 1 |

## 7. Requisitos não funcionais

- Interface minimalista inspirada em Notion, GitHub, Linear e Vercel.
- Código tipado e organizado por domínio.
- Build reprodutível via npm.
- Deploy automatizado em GitHub Pages.
- Baixa complexidade inicial para facilitar contribuição.

## 8. Métricas de sucesso futuras

- Número de problemas cadastrados.
- Número de soluções conectadas a problemas.
- Taxa de problemas com pelo menos uma solução.
- Contribuições externas aceitas.
- Projetos iniciados a partir de conexões na plataforma.
