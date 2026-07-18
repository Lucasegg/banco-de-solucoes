# Banco de Soluções

Banco de Soluções é uma plataforma open source para conectar problemas reais a soluções reutilizáveis, pessoas, empresas e projetos. A visão é construir uma base mundial de conhecimento colaborativo, onde desafios possam ser descritos com contexto, soluções possam ser comparadas por impacto e comunidades possam se organizar em torno da execução.

## Visão do produto

A visão completa do Banco de Soluções está documentada em [VISION.md](VISION.md), incluindo o papel das contribuições na preservação de conhecimento e na evolução de soluções aplicáveis.

## Objetivos

- Mapear problemas relevantes de forma estruturada.
- Catalogar soluções existentes, experimentais e propostas.
- Conectar pessoas, empresas e projetos por área de atuação.
- Incentivar colaboração aberta, documentação clara e evolução contínua.
- Preparar uma base técnica simples para evoluir com backend, autenticação e dados reais.

## Stack da Fase 1

- React
- TypeScript
- Vite
- TailwindCSS
- Catálogo persistido no Supabase com proveniência
- GitHub Actions
- GitHub Pages

## Páginas implementadas

- Home
- Explorar Problemas
- Explorar Soluções
- Detalhes do Problema
- Detalhes da Solução
- Cadastrar Problema
- Cadastrar Solução
- Sobre

## Como executar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

O artefato final é gerado em `dist/`.

## Deploy

O domínio oficial e canônico é **https://www.bancodesolucoes.com.br/**. O projeto continua usando GitHub Actions e GitHub Pages como infraestrutura de publicação; a antiga URL `lucasegg.github.io/banco-de-solucoes/` é somente uma compatibilidade técnica temporária e não deve ser divulgada aos usuários.

O build usa a raiz `/`, copia `public/CNAME` para `dist/CNAME` e é publicado em pushes para `main`. No GitHub Pages, selecione **GitHub Actions** como origem, configure o domínio personalizado `www.bancodesolucoes.com.br` e habilite HTTPS. No Registro.br, aponte o DNS de `www` para o host do GitHub Pages conforme a documentação vigente do GitHub e redirecione o domínio sem `www` para o oficial. Não configure um path de projeto como base.

## Estrutura principal

```text
src/
  components/      Componentes reutilizáveis
  lib/             Preparação para integrações futuras
  pages/           Páginas da aplicação
  types/           Tipos compartilhados
```

## Integração futura com Supabase

A integração ainda não está ativa para dados da aplicação. A infraestrutura inicial está documentada em [SUPABASE.md](SUPABASE.md), incluindo client, adapter, provider, diagnósticos, RLS, Auth, Storage e plano de migração futura. A rota `#/diagnostics` exibe o status atual sem substituir o `LocalStorageAdapter`.

## Como contribuir

Leia o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para entender o fluxo de contribuição, padrões de código e critérios para propostas.

## Licença

Este projeto é open source. A licença definitiva será definida antes da primeira versão pública estável.

## Decisões de arquitetura

As decisões sobre hash routing, persistência local, autorização no domínio, relação entre moderação/discussões/contribuições e limitações de segurança local estão documentadas em [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md).

## Sprint 13 — Supabase Auth e profiles

A aplicação usa Supabase Auth para autenticação, sessão e perfis quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas. Sem essas variáveis, o build continua válido e a interface mostra estado de Supabase não configurado.

- Cadastro: `signUp` envia apenas dados públicos editáveis; a confirmação de e-mail pode deixar a sessão nula até o usuário confirmar.
- Profile: a tabela `public.profiles` é criada por migration SQL e preenchida automaticamente por trigger em `auth.users`.
- Campos editáveis pelo formulário comum: `username`, `display_name`, `country`, `bio` e `avatar_url`; `role` não é editável pelo cliente.
- GitHub Actions: o build recebe `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de secrets, mas pull requests sem secrets continuam compilando.
- Problemas e soluções são lidos do Supabase; a ausência de configuração não ativa catálogo demonstrativo.
- Limitações: permissões administrativas críticas em Supabase precisarão de claims confiáveis ou backend seguro em sprint posterior.

Consulte `SUPABASE.md` para aplicar e verificar manualmente a migração pelo SQL Editor.

## Sprint 17 — Autenticação social OAuth

A aplicação mantém e-mail/senha e adiciona login/cadastro social via Supabase Auth para Google, GitHub e Microsoft/Azure. O frontend usa apenas a anon key já existente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`), não usa service role, não armazena tokens manualmente e configura o Supabase Auth com PKCE explícito (`flowType: pkce`) e `detectSessionInUrl: false` para manter o callback sob controle da aplicação.

