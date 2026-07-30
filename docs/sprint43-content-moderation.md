# Sprint 43 — moderação administrativa de conteúdo

## Objetivo e modelo de auditoria
Administradores podem arquivar e restaurar problemas e soluções sem exclusão física. Cada decisão cria uma linha append-only em `content_moderation_actions`, com alvo polimórfico, denúncia opcional, moderador obtido da sessão, motivo, nota, estados anterior/resultante e data. `action_order` é uma identity monotônica gerada exclusivamente pelo banco e usada internamente para decisões de integridade e ordenação determinística; o UUID continua sendo o identificador público e a sequência não é exposta ao frontend. Alvo e denúncia não têm FK deliberadamente: a evidência sobrevive à indisponibilidade futura desses registros.

## Ações, transições e denúncias
`archive` bloqueia o registro com `SELECT ... FOR UPDATE`, captura o status no servidor e aplica `Arquivado` (problema) ou `Arquivada` (solução). Conteúdo já arquivado é recusado. `restore` só parte do estado arquivado e recupera o status da última ação geral, selecionada por `action_order DESC`; essa ação precisa ser um arquivamento válido. O cliente nunca envia status. Alteração e auditoria pertencem à mesma transação. `report_id` é opcional e, quando presente, deve apontar exatamente para o alvo. Arquivar/restaurar jamais resolve ou descarta a denúncia: essas decisões continuam explícitas nas RPCs da Sprint 42.

## Segurança e contratos RPC
A tabela tem RLS habilitada e forçada, nenhuma policy e DML revogado de `anon` e `authenticated`. Um trigger impede UPDATE/DELETE inclusive em caminhos privilegiados. `moderate_reported_content` e `get_content_moderation_history` são `SECURITY DEFINER`, fixam `search_path = pg_catalog, public`, exigem `auth.uid()` e `public.is_admin()`. A identidade do moderador não é parâmetro nem integra o retorno do histórico.

A RPC de ação aceita tipo, UUID do alvo, ação, motivo (1–500), nota opcional (até 2.000) e UUID opcional da denúncia. Retorna somente identidade da ação/alvo, ação, transição e data. Na restauração, a última ação do alvo precisa ser `archive`, produzir o status arquivado atual e guardar um estado anterior válido; uma ação `restore` anterior nunca pode ser reutilizada. `now()` é constante durante a transação e UUID aleatório não expressa precedência, portanto nenhum dos dois participa da decisão. A RPC de histórico aceita tipo/alvo e retorna ações em ordem determinística por `action_order ASC`, sem expor `action_order` ou `moderator_id`. O índice global por `created_at` permanece para consultas operacionais por intervalo de tempo, não para precedência. A RPC `get_content_moderation_state` consulta `problems` ou `solutions` e entrega o `current_status` real somente a administradores.

## Fluxo frontend
`AdminReports` abre o conteúdo original e incorpora o painel de moderação. A UI chama somente `AdminModerationRepository`, que chama as RPCs e rejeita listas, singletons ou campos parciais inválidos. O botão usa exclusivamente o `current_status` retornado pelo servidor; ações antigas do histórico não controlam o estado atual. O diálogo nativo exige confirmação e motivo, aceita nota, move foco para o motivo, suporta teclado/Escape e bloqueia duplo envio. O estado e o histórico são recarregados após sucesso, enquanto o estado da denúncia permanece separado.

## Migration e deploy
A migration aditiva `20260730120000_sprint43_content_moderation.sql` é posterior à Sprint 42, transacional e não altera histórico aplicado. Ela consta da lista de migrations pendentes. O workflow aplica a migration no PostgreSQL isolado depois das assertions da Sprint 42 e executa a fixture específica da Sprint 43. Não há backfill, marcação manual nem aplicação em produção fora do pipeline.

## Riscos
A associação polimórfica não usa FK por requisito de retenção, portanto a RPC é a responsável pela integridade. Conteúdo arquivado antes desta migration não possui status anterior auditado e, corretamente, não pode ser restaurado por esta RPC. O lock por linha serializa ações concorrentes, mas integrações administrativas externas também devem usar a RPC.

## Teste manual
1. Entrar como administrador e abrir a fila de denúncias.
2. Abrir o alvo e voltar à fila.
3. Arquivar com motivo e nota; confirmar feedback, status arquivado e item no histórico.
4. Confirmar que a denúncia não mudou de estado.
5. Restaurar e confirmar o status anterior exato e a segunda ação cronológica.
6. Tentar duplo clique, motivo vazio e Escape no diálogo.
7. Repetir para problema e solução e confirmar bloqueio para conta comum.

## Fora de escopo
Exclusão física, resolução automática de denúncias, restauração de conteúdo arquivado sem ação auditada da Sprint 43, exposição pública do histórico e armazenamento de tokens, IPs ou dados de sessão.
