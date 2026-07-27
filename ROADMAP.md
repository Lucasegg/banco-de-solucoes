# Roadmap — Banco de Soluções

## Fase 1 — Fundação

- [x] Documentação inicial do produto.
- [x] Aplicação React + TypeScript + Vite + TailwindCSS.
- [x] Páginas principais com dados mockados.
- [x] Estrutura preparada para Supabase.
- [x] GitHub Actions e GitHub Pages.

## Fase 2 — Dados reais

- [ ] Criar schema inicial no Supabase.
- [ ] Persistir problemas e soluções.
- [ ] Implementar autenticação.
- [ ] Criar perfis públicos de pessoas e organizações.
- [ ] Adicionar relacionamento muitos-para-muitos entre problemas e soluções.

## Fase 3 — Colaboração

- [ ] Comentários e discussões.
- [ ] Votos, relevância e sinalização de qualidade.
- [ ] Moderação comunitária.
- [ ] Histórico de alterações.
- [ ] Convites para projetos e times.

## Fase 4 — Descoberta avançada

- [ ] Busca textual robusta.
- [ ] Tags globais e taxonomia colaborativa.
- [ ] Filtros por região, setor, maturidade e impacto.
- [ ] Recomendações de soluções para problemas similares.

## Fase 5 — Escala mundial

- [ ] Internacionalização completa (`pt-BR` e `en-US`; infraestrutura e telas iniciais entregues na Sprint 36).
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
- [ ] Migrar as telas legadas restantes para concluir a cobertura integral da interface.
- [ ] Fora do escopo: tradução automática, outros idiomas, preferência no perfil e RTL.
