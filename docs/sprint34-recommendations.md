# Sprint 34 — recomendações e conteúdos relacionados

As três RPCs públicas relacionam problema–problema, problema–solução e solução–problema. São `SECURITY INVOKER`, respeitam RLS, omitem registros arquivados e ligações já existentes, e retornam apenas dados de catálogo, pontuação, razões e total.

Resultados de problemas retornam `city` e `state`. Resultados de soluções retornam `organization`, que é o único rótulo público de contexto disponível no schema validado; não existe dependência de uma coluna persistida `solutions.location`, nem são retornadas coordenadas nos cards.

## Pontuação e razões

Categoria vale 35 pontos, cada tag distinta (até cinco) vale 8, texto vale até 25, cidade/estado valem 10/5 e distância pública vale até 10. Evidência vale 7 e métrica de impacto 5 nas soluções. Popularidade usa logaritmo limitado a 5, portanto nunca domina. Nulos valem zero e apenas resultados positivos são exibidos. O desempate é `score DESC`, `updated_at DESC`, `id ASC`.

As razões são frases públicas: mesma categoria, quantidade de tags, descrição semelhante, cidade/estado, proximidade, evidência e impacto. Fórmulas, coordenadas e metadados administrativos não são retornados.

## Texto, tags, geografia e privacidade

O texto reutiliza `safe_search_tsquery`; tags são desduplicadas. Distância reutiliza `haversine_distance_km`. Problemas passam por `public_problem_coordinate`, e ausência de coordenadas apenas remove o bônus. Nenhum índice equivalente foi criado.

`recommendation_distance_km` é `SECURITY INVOKER`, imutável, estrita e *parallel safe*, sem permissão direta para `PUBLIC`, `anon` ou `authenticated`. As RPCs incorporam o cálculo Haversine e não criam um bypass de permissões.

## Paginação, interface e limitações

O padrão é 6, máximo 24, e offset negativo vira zero. `total_count` permite “Ver mais”. Cards exibem explicações, loading, skeleton, vazio e erro com `aria-live`. Não há IA externa nem cache persistente; alterações são refletidas em nova consulta.

## Validação

O CI PostgreSQL 15 aplica fixture, Sprint 32, Sprint 33 e o arquivo real da Sprint 34, depois valida assinaturas, grants e chamadas vazias. `npm run test:sprint34` audita contratos, segurança, paginação, frontend e workflow.
