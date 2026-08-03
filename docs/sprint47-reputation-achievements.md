# Sprint 47 — reputação e conquistas persistentes

## Arquitetura

A reputação é uma projeção persistente em `user_reputation`, derivada exclusivamente de comentários, reações e marcações de melhor resposta. Triggers chamam uma única função de reconciliação após inserção, alteração e exclusão. `reputation_rules` é o contrato central de pontuação; `user_achievements` guarda conquistas vigentes e `reputation_audit_log` registra toda mudança de pontos, inclusive o backfill inicial. O frontend lê até 100 autores por chamada por meio de `get_public_reputations(uuid[])`, evitando N+1, e valida a resposta sem coerções.

## Regras de pontuação

* comentário visível, não excluído: **5 pontos**;
* reação ativa recebida de outra conta em comentário válido: **2 pontos**;
* comentário válido atualmente marcado como melhor resposta: **25 pontos**.

Comentários ocultos/removidos/excluídos, reações inativas e auto-reações valem zero. Uma discussão é o par tipo/id do alvo distinto em que existe comentário válido.

## Conquistas

* **Voz ativa:** primeiro comentário válido;
* **Ideia apoiada:** três reações válidas recebidas;
* **Melhor resposta:** uma melhor resposta válida;
* **Colaborador frequente:** cinco discussões distintas;
* **Especialista da comunidade:** 250 pontos. Esse patamar exige atividade diversa ou sustentada e não cria ranking competitivo.

`earned_at` preserva a primeira obtenção enquanto o critério continua válido. Moderação pode retirar a conquista; uma obtenção futura recebe nova data.

## Segurança, auditoria e concorrência

As tabelas internas usam RLS forçada e não concedem DML nem leitura direta a `anon`/`authenticated`. RPCs `SECURITY DEFINER` têm `search_path=pg_catalog,public`; a RPC do usuário atual usa `auth.uid()` sem parâmetro. O resumo público contém somente métricas e chaves/datas de conquistas — nunca e-mail, identidade de autenticação, papel ou dados administrativos. Nem administradores têm grant para editar pontos. O log é append-only e mantém o UUID após exclusão da conta.

A reconciliação obtém advisory lock transacional por usuário e recalcula a partir das fontes, em vez de somar deltas. Assim, retries, backfill, troca de melhor resposta e eventos concorrentes são idempotentes, sem pontos duplicados.

## Moderação, exclusões e limitações

Ocultar ou remover um comentário elimina imediatamente seus pontos, reações recebidas, eventual melhor resposta e participação que dependa somente dele. Restaurar recalcula tudo. Cascatas de exclusão acionam a reconciliação; ao excluir a conta, projeções e conquistas desaparecem e a auditoria permanece. A atualização é síncrona na transação (consistência forte), com custo proporcional à atividade de um único autor. A Sprint não inclui ranking, pontuação manual nem publicação Realtime das tabelas internas.

## Validação manual

1. Abra uma discussão com duas contas e publique um comentário: confirme 5 pontos e **Voz ativa** no perfil.
2. Reaja com a própria conta (zero) e outra conta (+2); desative a reação e confirme a reversão.
3. Com três contas externas, alcance três reações e confirme **Ideia apoiada**.
4. Marque e depois troque a melhor resposta; confirme que somente a resposta vigente recebe 25 pontos.
5. Oculte e restaure o comentário na moderação e confira a remoção/restauração das métricas.
6. Inspecione em viewport móvel, teclado e leitor de tela o resumo junto ao autor e as conquistas do perfil.
7. Como anônimo, consulte o perfil/resumo e confirme que nenhum dado privado aparece; tente DML direto e confirme `permission denied`.
