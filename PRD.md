# PRD — Banco de Soluções

## 1. Visão

Criar uma plataforma colaborativa que conecte problemas, soluções, pessoas, empresas e projetos em uma base mundial de conhecimento acionável.

## 2. Problema

Informações sobre problemas sociais, técnicos, ambientais, educacionais e organizacionais costumam estar dispersas. Soluções promissoras são difíceis de descobrir, comparar, validar e adaptar a novos contextos.

## 3. Público-alvo

- Pessoas que desejam registrar problemas reais.
- Pesquisadores e especialistas que analisam causas e evidências.
- Empreendedores e empresas que propõem soluções.
- Comunidades e governos que buscam referências de execução.
- Desenvolvedores que desejam colaborar com a plataforma.

## 4. Proposta de valor

- Transformar problemas em registros claros, comparáveis e pesquisáveis.
- Relacionar soluções a problemas específicos.
- Destacar impacto, maturidade, evidências e responsáveis.
- Facilitar descoberta e colaboração entre atores.

## 5. Estado atual da versão 1.0

A aplicação está publicada em produção em <https://www.bancodesolucoes.com.br/> e utiliza backend real no Supabase.

### Entregue

- React + TypeScript + Vite + TailwindCSS.
- GitHub Actions e GitHub Pages.
- Supabase Auth e PostgreSQL com RLS.
- Persistência real de problemas, soluções, perfis, comentários, favoritos, contribuições, notificações e demais domínios versionados.
- Busca textual e geográfica, taxonomia e recomendações.
- Moderação, auditoria, reputação e notificações.
- Perfis públicos e autenticação com fluxos protegidos.
- Realtime e Storage nos fluxos suportados.
- Fale Conosco por Edge Function.
- Internacionalização pt-BR/en-US.
- Páginas legais, LGPD, SEO técnico, social metadata e monitoramento operacional.
- Testes de unidade/contrato, E2E e smoke de produção somente leitura.

### Ainda fora do escopo atual

- API pública de terceiros.
- Exportação ampla de dados abertos.
- Convites para projetos/times.
- SSR/prerenderização completa.
- Tradução automática de conteúdo e novos idiomas além dos suportados.
- SLA comercial ou auditoria/certificação externa.

## 6. Requisitos não funcionais

- Interface responsiva, acessível e simples.
- Código tipado e organizado por domínio.
- Build reprodutível via npm.
- Deploy automatizado e rastreável.
- RLS e autorização server-side para dados persistentes.
- Migrations versionadas e imutáveis após aplicação.
- Nenhuma credencial privilegiada no frontend ou no repositório.
- Operação fail-closed nos gates críticos de entrega.

## 7. Métricas de sucesso

- Número de problemas cadastrados.
- Número de soluções conectadas a problemas.
- Taxa de problemas com pelo menos uma solução.
- Contribuições revisadas e aceitas.
- Engajamento com comentários, favoritos e notificações.
- Saúde operacional dos pipelines e smoke de produção.
