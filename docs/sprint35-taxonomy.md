# Sprint 35 — Taxonomia global e colaborativa

## Arquitetura e compatibilidade

`taxonomy_terms` é o vocabulário canônico de categorias e tags. `taxonomy_aliases` resolve grafias conhecidas, enquanto `taxonomy_proposals` mantém sugestões privadas até uma decisão. As colunas `category text` e `tags text[]` permanecem nos conteúdos publicados e todas as RPCs das Sprints 32–34 conservam assinatura, paginação, ordenação e retorno.

Triggers de `problems` e `solutions` fazem a canonicalização no banco, inclusive em escritas diretas e em contribuições que atualizem essas tabelas. Termos vazios, repetidos, desconhecidos ou deprecated não entram em novos conteúdos. Categorias oficiais preservam exatamente o nome curado; categorias não oficiais usam uma escolha binária determinística entre os nomes legados, enquanto tags usam sempre o nome normalizado em minúsculas. O backfill usa apenas valores existentes, normaliza caixa e espaços e promove para escopo `both` somente a mesma grafia normalizada encontrada nos dois catálogos. A canonicalização técnica atualiza apenas linhas divergentes, preserva `updated_at` quando o trigger histórico existe e suprime notificações de favoritos; toda a operação permanece na transação da migration e faz rollback integral em caso de falha. O impacto esperado é limitado às linhas com espaços, caixa ou tags vazias/duplicadas.

## Segurança e moderação

Todas as quatro tabelas têm RLS. Leitores anônimos veem somente termos aprovados e aliases desses termos; autores autenticados veem suas propostas. Não há INSERT direto para `authenticated`: toda proposta é criada exclusivamente por `submit_taxonomy_proposal`. A fila e a revisão aceitam somente os papéis existentes `curator` e `admin`. A revisão `SECURITY DEFINER` valida `auth.uid()`, usa `search_path` fixo, bloqueia a proposta, serializa termos concorrentes, é idempotente e grava a auditoria append-only na mesma transação. Rejeições exigem motivo. Um termo `deprecated` não pode ser proposto nem reativado por aprovação; sua reativação exige uma ação administrativa separada.

O frontend segue `UI → hooks → repositories → Supabase`: `TaxonomyRepository`, `useTaxonomy` e os componentes acessíveis de seleção, sugestão e fila traduzem erros do banco e nunca importam o cliente Supabase na UI. Termos pending não são retornados pela listagem pública.

## Deploy e validação

A migration `20260726130000_sprint35_global_taxonomy.sql` é aditiva e deve ser aplicada depois da Sprint 34. O job PostgreSQL 15 aplica a migration real e executa `scripts/fixtures/sprint35_taxonomy_assertions.sql`. Mudanças de migration exigem **Production Preflight no SHA final da PR antes do merge**.

Curator e admin acessam a fila pela rota dedicada `#/admin/taxonomy`; curator não recebe acesso às demais áreas administrativas.

Validação manual: pesquisar categorias/tags aprovadas; enviar uma sugestão autenticada; confirmar que ela não é selecionável; revisar como curator/admin; confirmar canonicalização por alias; tentar termo desconhecido; verificar privacidade da fila e das propostas.

## Limitações conhecidas

Esta sprint mantém as colunas compatíveis e aceita categorias canônicas dinâmicas com validação de runtime. Internacionalização, API pública, embeddings/IA, PostGIS, realtime, cron e exclusão definitiva de auditoria permanecem fora do escopo.