### URLs de callback e redirects

O OAuth é centralizado no domínio oficial, preserva o hash de retorno e troca uma única vez o parâmetro `code` por sessão antes de limpar todos os parâmetros do callback:

- Site URL no Supabase: `https://www.bancodesolucoes.com.br/`
- Redirect URL permitida no Supabase: `https://www.bancodesolucoes.com.br/`
- Redirect URL permitida no Supabase para callback OAuth: `https://www.bancodesolucoes.com.br/?oauth=callback`
- Desenvolvimento local: cadastre também `http://localhost:5173/` e `http://localhost:5173/?oauth=callback`

Durante a transição, mantenha temporariamente no allowlist do Supabase o callback legado já cadastrado, apenas para concluir tentativas iniciadas antes do deploy. O frontend nunca o gera para uma nova tentativa. Remova-o após a janela de transição. Origens diferentes de localhost, domínio oficial (com ou sem `www`) e host legado não são aceitas pelo consumidor de callback.

Nos provedores externos, use a Callback URL do próprio Supabase Auth, no formato:

```text
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

### Providers configurados

- Google: habilite o provider Google no Supabase Auth e cadastre a callback do Supabase no OAuth Client do Google Cloud. Configure as origens autorizadas com o domínio oficial. Escopos solicitados: `openid email profile`.
- GitHub: habilite o provider GitHub no Supabase Auth e cadastre a callback do Supabase no GitHub OAuth App; use o domínio oficial na Homepage URL. Escopos solicitados: `read:user user:email`; não há solicitação de acesso a repositórios.
- Microsoft/Azure: habilite o provider `azure` no Supabase Auth e cadastre a callback do Supabase no Microsoft Entra ID; use o domínio oficial nas configurações web aplicáveis. Escopos solicitados: `openid email profile`; não há solicitação de calendário, arquivos ou contatos.

### Migration de perfis

A migration da Sprint 17 atualiza a função `handle_new_auth_user_profile` para perfis criados por identidades sociais. Ela gera `username` inicial seguro e único, preenche `display_name` e `avatar_url` somente como valores iniciais quando o provedor envia metadados confiáveis, mantém `role` sempre como `member` e não sobrescreve campos já editados pelo usuário em logins posteriores.

### Limitações conhecidas

Não há vinculação manual de contas nesta sprint. Se um e-mail já existir com e-mail/senha ou outra identidade, o comportamento seguro depende das regras do Supabase Auth e o frontend apenas mostra uma mensagem explicativa; contas não são mescladas no cliente.

## Sprint 18 — Recuperação de senha por link

O fluxo real é: **e-mail → link padrão do Supabase → retorno à aplicação → nova senha → logout → login**. A solicitação usa `resetPasswordForEmail(email, { redirectTo })`; no retorno PKCE, a aplicação identifica exclusivamente `?recovery=callback`, troca o `code` uma única vez com `exchangeCodeForSession`, reconhece a sessão como recuperação e abre `#/password-recovery`. A senha é alterada com `updateUser({ password })` e a sessão temporária é encerrada com `signOut({ scope: 'local' })`. Nenhum parâmetro do link, código PKCE, access token ou refresh token é armazenado manualmente.

### Redirect URL obrigatória

O template padrão de recuperação por link do Supabase deve ser mantido sem alteração. No Dashboard, acesse **Authentication → URL Configuration → Redirect URLs** e autorize exatamente:

- produção: `https://www.bancodesolucoes.com.br/?recovery=callback`;
- desenvolvimento: `http://localhost:5173/?recovery=callback` (e a origem/porta efetivamente usada pelo Vite, se diferente).

Os parâmetros PKCE precisam chegar antes do hash router; por isso `redirectTo` aponta para a query estável `?recovery=callback`. Depois de processar e limpar o callback, o frontend navega para `#/password-recovery`. Não use o endereço legado do GitHub Pages como destino principal.

