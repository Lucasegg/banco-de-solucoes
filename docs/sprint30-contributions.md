# Sprint 30 — Contribuições colaborativas com autoria e moderação

## Autoria e permissões

Problemas e soluções continuam editáveis e excluíveis exclusivamente por seu autor. Pessoas autenticadas podem enviar contribuições para conteúdo de terceiros; visitantes podem consultar o conteúdo e seu histórico público, mas não criar contribuições. A interface centraliza essas verificações em `src/lib/authorship.ts`, e o banco aplica a decisão definitiva com RLS e RPCs.

Uma contribuição pertence permanentemente ao seu criador. O autor pode editar ou retirar uma contribuição em `pending` ou `changes_requested`; uma aprovação bloqueia alterações silenciosas. Curadores e administradores revisam, mas não passam a ser autores.

## Estados e moderação

Os estados técnicos estáveis são `pending`, `changes_requested`, `approved`, `rejected` e `withdrawn`; a interface apresenta os respectivos rótulos em português. A revisão é feita pela RPC transacional `review_contribution`: aprovação aplica apenas campos permitidos, mantém o autor do conteúdo principal e grava a decisão. Rejeições e pedidos de ajustes exigem justificativa. A retirada usa a RPC `withdraw_contribution`.

## Auditoria, notificações e histórico

Ações de criação, edição, retirada e decisões são registradas em `contribution_audit`, incluindo ator, motivo quando aplicável e snapshots de payload. O histórico público continua restrito a contribuições revisadas e não mostra notas internas. Notificações cobrem recebimento, aprovação, rejeição, pedido de ajustes e aprovação para o autor do conteúdo; a criação ocorre no mesmo fluxo transacional para evitar duplicação.

## Segurança

A migration `20260723100000_sprint30_collaborative_contributions.sql` atualiza os constraints de domínio, RLS de alterações autorais, auditoria e grants. `anon` não recebe grants para RPCs mutáveis. As RPCs validam sessão, papel de moderador, entradas e estado antes de modificar dados. O frontend não usa service role e suas mensagens são públicas e neutras.

## UX e limitações

As páginas de detalhes destacam **Contribuir** e preservam a rota hash ao enviar visitantes ao login. “Minhas contribuições” permite filtrar, abrir o conteúdo e retirar propostas editáveis. A tela administrativa existente reúne as revisões; filtros completos de período/autor e paginação no servidor permanecem uma evolução futura. Anexos reutilizam somente o upload já seguro para imagens; não foi criada nova infraestrutura de upload.

## Ajuste de segurança da PR #60

A retirada nunca remove a linha: ela é exclusivamente a RPC `withdraw_contribution`, que muda o estado para `withdrawn` e aciona a auditoria existente. Não há policy, grant ou método de repository para `DELETE` de contribuições. Atualizações diretas são limitadas ao payload do próprio autor; campos de moderação e transições de estado são bloqueados por RLS e trigger, sendo efetuados apenas por `review_contribution`.

A revisão valida a estrutura integral do payload, chaves permitidas, mudanças, campos permitidos por alvo e o tipo de cada `proposedValue` antes de aplicar qualquer alteração. A migration também normaliza aliases conhecidos e qualquer valor legado desconhecido antes de recriar constraints. O teste `npm run test:sprint30` cobre esses contratos estáticos de retirada, moderação, validação e normalização.
