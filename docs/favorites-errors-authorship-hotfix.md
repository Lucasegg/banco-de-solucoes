# Hotfix: favoritos, erros e autoria

## Diagnóstico e contrato de favoritos

A causa do erro confirmado era o parser do repositório transformar qualquer resposta que não pudesse ser mapeada em texto técnico visível. A criação usa `insert(...).select(...).single()`: o contrato do cliente é **um objeto** com as colunas `id`, `user_id`, exatamente um de `problem_id`/`solution_id` e `created_at`; listagens são **arrays**; remoção bem-sucedida não exige payload. A validação continua estrita, mas agora respostas inválidas geram uma mensagem pública neutra. O `select` é mantido no insert e a tentativa concorrente que encontra a restrição única relê o favorito, tornando a operação idempotente.

`favorites.user_id` referencia `profiles.id`; nesta base `profiles.id` é o mesmo UUID de `auth.users.id`, portanto `auth.uid()` é o valor armazenado. Problems e solutions usam `author_id` nesse domínio; contributions usam `user_id` no mesmo domínio. Não há conversão por nome, e-mail ou ID arbitrário.

## Segurança e autoria

`toPublicError` centraliza a tradução de falhas de transporte/banco. Repositórios não retornam `error.message` ao componente. A migration nova reaplica políticas para favorites, problems e solutions, e acrescenta políticas de update/delete de contributions: somente o autor, enquanto `pending` ou `reviewing`. Aprovação e rejeição continuam exclusivamente no fluxo `review_contribution`; o revisor não modifica o texto nem troca autoria.

O frontend usa helpers tipados de autoria. Editar e excluir em detalhes são exibidos somente ao autor; ações administrativas permanecem no painel. O banco segue sendo a autoridade contra URL ou chamada direta. `update_solution_with_problems` foi auditada: verifica `auth.uid()` contra `solutions.author_id` antes de alterar dados. Nenhuma migration histórica foi editada e nenhuma service role foi adicionada.

## Modelo e políticas revisados

| Tabela | SELECT | INSERT | UPDATE/DELETE |
| --- | --- | --- | --- |
| favorites | próprio usuário | `user_id = auth.uid()` | remoção do próprio usuário |
| problems | catálogo público | autor | somente `author_id = auth.uid()` |
| solutions | catálogo público | autor/RPC autenticada | somente `author_id = auth.uid()` |
| contributions | autor e moderador conforme política existente | próprio autor | próprio autor, `pending`/`reviewing` |
| solution_problems | público | autor da solução | autor da solução |

As restrições parciais já existentes garantem unicidade por `(user_id, problem_id)` ou `(user_id, solution_id)`. A migration elimina apenas duplicatas exatas, preservando a linha mais recente antes de aplicar as políticas.

## Validação e limitações

A migration original foi nomeada com o timestamp `20260722100000`, anterior ao Sprint 29 já existente (`20260722290000`). Ela foi renomeada para `20260722300000_hotfix_favorites_authorship.sql`, posterior a todo o histórico, para que as regras do hotfix não sejam aplicadas antes das dependências existentes. O bloco de grant/revoke com assinatura fixa de `update_solution_with_problems` foi removido: os grants já são tratados pelo Sprint 29 e repeti-los poderia falhar quando a função está ausente, possui overloads ou diverge legitimamente de assinatura. Assim, a ausência da RPC não derruba este hotfix; a disponibilidade da RPC deve ser validada separadamente pelo check de saúde da aplicação.

O teste `favorites-permissions` cobre helpers de autoria, mensagens públicas e invariantes estáticos da migration. Não havia ambiente local de banco configurado, portanto RLS não foi exercida dinamicamente. Antes do deploy, execute no remoto para inspecionar as assinaturas reais:

```sql
select n.nspname, p.proname, p.oid::regprocedure
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_solution_with_problems', 'update_solution_with_problems');
```

Validação SQL manual sugerida: autenticar como A/B, tentar `update/delete` de problems, solutions e contributions de A como B, e inserir/deletar favorites com `user_id` de A como B; todas as tentativas de B devem ser negadas. Validar manualmente refresh, clique duplo, visitante, sessão expirada, desktop/mobile e teclado antes do deploy.