Em **Authentication → URL Configuration**, configure:

- Site URL: `https://www.bancodesolucoes.com.br/`;
- Redirect URL de recuperação: `https://www.bancodesolucoes.com.br/?recovery=callback`;
- desenvolvimento: `http://localhost:5173/` (e a porta efetivamente usada pelo Vite, se diferente).

Em **Authentication → Rate Limits**, defina limites compatíveis com o produto para envio de e-mails. A validade real do link pertence ao Supabase e não é representada pelo cooldown da interface.

O provedor de e-mail padrão do Supabase possui limites baixos e pode aplicar rate limit no envio ou reenvio. A aplicação mostra esse erro técnico com mensagem pública apropriada, sem convertê-lo em sucesso e sem revelar se o e-mail pertence a uma conta. Este fluxo não exige SMTP próprio nem alteração do template padrão.

### Comportamento e limitações

- A resposta de envio é neutra para não revelar se a conta existe. Links inválidos, expirados, utilizados ou malformados recebem a mesma mensagem pública e seus parâmetros são removidos da URL.
- Ao concluir, a sessão temporária é encerrada antes do retorno a `#/login`; não há login automático nem alteração ou remoção de fatores MFA. Ao cancelar, somente uma sessão marcada como recuperação é encerrada, preservando sessões normais.
- O cooldown visual de reenvio é de **90 segundos** e usa um timestamp absoluto em `sessionStorage`, portanto sobrevive a reload sem recomeçar indevidamente. Ele limita apenas o botão da interface e **não** representa a validade do link. Somente o e-mail, a confirmação de solicitação, o timestamp e um marcador booleano de recuperação ativa podem ser restaurados; senha e parâmetros/tokens do callback nunca são armazenados manualmente.
- O listener central trata `PASSWORD_RECOVERY` e também `SIGNED_IN` durante um callback já marcado como recuperação sem carregar perfil, executar MFA ou liberar rotas protegidas. O callback OAuth possui marcador diferente (`?oauth=callback`) e somente um handler troca cada código por sessão.
- A confirmação de que a senha antiga deixou de funcionar e a nova funciona exige teste integrado contra um projeto Supabase configurado e uma caixa de e-mail real.

## Sprint 19 — Autenticação multifator TOTP

A autenticação em dois fatores é opcional e usa exclusivamente os fatores TOTP do Supabase Auth. A UI chama o `AuthContext`, que centraliza estado e proteção de acesso; o contexto chama `MfaRepository`, e somente o repositório usa `auth.mfa.listFactors`, `enroll`, `challengeAndVerify`, `unenroll` e `getAuthenticatorAssuranceLevel`. Nenhum secret, código, desafio ou token é gravado pela aplicação, e não existe migration: fatores pertencem ao Supabase Auth.

### Configuração manual no Supabase

No Dashboard do projeto, acesse **Authentication → Multi-Factor Authentication** e habilite enrollment e verification de **TOTP**. Confira no Dashboard os limites de MFA do plano contratado, pois eles podem mudar. A sessão persistida pelo SDK volta inicialmente no nível primário; quando há fator TOTP verificado e o próximo nível é o reforçado, a aplicação bloqueia perfil e demais rotas protegidas até o desafio. Enrollment cria o fator e entrega QR/secret; challenge confirma a posse do autenticador e eleva a sessão. Fatores incompletos não bloqueiam login e são removidos antes de uma nova configuração; fatores verificados nunca são removidos automaticamente. Se existirem vários, a interface seleciona deterministicamente o TOTP verificado mais antigo e gerencia apenas esse fator nesta sprint.

Recuperação de senha e MFA são proteções diferentes: redefinir a senha pode não remover fatores MFA. Em caso de perda do autenticador, a remoção administrativa deve seguir um procedimento de suporte seguro, com verificação de identidade e API administrativa executada somente em backend confiável. Nunca exponha a `service_role` no frontend. A disponibilidade, os limites e as políticas definitivas devem ser validados no projeto Supabase antes da publicação.

## Sprint 20 — Comentários, reações e favoritos

A Sprint 20 leva as interações de problemas e soluções ao Supabase, preservando o fluxo **UI → hooks → repositories → Supabase**. Componentes não importam o cliente de banco. A migration versionada `20260717120000_sprint20_interactions.sql` complementa as entregas parciais anteriores de comentários e favoritos e cria as reações.

