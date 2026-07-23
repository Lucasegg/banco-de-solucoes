# Sprint 31 — Central de notificações

## Escopo

A rota autenticada `/notifications` concentra notificações pessoais, com o alias legado
`/notificacoes` preservado. O sino só é renderizado para sessões autenticadas, anuncia o
total com `aria-live`, omite o badge em zero e apresenta `99+` para totais elevados.

As categorias visuais são **Contribuições** (`received`, `approved`, `rejected`,
`changes_requested`), **Comentários** (`created`, `replied`, `reacted`), **Favoritos**
(`content_updated`) e **Conta** (`role_changed`). A lista oferece todas, não lidas e
as quatro categorias, loading com skeleton, erro público, vazio, marcação individual e
coletiva e paginação incremental.

## Privacidade, RLS e RPCs

`notifications` continua com RLS de leitura `recipient_id = auth.uid()`. Anônimos não
recebem privilégios de tabela, e `authenticated` não possui INSERT, UPDATE ou DELETE
diretos. A criação permanece exclusiva de triggers/funções autorizadas; o frontend não
envia `recipient_id` nem usa service role.

Foram auditadas e reutilizadas `get_notifications`, `get_unread_notification_count`,
`mark_notification_read`, `mark_all_notifications_read` e `create_notification`.
`get_notifications` exige `auth.uid()`, filtra o destinatário no servidor e só retorna
metadata pública permitida (identificadores de conteúdo, ator, status e categoria).
Os grants da RPC de leitura são revogados de `PUBLIC` e `anon`, e concedidos somente a
`authenticated`.

## Paginação, deduplicação e metadata

A RPC aceita uma categoria limitada, o filtro de não lidas, `limit` normalizado entre 1
e 50 (padrão 20) e `offset` não negativo. A ordenação é `created_at DESC, id DESC`.
Não há filtragem de lista completa no navegador.

Não foi criada chave de deduplicação: os triggers existentes já evitam autoaviso por meio
de `create_notification`, que descarta ator igual ao destinatário; o fluxo de revisão da
Sprint 30 substituiu o trigger antigo, evitando um segundo aviso de aprovação. Uma chave
baseada em timestamp não impediria duplicação e não foi introduzida.

Metadata sensível não é retornada ao cliente. A migration mantém o limite e a validação
jsonb existentes e a RPC projeta somente chaves públicas permitidas.

## Navegação e UX

Antes de navegar, a notificação é marcada como lida. URLs só podem ser rotas internas
conhecidas para problemas, soluções, contribuições ou perfil; URLs externas, `data:`,
`javascript:`, caminhos administrativos e caminhos malformados são rejeitados. Sem
destino válido, a interface mantém os detalhes da notificação sem quebrar a página.

Os controles possuem foco visível, labels acessíveis, indicador textual “Não lida” e
prevenção de operação duplicada. Mensagens públicas não expõem infraestrutura.

## Migration e validação

`20260723110000_sprint31_notifications.sql` é aditiva e transacional. Ela não altera
migrations aplicadas, não remove dados e não modifica o pipeline. A assinatura existente
da RPC foi confirmada no schema de Sprint 23/26 e preservada com justificativa fixa.

Limitações conhecidas: não há polling; o contador é atualizado de forma otimista após as
ações do usuário e é carregado na sessão. Como esta entrega inclui migration, o Production
preflight é obrigatório antes de merge. Ele permanece pendente neste ambiente, que não tem
remoto Git configurado nem GitHub CLI para disparar o workflow manual.
