# Sprint 48 — perfil público e portfólio de impacto

## Análise e arquitetura
O schema persistia identidade em `profiles` (`username`, `display_name`, avatar, biografia, organização, localização, site, papel e criação), mas `publicProfile` existia somente em preferências locais. Reputação e conquistas já eram projeções persistentes da Sprint 47; problemas/soluções usam `author_id`, contribuições usam `user_id` e comentários convergiram para `user_id`. A aplicação usa hash routing. A incompatibilidade de privacidade foi resolvida com `profiles.public_profile`; as demais preferências continuam locais por não integrarem este contrato.

A página faz uma única chamada ao RPC agregado `get_public_member_profile(text)`. O repository aplica parser estrito e a página cancela a solicitação anterior ao trocar de username.

## Contrato público
Permitidos: id público, username, nome, avatar, biografia, organização, cidade/estado/país, site HTTP(S), papel público, entrada na comunidade, métricas agregadas, chaves/data de conquistas e até 20 atividades públicas. Métricas: reputação, comentários visíveis válidos, discussões, reações recebidas, melhores respostas, problemas, soluções e contribuições aprovadas.

Proibidos: e-mail, identidade de autenticação/provider, tokens, preferências alheias, consentimentos, denúncias, notificações, auditoria e histórico/nota de moderação.

## Privacidade, RLS e grants
A decisão ocorre dentro de um `SECURITY DEFINER` com `search_path=pg_catalog,public`, username normalizado/limitado, SQL estático e ordenação determinística. Perfil privado e username inexistente retornam o mesmo `not_found`, evitando enumeração. Somente `EXECUTE` é concedido a `anon` e `authenticated`; não há DML público. O proprietário mantém leitura/edição pela política autenticada existente e persiste o opt-in diretamente no próprio registro. Administradores não recebem bypass público.

## Fluxo e estados
A rota `#/members/:username` é pública. Há estados com `aria-live` para carregamento, indisponibilidade privada/inexistente (mensagem deliberadamente indistinguível), erro recuperável e ausência de atividade/avatar. Métricas zero são omitidas; se todas forem zero aparece um estado vazio. Datas/números e conquistas usam i18n PT-BR/en-US.

## Acessibilidade e segurança de links
HTML semântico, títulos hierárquicos, foco visível, grade adaptável a 320 px, quebra de strings, alternativa de avatar e links externos com `target=_blank` + `noopener noreferrer`. Apenas sites HTTP(S) passam pelo banco e parser.

## Limitações
Atividade é limitada aos 20 itens mais recentes e não tem paginação adicional nesta entrega. Para impedir enumeração, “privado” e “inexistente” compartilham a apresentação pública. Conteúdo de problemas/soluções segue o contrato público/RLS atual dessas tabelas; comentários ocultos/removidos são excluídos.

## Validação manual
1. Ative “Perfil público” no perfil autenticado e abra “Ver perfil público”.
2. Teste a URL em janela anônima, teclado e viewport de 320 px.
3. Confira conquistas, contagens, atividade, avatar ausente e link externo.
4. Desative a preferência e confirme que a mesma URL deixa de expor os dados.
5. Troque rapidamente entre usernames e confirme que resposta antiga não substitui a atual.

## Rollback
Revogar `EXECUTE`, remover o RPC e o índice parcial e, somente após exportar a preferência, remover `profiles.public_profile`. O frontend deve ser revertido no mesmo deploy para não chamar contrato ausente. Nenhuma tabela de reputação ou conteúdo é modificada.