### Banco de dados e segurança

- `comments`: autoria vinculada diretamente a `auth.users`, alvo exclusivo entre problema e solução, texto com 1 a 2.000 caracteres após `trim` e timestamps. A leitura é pública; INSERT exige `user_id = auth.uid()` e somente o autor pode atualizar ou excluir. Um segundo vínculo com `profiles` permite obter nome e avatar na mesma consulta, sem N+1.
- `reactions`: aceita somente `useful`, `liked` e `interesting`, com exatamente um alvo. Índices únicos parciais impedem que o mesmo usuário repita uma reação no mesmo item. O `user_id` possui default `auth.uid()` e as policies permitem ao usuário autenticado ler, criar e excluir somente as próprias linhas; UPDATE não é permitido.
- `get_reaction_summary`: RPC pública que retorna apenas contagens agregadas e, quando há sessão, os tipos selecionados pelo usuário atual. Ela não expõe a lista de usuários que reagiram.
- `favorites`: alvo exclusivo, chaves únicas parciais e vínculo direto a `auth.users`. SELECT, INSERT e DELETE são restritos ao proprietário; favoritos são imutáveis e não possuem policy UPDATE.
- As três tabelas usam RLS. Exclusões de usuário, problema ou solução usam `ON DELETE CASCADE`, evitando interações órfãs.

### Interface

Comentários aparecem nos detalhes de problemas e soluções com nome, avatar disponível, data, conteúdo e indicação de edição. Usuários autenticados podem criar, editar e excluir apenas os próprios comentários; envios vazios e acima de 2.000 caracteres são bloqueados, assim como cliques concorrentes. Não há respostas encadeadas nesta sprint.

Os detalhes exibem **Útil**, **Gostei** e **Interessante**, com contagem pública e estado individual imediato. O toggle usa atualização otimista com rollback em erro. Favoritos estão nos cards e detalhes e são separados em problemas e soluções na área privada **Meus Favoritos**, onde também podem ser removidos.

Visitantes podem ler comentários e contagens. Tentativas de comentar, reagir ou favoritar exibem uma mensagem simples solicitando login e não enviam escrita anônima.

### Limitações conhecidas

- A validação integrada de RLS e persistência requer um projeto Supabase com todas as migrations aplicadas e ao menos duas contas de teste.
- Contagens mudadas por outra sessão aparecem após recarregar a página; realtime não faz parte desta sprint.
- Comentários não possuem respostas, moderação ou denúncias nesta entrega. Funcionalidades da Sprint 21 não estão incluídas.

### Roteiro de teste manual

1. Aplique as migrations em um projeto Supabase e abra um problema e uma solução sem sessão; confirme comentários e contagens visíveis e mensagens de login nas ações.
2. Entre com a conta A, crie um comentário com espaços nas extremidades, edite-o, recarregue e depois exclua-o. Confirme nome, avatar, data e marcador `editado`.
3. Com a conta B, confirme que as ações de editar/excluir do comentário da conta A não aparecem e que uma alteração direta é recusada pela RLS.
4. Na conta A, adicione e remova cada reação; clique duas vezes rapidamente, recarregue e confirme contagens, seleção persistida e ausência de duplicatas.
5. Favorite e desfavorite cards e detalhes de problemas e soluções. Confira as duas seções em **Meus Favoritos** e remova itens diretamente nessa tela.
6. Entre com a conta B e confirme que os favoritos da conta A não aparecem nem podem ser consultados; volte à conta A e confirme persistência após reload.

## Sprint 21 — Contribuições e Moderação

A Sprint 21 implementa propostas moderadas para problemas e soluções no fluxo **UI → hooks → repositories → Supabase**. O botão **Contribuir** abre um formulário com título opcional, descrição, resumo, referências, imagem de apoio e alterações estruturadas. O envio cria somente uma linha `pending`; o conteúdo publicado não é atualizado pelo navegador.

A migration `20260717160000_sprint21_contributions.sql` cria `contributions` e `contribution_audit`, valida alvo exclusivo, payload não vazio e os quatro status permitidos, adiciona índices e ativa RLS. Pessoas autenticadas inserem e consultam apenas suas propostas; curadores e administradores consultam a fila. Aprovação e rejeição usam a RPC transacional `review_contribution`: ela bloqueia a linha, valida campos permitidos, aplica alterações aprovadas ao alvo, preenche revisor/data e grava a auditoria na mesma transação. Rejeições exigem motivo e nunca alteram o conteúdo principal.

