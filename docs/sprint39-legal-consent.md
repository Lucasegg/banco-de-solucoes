# Sprint 39 — consentimento legal versionado

## Arquitetura e versões atuais

O fluxo segue **UI → contexto/hook de domínio → repository → Supabase**. `LegalConsentGate` nunca acessa o cliente diretamente; o provider coordena uma única consulta por sessão e o repository chama as RPCs. As versões de frontend são centralizadas em `src/legal/versions.ts`: `terms-2026-07-29` e `privacy-2026-07-29`. Isso registra aceite, mas não representa certificação ou garantia de conformidade com a LGPD.

## Persistência, RLS e RPCs

`legal_acceptances` é append-only, tem unicidade por usuário/documento/versão, timestamp do banco e checks de tipo, versão e locale. Não existem campos de IP, user-agent, token ou sessão. Clientes autenticados recebem somente `SELECT`, limitado pela RLS às próprias linhas; não recebem `INSERT`, `UPDATE` ou `DELETE`.

`accept_current_legal_documents(locale)` deriva o usuário de `auth.uid()`, rejeita JWT anônimo e locale desconhecido e insere os dois documentos em uma única transação. `ON CONFLICT DO NOTHING` torna a operação idempotente. `get_my_legal_consent_status()` devolve versões exigidas, histórico próprio e pendência. Ambas usam `SECURITY DEFINER`, `search_path` fixo e grant apenas para `authenticated`.

## Fluxos novos e existentes

Depois que Auth conclui a sessão e, quando aplicável, o desafio MFA, o provider consulta o status. Versões pendentes bloqueiam somente conteúdo protegido e mostram links reais, confirmação desmarcada e logout. Home, Fale Conosco, documentos legais e LGPD permanecem públicos. Callback OAuth, recuperação de senha e MFA estão na lista de bypass. A tela é removida sem redirecionamento depois do aceite, preservando o destino pretendido. Usuários existentes verão a solicitação uma vez; a unicidade evita repetições.

Minha Conta mostra versões e datas aceitas, em modo somente leitura, com links aos documentos vigentes. Erros de consulta bloqueiam o conteúdo protegido e exibem mensagem genérica, nunca texto técnico do Supabase.

## Publicar nova versão

1. Publique o documento atualizado e escolha um identificador estável e datado.
2. Crie **nova migration aditiva** ampliando a validação permitida e atualizando as versões exatas das RPCs; não altere migrations já aplicadas nem linhas históricas.
3. Atualize `CURRENT_LEGAL_VERSIONS` no mesmo release.
4. Atualize testes SQL/frontend e documentação; aplique a migration antes de servir o novo frontend.

## Riscos e limitações

- O registro demonstra o evento técnico de aceite associado à conta, não prova leitura, identidade civil ou conformidade legal completa.
- Um deploy do frontend antes da migration correspondente falha fechado e impede áreas protegidas; a pipeline mantém migration e health checks antes do deploy.
- A tabela preserva o locale selecionado, não uma cópia do conteúdo. O conteúdo publicado deve continuar versionado fora deste registro.
- Administradores de banco e service role permanecem fora do modelo de ameaça da RLS.

## Teste manual

1. Abra Home, Contato, Termos, Privacidade e LGPD sem login.
2. Entre com usuário sem aceite; conclua MFA e confirme que o intersticial aparece no destino original.
3. Abra ambos os links sem marcar a confirmação; confirme que aceitar continua desabilitado.
4. Marque, aceite e confirme retorno ao destino; faça novo login e confirme que não reaparece.
5. Confira versões/datas em Minha Conta e teste logout no intersticial.
6. Simule erro de RPC e confirme bloqueio; teste OAuth e recuperação de senha.
7. No banco, tente insert/update/delete, outro `user_id`, locale e versões inválidos, e execute aceite duplicado.

## Migration e deploy

A migration `20260729130000_sprint39_legal_consent.sql` é aditiva. O job local PostgreSQL a aplica e executa assertions bloqueantes. O job `verify` executa Sprint 39, além das regressões, Deno, build e formatação. O fluxo de produção continua condicionado a verify, baseline, migrations, aplicação remota e health/deploy gates existentes.
