# Roadmap — Banco de Soluções

## Fase 1 — Fundação

- [x] Documentação inicial do produto.
- [x] Aplicação React + TypeScript + Vite + TailwindCSS.
- [x] Páginas principais com dados mockados.
- [x] Estrutura preparada para Supabase.
- [x] GitHub Actions e GitHub Pages.

## Fase 2 — Dados reais (entregue na 1.0)

- [x] Criar schema inicial no Supabase.
- [x] Persistir problemas e soluções.
- [x] Implementar autenticação.
- [x] Criar perfis públicos de pessoas e organizações.
- [x] Relacionar problemas e soluções por recomendações e contribuições.

## Fase 3 — Colaboração (parcialmente entregue na 1.0)

- [x] Comentários, reações e discussões.
- [x] Reputação, conquistas e sinalização de qualidade.
- [x] Denúncias e moderação de conteúdo.
- [x] Histórico auditável de contribuições.
- [ ] Convites para projetos e times.

## Fase 4 — Descoberta avançada (entregue na 1.0)

- [x] Busca textual robusta.
- [x] Tags globais e taxonomia colaborativa.
- [x] Filtros e busca geográfica por região e proximidade.
- [x] Recomendações de soluções para problemas similares.

## Fase 5 — Escala mundial

- [x] Internacionalização completa (`pt-BR` e `en-US`; infraestrutura e toda a interface existente cobertas na Sprint 36).
- [ ] API pública.
- [ ] Exportação de dados abertos.
- [ ] Integrações com ferramentas de pesquisa, governo e comunidades.
# Sprint 35 — Taxonomia global e colaborativa

- [x] Vocabulário canônico de categorias e tags com aliases, escopos e depreciação.
- [x] Propostas privadas, revisão por curator/admin, auditoria append-only e RLS.
- [x] Backfill e canonicalização compatíveis com busca, geografia e recomendações.
- [x] Repository, hook e componentes acessíveis para seleção, sugestão e moderação.

# Sprint 36 — Internacionalização

- [x] Recursos tipados e modulares em `pt-BR` e `en-US`, detecção, fallback e persistência local resiliente.
- [x] Seletor acessível no cabeçalho e atualização de idioma/metadados sem recarga.
- [x] Formatadores `Intl` centralizados e verificação de paridade/duplicidade das traduções.
- [x] Interface pública, autenticada e administrativa integralmente migrada, incluindo formulários, busca, mapas, notificações, taxonomia e moderação.
- [x] Escopo e limitações documentados; tradução automática, outros idiomas, preferência no perfil e RTL permanecem fora do escopo.