A área **Minhas contribuições** oferece filtros de pendentes, aprovadas e rejeitadas, com alvo, data e status. O painel administrativo permite pesquisar, filtrar, abrir a comparação entre conteúdo atual e proposto, aprovar ou rejeitar. A política de moderador é derivada do papel persistido em `profiles` (`curator` ou `admin`); nenhuma credencial privilegiada é exposta no frontend.

Os detalhes de cada problema e solução exibem um histórico público sanitizado com somente contribuições aprovadas ou rejeitadas, incluindo autor, avatar disponível, data, status e resumo. Esse histórico público é disponibilizado exclusivamente pela função `get_contribution_history`; sessões anônimas não possuem policy de `SELECT` direto em `contributions`. Na tabela, usuários autenticados leem somente as próprias linhas e curadores ou administradores leem todas. Propostas `pending` e `reviewing` continuam visíveis apenas ao próprio autor em **Minhas contribuições** e aos moderadores no Admin. Autores e moderadores são carregados junto das contribuições por relacionamentos explícitos com `profiles`, sem consultas N+1. A aba administrativa de histórico também consulta `contribution_audit` no Supabase, portanto decisões permanecem disponíveis após reload e entre navegadores sem substituir o histórico legado da moderação de comentários.

### Validação manual

1. Aplique todas as migrations e entre como membro; envie contribuições para um problema e uma solução e confirme que ambos permanecem inalterados.
2. Confirme que esse membro vê somente suas contribuições e que uma sessão anônima não consulta as tabelas de moderação.
3. Entre como curador ou administrador, pesquise a fila, abra a comparação e rejeite uma proposta com motivo; confirme o conteúdo original e a auditoria.
4. Aprove outra proposta; confirme conteúdo, `approved`, `moderator_id`, `reviewed_at` e a linha correspondente em `contribution_audit`.
5. Tente inserir payload vazio, alvo duplo/ausente e status fora da lista; confirme a rejeição pelo banco.

## Sprint 22 — Segurança, Auditoria e Observabilidade

A migration `20260717190000_sprint22_security_audit.sql` cria `audit_events`, uma trilha append-only com tipos controlados, metadata JSON limitada a 4 KiB e bloqueio explícito de chaves associadas a senhas, tokens, sessões, segredos MFA, chaves de API e credenciais. Não há policy nem privilégio de `UPDATE` ou `DELETE`; `INSERT` direto também é negado. Os índices cobrem data, evento, ator e alvo. A RLS permite leitura somente a administradores, e a consulta administrativa paginada passa por RPC, trazendo o nome do ator no mesmo acesso para evitar N+1.

São registrados transacionalmente eventos de criação, alteração e exclusão de problemas/soluções, aprovação/rejeição de contribuições, moderação de comentários e alteração de papéis. Os tipos de autenticação e MFA estão reservados na lista controlada, mas **não são falsamente gravados pelo frontend**: login/logout não possuem uma transação de banco confiável comum à operação do Supabase Auth, e segredos/códigos MFA jamais são enviados à auditoria. Tentativas não autorizadas também só devem ser gravadas por uma fronteira confiável; a falha de uma transação não pode persistir uma linha na mesma transação abortada.

Os helpers `has_role`, `is_admin`, `can_review_contributions` e `can_moderate_comments` centralizam autorização no banco. `update_user_role` bloqueia não administradores, aceita somente papéis conhecidos, trava a linha do perfil e impede a remoção do último administrador. A mudança e os valores anterior/novo são auditados na mesma transação. A aba **Papéis** usa uma RPC que lista perfis em lote, enquanto **Auditoria** oferece evento, alvo, ator, período, busca, ordenação e páginas de 50 itens; UUIDs aparecem apenas abreviados como referência secundária.

