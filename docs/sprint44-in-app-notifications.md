# Sprint 44 — Central de notificações in-app

## Arquitetura e eventos

A Sprint 44 evolui a tabela `notifications` existente, sem reescrever migrations
aplicadas. `notification_order`, um `bigint GENERATED ALWAYS AS IDENTITY UNIQUE`, é o
cursor monotônico usado na ordenação. `event_key` é único e torna a criação idempotente;
`report_id` liga uma notificação à denúncia quando aplicável.

Triggers `AFTER` criam a notificação dentro da mesma transação do evento. Mudanças de
denúncia para `reviewing`, `resolved` ou `dismissed` avisam o denunciante. Inserções no
histórico imutável de moderação avisam o autor quando problema ou solução é arquivado ou
restaurado. Um rollback do evento também reverte a notificação.

## Segurança, privacidade e isolamento

A tabela tem RLS habilitada e forçada. `anon` não tem acesso; `authenticated` possui
somente `SELECT`, ainda limitado pela política `recipient_id = auth.uid()`. INSERT,
UPDATE e DELETE diretos permanecem revogados. Criação e mutação acontecem apenas por
funções internas ou RPCs `SECURITY DEFINER` com `search_path = pg_catalog, public`.

As quatro RPCs públicas nunca recebem `recipient_id`: identidade e isolamento derivam
exclusivamente de `auth.uid()`. Limite (1–50) e offset (0–10000) são validados no banco,
e consultas ordenam por `notification_order DESC`. A marcação individual inclui o
destinatário no predicado; a coletiva modifica somente as notificações da conta atual.

Notificações de moderação não persistem nem retornam identidade do moderador, identidade
do denunciante, motivo, notas internas ou metadata administrativa. Títulos e mensagens
são textos públicos genéricos. O `event_key` contém apenas identificadores técnicos do
evento e nunca é projetado pela RPC de leitura.

## Interface

A central autenticada existente em `/notifications` e seu sino no cabeçalho passam a
consumir as RPCs privadas da Sprint 44 pela camada `NotificationRepository`. Contador,
loading, vazio, erro, paginação, marcação individual/coletiva, foco visível e textos de
interface pt-BR/en-US continuam disponíveis. Destinos passam por uma allowlist; quando
um destino não existe ou não é seguro, a interface mostra o fallback de conteúdo
indisponível.

## Idempotência e limitações

`INSERT ... ON CONFLICT (event_key) DO NOTHING` garante uma linha por transição ou ação,
inclusive sob tentativas concorrentes. Na primeira versão não há e-mail, push, polling,
Realtime, preferências por evento, retenção automática nem payload administrativo. Os
textos persistidos para os novos eventos são genéricos, enquanto a apresentação troca
título e mensagem pelas traduções pt-BR ou en-US conforme o locale ativo. Migrations
exigem o Production Preflight normal antes do deploy.
