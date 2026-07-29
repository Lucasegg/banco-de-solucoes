# Sprint 42 — Denúncias e moderação de conteúdo

## Modelo e ciclo de vida

`content_reports` registra UUID do denunciante, alvo polimórfico (`problem` ou `solution`), motivo controlado, descrição de até 1.000 caracteres, estado, dados da decisão e timestamps. A nota interna tem até 2.000 caracteres. Os índices cobrem fila, alvo, denunciante, motivo e estado. Um índice único parcial impede mais de uma denúncia ativa do mesmo usuário para o mesmo alvo, mas preserva denúncias encerradas.

Estados e transições permitidas: `open → reviewing → resolved|dismissed` e `open → resolved|dismissed`. Estados finais são imutáveis. `moderator_id` e `reviewed_at` são definidos no servidor apenas na decisão final. A tabela não possui FK polimórfica para o alvo: se o conteúdo for removido, o histórico permanece, o título pode aparecer indisponível e novas denúncias são recusadas.

## Autorização, RLS e proteção de dados

A migration habilita e força RLS e revoga todo DML de `anon` e `authenticated`. Não há policies de acesso direto: toda leitura e mutação passa pelas RPCs `SECURITY DEFINER`, com `search_path = pg_catalog, public`. `reporter_id` sempre vem de `auth.uid()`; sessões anônimas, alvos inexistentes/arquivados e conteúdo do próprio autor são recusados. Não são coletados IP, user-agent, token ou sessão.

As RPCs do usuário retornam apenas a própria denúncia. A fila usa a definição administrativa já existente (`public.is_admin()`) e omite `reporter_id` e `moderator_id`, pois a interface não precisa dessas identidades. A nota do moderador nunca aparece na consulta do usuário.

## RPCs e idempotência

* `report_content(target_type, target_id, reason, description)` valida entrada e retorna a denúncia ativa já existente em chamadas equivalentes concorrentes.
* `get_my_content_reports()` retorna o histórico do usuário autenticado.
* `get_admin_content_reports(status, target_type, reason, limit, offset)` filtra e pagina por `created_at, id`, de modo determinístico, com limite máximo de 100.
* `moderate_content_report(report_id, status, moderator_note)` aceita `reviewing`, `resolved` ou `dismissed`, valida transições e bloqueia alterações finais.

Erros usam mensagens curtas e códigos PostgreSQL; o repository converte falhas em mensagens públicas sem registrar payloads.

## Arquitetura frontend

O fluxo é UI (`ReportContentDialog`, `MyContentReports`, `AdminReports`) → repository `contentReports` → RPC Supabase. Componentes não importam o cliente Supabase. O diálogo nas páginas de detalhes encaminha visitantes ao fluxo de autenticação; as rotas existentes continuam impondo MFA e consentimento legal. O modal possui labels, foco inicial, retorno de foco, Escape, contador, loading, feedback e bloqueio de duplo envio. “Outro” exige descrição.

Minha Conta mostra somente motivo, descrição pública, alvo, data e estado. A fila administrativa possui filtros, paginação, link para o conteúdo, nota interna, revisão e confirmação antes de resolver/descartar. Textos estão disponíveis em pt-BR e en-US.

## Testes e roteiro manual

`npm run test:sprint42` audita o contrato SQL, a fronteira do repository, integrações, validações e traduções. A fixture PostgreSQL valida objetos, RLS, grants, assinaturas e `search_path`; o pipeline aplica a migration no PostgreSQL isolado antes das assertions.

Roteiro manual: (1) entrar com MFA e consentimentos válidos; (2) denunciar problema e solução de terceiros; (3) confirmar idempotência e a seção Minha Conta; (4) entrar como administrador; (5) filtrar a fila, abrir o alvo, marcar em análise e finalizar com nota; (6) confirmar que a decisão final não pode ser alterada; (7) repetir como visitante, outro usuário e membro sem privilégio.

## Migration, deploy, riscos e fora do escopo

A migration é aditiva e transacional. O deploy deve aplicar `20260729140000_sprint42_content_reports.sql` pelo pipeline normal; não exige backfill e não deve ser aplicado manualmente. O principal risco é crescimento do histórico, mitigado por índices e paginação. Exclusão de perfil não remove denúncias porque os identificadores históricos não têm FK.

Comentários e denúncias de usuários estão fora do escopo. Também ficam fora ações automáticas de ocultação/remoção: resolver uma denúncia registra a decisão, mas a moderação do conteúdo continua sendo uma ação administrativa separada e auditável.