Os limites contra abuso incluem comentário não vazio com até 2.000 caracteres; contribuição de até 16 KiB, 1–20 mudanças sem campos duplicados, no máximo 10 referências, 5 imagens e 20 contribuições pendentes por autor; mudanças também exigem objeto, campo não vazio e `proposedValue`. Restrições sobre dados preexistentes são criadas `NOT VALID` para não reescrever migrations mescladas e devem ser validadas após saneamento. Erros do banco são mapeados por código para mensagens públicas e não exibem SQL, stack trace nem detalhes do Supabase.

### Roteiro manual

1. Aplique todas as migrations; como membro, confirme que `SELECT/INSERT/UPDATE/DELETE` direto em `audit_events` falha e que `update_user_role` é negada.
2. Como admin, altere um papel e confirme evento com ator/nome e valores anterior/novo. Tente remover o único admin e confirme a recusa.
3. Crie/edite/exclua problema ou solução e revise uma contribuição; confira um evento por operação e ausência de conteúdo sensível.
4. Teste os filtros e paginação da aba Auditoria e confirme que curador, moderador e anônimo não a consultam.
5. Envie comentários vazios/acima do limite e contribuições grandes, duplicadas ou além do teto pendente; confirme mensagens sanitizadas.

Limitações reais: eventos de Auth/MFA não são persistidos sem um hook/backend confiável do Supabase Auth; a migration não altera recuperação de senha, OAuth ou o comportamento MFA existente. Não há rate limiter externo nem exportação/retenção de logs nesta sprint. A verificação integrada de policies exige um projeto Supabase e contas com papéis distintos.

## Sprint 23 — Notificações e Central de Atividades

A Sprint 23 adiciona uma central interna, sem e-mail, push ou integrações externas. A tabela `notifications` mantém os UUIDs históricos sem foreign keys para perfil ou conteúdo, restringe título/mensagem, metadata a um objeto de até 4 KiB sem chaves sensíveis e `action_url` a caminhos internos. Os tipos permitidos são `contribution.approved`, `contribution.rejected`, `comment.created`, `comment.replied`, `comment.reacted`, `favorite.content_updated` e `user.role_changed`.

RLS permite que uma pessoa autenticada selecione somente linhas em que `recipient_id = auth.uid()`. `anon` não possui privilégios e `INSERT`, `UPDATE` e `DELETE` são revogados de clientes autenticados; nem administradores recebem leitura global. A função interna `create_notification` é `SECURITY DEFINER`, tem `search_path` fixo e não pode ser executada por clientes. As RPCs concedidas a `authenticated` são `get_notifications` (filtros e limite de 1–100), `get_unread_notification_count`, `mark_notification_read` e `mark_all_notifications_read`; elas derivam o destinatário exclusivamente de `auth.uid()` e não retornam `recipient_id`.

Triggers transacionais notificam a decisão de uma contribuição, comentários e respostas sem auto-notificação ou duplicação entre autor do conteúdo e do comentário pai, atualizações relevantes de favoritos e mudanças de papel. A função de alteração de papel continua gravando auditoria e agora cria a notificação na mesma transação. Atualizações de favoritos consideram somente campos visíveis (`title`, `summary`, `description`, `status` e `tags`), ignorando timestamps e contadores. O esquema atual não persiste reações de comentários (a barra legada é somente local e não está conectada à interface); portanto `comment.reacted` fica reservado no contrato e a geração transacional desse evento depende da futura persistência dessas reações. Não foi criada uma tabela paralela insegura nesta sprint.

No frontend, o sino autenticado mostra até cinco registros, badge limitado visualmente a `99+`, estados de foco, indicador de não lida e link interno compatível com o roteamento por hash. A rota protegida `#/notificacoes` oferece filtro por tipo, somente não lidas, carregamento incremental e ações idempotentes. O hook acessa apenas o repository, cancela atualizações após desmontagem e não consulta quando não há sessão.

### Roteiro manual da Sprint 23

1. Aprove e rejeite contribuições e confirme uma notificação por mudança real de status, sem duplicação em outro update.
2. Com duas contas, comente conteúdo alheio, comente conteúdo próprio e responda um comentário; confirme destinatário, supressão da auto-notificação e preferência por `comment.replied`.
3. Altere um papel como administrador e confirme auditoria e notificação juntas, com o papel em português e sem UUID na mensagem.
4. Favorite um item com a conta A e altere um campo visível com a conta B; confirme a notificação. Altere apenas contador/timestamp e confirme que nada é criado.
5. Confirme que A não lê nem marca registros de B, que escrita/remoção direta na tabela falha e que admin não possui bypass pessoal.
6. Marque uma e depois todas como lidas; confira lista, contador, badge, estados vazios e idempotência após recarregar.
7. Teste sino e página em desktop/mobile, navegação por teclado e links internos sob `HashRouter`.
8. Remova perfil ou conteúdo em ambiente de teste e confirme que a linha histórica permanece (sem foreign keys).

