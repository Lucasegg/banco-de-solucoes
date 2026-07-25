# Sprint 33 — Busca Geográfica Inteligente

## Visão geral

A busca avançada agora pode combinar o texto e os filtros do catálogo com uma origem geográfica e raios de **1, 5, 10, 25, 50 ou 100 km**. O botão **Perto de mim** solicita a localização ao navegador; nenhuma coordenada é enviada antes do consentimento. Enquanto o modo estiver ativo, resultados são paginados e ordenados pela distância crescente e exibidos em um mapa Leaflet com mosaicos e atribuição do OpenStreetMap.

## Banco de dados

A única migration da sprint, `20260725120000_sprint33_geographic_search.sql`, adiciona o par opcional `latitude`/`longitude` às soluções, valida intervalos e atomicidade do par, cria índices geográficos parciais e publica:

- `haversine_distance_km`: distância de grande círculo em quilômetros, usando raio terrestre médio de 6.371,0088 km;
- `search_nearby_problems`: busca problemas por caixa delimitadora, Haversine, texto e filtros de catálogo;
- `search_nearby_solutions`: equivalente para soluções.

As RPCs validam origem e raio, limitam páginas a 50 itens e usam `distance, id` como ordenação estável. A caixa delimitadora aproveita índices B-tree antes do cálculo exato. Isso não exige extensões e é compatível com PostgreSQL 15.

Por privacidade, problemas continuam retornando somente coordenadas transformadas por `public_problem_coordinate`, conforme a política territorial da Sprint 25; tanto a distância quanto o marcador usam essa projeção pública. Registros sem o par de coordenadas permanecem disponíveis na busca convencional, mas não aparecem no modo próximo.

## Uso e operação

1. Acesse **Busca avançada** e escolha Problemas ou Soluções.
2. Opcionalmente preencha texto e filtros.
3. Selecione o raio e clique em **Perto de mim**; autorize o navegador.
4. Use **Desativar proximidade** para retornar à ordenação convencional.

Os parâmetros da busca geográfica ficam na URL para preservar navegação e paginação. Em produção, geolocalização do navegador requer contexto seguro (HTTPS). O mapa usa os servidores públicos do OpenStreetMap; instalações com tráfego elevado devem configurar um provedor de mosaicos que respeite sua política de uso.

## Validação

Execute `npm run test:sprint33` para os contratos de distância, ordenação, paginação, raio, filtros, integração e mapa. `npm test` e `npm run build` validam os tipos e o bundle da aplicação.
