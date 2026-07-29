# Sprint 40 — performance do frontend e GitHub Actions

## Diagnóstico inicial

O build de referência, executado antes das alterações com `npm run build`, transformava 2.005 módulos e gerava um único JavaScript principal de **1.020,72 kB** (**272,29 kB gzip**). O Vite emitia o aviso de chunk acima de 500 kB.

A inspeção do grafo de imports de `App.tsx` mostrou que todas as páginas eram importadas estaticamente. Assim, catálogo, busca, recomendações, detalhes e formulários, telas administrativas, Leaflet/mapa e seus repositórios eram transferidos antes mesmo de se conhecer a rota. Providers, autenticação, MFA e `LegalConsentGate` também estavam nesse arquivo; estes últimos precisam continuar globais para que os gates sejam avaliados antes do conteúdo protegido.

## Alterações realizadas

- As páginas públicas, autenticadas, legais e administrativas passaram a usar `React.lazy` com imports dinâmicos.
- Um único `Suspense`, dentro do layout e do `LegalConsentGate`, apresenta um fallback traduzido e acessível durante a troca de rota.
- Layout, providers, estado de autenticação, cálculo de permissões, MFA, consentimento legal e wrappers de autorização permanecem no chunk inicial.
- `actions/checkout` foi atualizado de `v4` para `v5` e `actions/setup-node` de `v4` para `v5`. Esses majors usam runtime Node 24; o Node instalado para o projeto continua explicitamente sendo 24.
- Foi adicionado o teste `test:sprint40` e o gate correspondente no job de verificação.

Não houve alteração de migration, schema, RPC, RLS, Edge Function, secrets, permissões, gatilhos ou jobs de deploy.

## Estratégia de code splitting

Cada módulo de página é uma fronteira assíncrona. Exports nomeados são convertidos para o formato `default` esperado por `React.lazy`; páginas que compartilham o mesmo módulo, como autenticação, detalhes e formulários, reutilizam o chunk produzido pelo bundler. O mapa e Leaflet somente são baixados ao visitar uma rota que os utiliza.

O hash router existente continua sendo a fonte das rotas. Isso preserva URLs `#/...`, navegação, recarga e acesso direto no GitHub Pages sem exigir regras de rewrite no domínio `bancodesolucoes.com.br`.

## Comparação objetiva dos bundles

Medições locais de produção, com as mesmas dependências e o mesmo comando:

| Métrica | Antes | Depois | Variação |
| --- | ---: | ---: | ---: |
| JavaScript inicial | 1.020,72 kB | 248,19 kB | -772,53 kB (-75,7%) |
| JavaScript inicial gzip | 272,29 kB | 77,01 kB | -195,28 kB (-71,7%) |
| CSS inicial | 48,71 kB | 33,93 kB | -14,78 kB |
| Maior chunk sob demanda | — | Supabase client: 205,33 kB | abaixo de 500 kB |
| Leaflet sob demanda | incluído no principal | 148,81 kB | carregado por rota |
| Traduções/provider compartilhados | incluídos no principal | 124,32 kB | compartilhado |

O build posterior não emite o warning de 500 kB. O limite do Vite não foi aumentado. Os nomes com hash variam entre builds; os números acima vêm dos relatórios do Vite.

## Riscos e decisões

- **Latência ao trocar de rota:** a primeira visita a cada grupo de páginas faz uma requisição adicional. O fallback mantém feedback imediato e usa `role="status"`, `aria-live="polite"` e texto no idioma ativo.
- **Gates de segurança:** autenticação, MFA, consentimento e autorização não foram movidos para dentro das páginas. O conteúdo lazy continua subordinado aos wrappers existentes.
- **Dependências globais:** React, layout, i18n, cliente/base de persistência e gates permanecem iniciais porque inicializam a aplicação e determinam acesso. O recurso completo de mapa não permanece global.
- **Falha de rede ao baixar um chunk:** mantém o comportamento padrão do React; esta sprint não introduz um novo error boundary nem altera regras funcionais.
- **Actions:** foram alterados apenas os majors solicitados. Permissões mínimas, entradas, condições, artifacts, migrations, health check e deploy permanecem iguais.

## Roteiro de testes manuais

1. Abrir a home em pt-BR e en-US, desacelerar a rede no DevTools e confirmar o texto “Carregando página…” / “Loading page…”.
2. Navegar para catálogo de problemas e soluções, busca, recomendações, detalhes e mapa; confirmar filtros, cards e abertura dos registros.
3. Recarregar e abrir diretamente hashes de problema, solução, contato, privacidade, termos e LGPD.
4. Testar cadastro, login, recuperação de senha e desafio MFA, inclusive retorno à rota originalmente solicitada.
5. Com usuário autenticado, validar `LegalConsentGate`, Minha Conta, perfil, favoritos, notificações e contribuições.
6. Com as permissões adequadas, validar dashboard e seções administrativas; sem permissão, confirmar o bloqueio existente.
7. Conferir o link Fale Conosco e seu envio em ambiente configurado, sem registrar secrets no console.
8. No domínio publicado, confirmar que `CNAME` e navegação baseada em hash continuam atendendo `bancodesolucoes.com.br`.

## Impacto esperado no deploy

O diretório `dist` passa a conter vários assets imutáveis com hash, compatíveis com o upload atual do GitHub Pages. Não há etapa operacional nova, migration ou deploy manual. A redução do JavaScript inicial deve melhorar transferência, parse e execução da primeira renderização; páginas visitadas depois são buscadas sob demanda e ficam disponíveis ao cache do navegador.

Esta documentação registra somente validações locais. **Production Preflight, migrations, health check e deploy não foram executados nem são declarados como aprovados.**