Notificações antigas poderão ser arquivadas ou removidas em sprint futura; não há cron job nesta entrega. A validação completa de RLS e triggers requer aplicar as migrations a um projeto Supabase e usar ao menos duas contas. Reações persistentes de comentários são a limitação conhecida descrita acima.

## Política de dados reais e proveniência

A interface pública apresenta somente registros criados por pessoas autenticadas, importações controladas de fontes públicas verificáveis ou um estado vazio explícito. O catálogo não usa exemplos, números gerados, perfis simulados nem restaura dados demonstrativos pelo navegador. Se o Supabase não estiver configurado, a aplicação informa que o catálogo está indisponível em vez de substituí-lo por conteúdo local.

### Autoria e fonte externa

O **autor** é uma pessoa autenticada que publicou um registro na plataforma. Uma **fonte externa** é apenas a origem documental de uma importação: o órgão, portal ou entidade responsável pela publicação não recebe conta, perfil ou autoria no Banco de Soluções. Importações são identificadas por “Registro criado a partir de informação pública” e “Fonte externa verificada”, com nome, URL HTTPS, data da publicação quando conhecida, acesso e última verificação.

Uma fonte é considerada verificável quando tem responsável identificável, endereço HTTPS acessível, data ou contexto de publicação rastreável e conteúdo suficiente para sustentar o resumo autoral. A revisão confirma que a publicação suporta o relato; ela **não comprova necessariamente que o problema permanece no mesmo estado atualmente**. Relatos de portais participativos são qualificados como relatos ou propostas, e não como diagnóstico técnico definitivo.

### Imagens e métricas

Importações iniciais não têm fotografia. Não se usa banco de imagens para representar um local real. Uma imagem futura precisa vir da publicação com uso/hotlink apropriado, ser armazenada com licença e atribuição compatíveis ou estar explicitamente marcada como ilustração. Visualizações, curtidas e comentários pertencem exclusivamente ao Banco de Soluções e começam em zero; métricas, custos, resultados, beneficiários, maturidade e implementação externos não são inferidos.

### Revisão periódica de fontes

1. Abrir a URL original e confirmar HTTPS, responsável e aderência do resumo.
2. Registrar a data em `source_verified_at` e atualizar `source_accessed_at` quando houver novo acesso editorial.
3. Preservar a chave `external_source_key`; não trocar a importação por um registro de usuário.
4. Se a página sair do ar ou mudar de sentido, manter o histórico, sinalizar a limitação e submeter a correção editorial; nunca inventar uma substituição.
5. Verificar se metadados continuam pequenos, estritamente documentais e sem credenciais, tokens, cookies ou dados sensíveis.

### Catálogo público inicial

A migration `20260717230000_verified_problem_catalog.sql` importa, de forma idempotente e sem imagens ou interações, os seguintes registros:

- Risco recorrente de transbordamento de córregos no Itaim Paulista — CGE da Prefeitura de São Paulo (30/01/2025).
- Vulnerabilidade a alagamentos durante chuvas intensas em São Paulo — Prefeitura de São Paulo/CGE (18/04/2025).
- Descarte irregular de resíduos na região da Capela do Socorro — Subprefeitura da Capela do Socorro (14/10/2025).
- Ponto recorrente de descarte irregular na Vila Pirajussara — Participe+ (15/05/2026), explicitamente qualificado como relato/proposta.
- Descarte clandestino de entulho e contaminação do solo na Zona Sul — Secretaria Municipal de Segurança Urbana (13/02/2025).

A identidade externa é a combinação de `source_url` com `source_metadata.external_source_key`. A migration usa IDs estáveis, `ON CONFLICT DO NOTHING` e não altera registros de usuários. Nenhuma linha persistida é apagada: o catálogo demonstrativo antigo existia somente nos arquivos do frontend.

## Linha do tempo e atualizações oficiais (Sprint 24)

