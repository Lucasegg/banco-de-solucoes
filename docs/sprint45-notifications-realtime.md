# Sprint 45 — notificações em tempo real

## Arquitetura

O acesso permanece no `SupabaseNotificationRepository`. Uma assinatura testável e com ciclo de vida próprio recebe somente `INSERT` da tabela de sinais segura, filtrado pela conta autenticada; a RLS forçada continua sendo a autorização efetiva. Cada sinal contém apenas destinatário, identificador, ordem e tipo da mudança. O estado é sempre reconciliado pelas RPCs privadas da Sprint 44, preservando atribuição, deduplicação, `notification_order` e `read_at`.

Falhas ativam polling de 60 segundos apenas com a aba visível. Uma conexão recuperada cancela o timer e reconcilia o estado por RPC. Logout, troca de conta e desmontagem removem canal, listener e timer.

## Persistência e segurança

`notification_preferences` guarda somente as três categorias opcionais, com defaults ativos. Categorias críticas não são parâmetros e portanto não podem ser desligadas. RLS é habilitada e forçada; DML direto é revogado. RPCs `SECURITY DEFINER` usam `auth.uid()`, `search_path` fixo, validação e grants mínimos.

A limpeza explicitamente confirmada chama uma RPC atômica que exclui somente notificações da conta atual, lidas e com mais de 30 dias. Não existe tarefa automática.

## Testes e limitações

As assertions SQL verificam publicação, RLS, privilégios e contratos das RPCs. Os testes TypeScript cobrem merge, duplicidade, ordem, ciclo de vida, polling, traduções e regressões das Sprints 31 e 44. Esta sprint não inclui e-mail, web push, APIs nativas do navegador nem `pg_cron`.