Cada problema possui uma **linha do tempo pública**, ordenada cronologicamente, com sua criação, mudanças de status e comunicados oficiais. Organizações verificadas, moderadores e administradores podem usar **Nova atualização** nos detalhes do problema para publicar título, descrição e, opcionalmente, avançar o status.

O novo papel `verified_organization` identifica organizações autorizadas. A interface apenas reflete essa permissão: a RPC `publish_problem_update` valida `auth.uid()` e o papel no banco, registra atualização, eventual mudança de status, auditoria e notificações na mesma transação. O ator e a identidade institucional são sempre obtidos de `profiles` no banco, nunca do cliente; uma organização verificada sem `organization` preenchida não pode publicar. Para moderadores e administradores, a organização do perfil é usada quando existir, sem permitir sobrescrita. A tabela histórica é pública para leitura, mas escrita direta é revogada e não possui chave estrangeira destrutiva. No modo local/mock, a aplicação continua navegável e apresenta a timeline vazia; a publicação oficial informa que requer Supabase.

Fluxo: criação do problema → evento automático; alteração de status → evento automático; atualização oficial → evento oficial, auditoria e aviso aos usuários que favoritaram o problema (exceto o próprio ator).

## Sprint 25 — Mapa público e busca territorial

A rota `#/mapa` usa **Leaflet 1.9.4** com a cartografia raster pública do **OpenStreetMap** (`tile.openstreetmap.org`) e attribution visível obrigatória. Pan, zoom, teclado, popup e clusters operam sobre coordenadas geográficas reais. O evento `moveend` consulta somente a nova área visível, após debounce de 350 ms e com limite de 200 registros. Estado, cidade, bairro, categoria, status, verificação e atualização recente podem ser combinados. A seção **Explore por região** da home não apresenta métricas inventadas. A aplicação deve respeitar a [política de uso de tiles do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/); instalações de alto tráfego devem configurar um provedor compatível ou tiles próprios.

As coordenadas são opcionais. `geolocation_precision` distingue estado, cidade, bairro, logradouro aproximado e coordenada exata. A projeção pública é calculada no banco: `street` usa 3 casas decimais, `neighborhood` 2, `city` 1 e `state` 0. `exact` preserva as coordenadas somente quando o autor escolheu explicitamente esse nível público; ele nunca deve ser usado para endereço residencial. Endereços residenciais também não devem ser inseridos em `geolocation_source` nem em metadados. O React recebe apenas essa projeção, e a migration não geocodifica registros existentes.

`get_problems_in_bounds` valida limites, aplica todos os filtros e limita a resposta. `get_public_problem_location` fornece a mesma projeção segura para os detalhes. Como RLS não protege colunas, a migration revoga o `SELECT` de tabela de `anon` e `authenticated`, concede somente as colunas do catálogo e deixa latitude/longitude brutas acessíveis publicamente apenas pelas RPCs `SECURITY DEFINER`, que retornam a projeção protegida; a policy pública de linhas existente continua válida para o catálogo. `get_problem_region_summary` agrega totais reais por estado/cidade.

Sem Supabase, o `MapRepository` lê a coleção `problems` já usada pelo armazenamento local, descarta itens sem latitude, longitude e precisão válidas e aplica os mesmos bounds, filtros e limite de 200, sem fabricar conteúdo. A cartografia depende de conectividade, mas o Leaflet e seu CSS são empacotados pela aplicação a partir da dependência npm, sem CDN ou variável global. O Hotfix 25.1 também mantém o mapa responsivo com `ResizeObserver` e `invalidateSize()` e força a atualização do cache de schema do PostgREST após recriar as RPCs públicas. Validações integradas das RPCs, grants e policies exigem um projeto Supabase com a migration aplicada.

## Sprint 26 — Confiabilidade e observabilidade

Administradores podem acessar `#/admin/system` para validar banco, versão, assinaturas das RPCs, colunas obrigatórias, Auth, Storage e latência. Em `main`, migrations são aplicadas antes de `npm run check:database`, e qualquer incompatibilidade bloqueia o deploy; pull requests executam apenas verificações locais, sem secrets de produção. Consulte [`docs/deploy.md`](docs/deploy.md) para credenciais separadas da CLI, health check e build, promoção e rollback.
