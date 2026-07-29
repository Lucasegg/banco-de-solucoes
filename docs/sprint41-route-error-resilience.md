# Sprint 41 — Resiliência de erros nas rotas

## Problema tratado

Páginas divididas em chunks podem falhar durante uma troca de versão, por cache desatualizado ou indisponibilidade de rede. Erros de renderização também não devem remover silenciosamente o conteúdo nem expor informações técnicas.

## Arquitetura e posição

`RouteErrorBoundary` envolve somente `Suspense` e o conteúdo selecionado da rota. A ordem é `Layout → LegalConsentGate → RouteErrorBoundary → Suspense → gates de autenticação/admin → página lazy`. Assim, o layout permanece utilizável, o consentimento continua fail-closed e autenticação, MFA e autorização continuam decidindo se uma página pode ser renderizada. A fronteira não contém regras de segurança nem acessa repositories.

## Classificação e recuperação

Sinais conhecidos incluem os nomes `ChunkLoadError` e `CSS_CHUNK_LOAD_FAILED`, o evento `vite:preloadError`, códigos e mensagens usuais de importação dinâmica dos navegadores/Vite. Qualquer outro erro recebe a categoria genérica `render`. A interface nunca exibe mensagem, URL ou stack do erro.

A recuperação é deliberadamente manual: **Tentar novamente** executa um único reload iniciado pelo usuário, preservando o hash completo que o navegador já possui e permitindo que `React.lazy` abandone sua Promise rejeitada em cache. Não há timer, tentativa automática, marcador persistente ou loop. **Voltar ao início** navega para `#home` sem ampliar permissões.

## Segurança, privacidade e observabilidade

O logger existente recebe somente categoria, rota lógica sem identificador/query string, timestamp fornecido pelo próprio logger e versão pública (`VITE_APP_VERSION`, quando configurada). O erro original, stack, usuário, formulários, e-mail, tokens e objetos do Supabase não são registrados. Nenhum monitoramento externo ou backend foi adicionado; não há migration, mudança de RLS/RPC, Edge Function, secret ou dado.

## Testes realizados

O teste Sprint 41 cobre classificação de chunk e erro genérico, fallback seguro, traduções pt-BR/en-US, alerta e foco, controles de retry/home, preservação do hash, ausência de detalhes sensíveis e reload automático, observabilidade sanitizada e a ordem arquitetural dos gates. O workflow `verify` executa `test:sprint41` sem mudar gatilhos, permissões, preflight ou deploy.

## Roteiro manual

1. Abra uma rota pública e, no DevTools, bloqueie o chunk correspondente antes de navegar; confirme o aviso dentro do layout.
2. Confirme foco no título e percorra os dois botões com Tab/Shift+Tab.
3. Copie o hash, pressione **Tentar novamente** e confirme que o mesmo hash permanece após o reload.
4. Repita em pt-BR e en-US; confirme que não aparecem URL, stack ou dados de sessão.
5. Pressione **Voltar ao início** e confirme `#home`.
6. Com usuário desconectado, MFA pendente, consentimento pendente e usuário não admin, tente rotas protegidas e confirme que cada gate continua bloqueando o conteúdo.
7. Provoque um erro de renderização em desenvolvimento e confirme o fallback genérico e um único registro sanitizado no console.

## Impacto esperado no deploy

O build ganha um pequeno componente no chunk inicial para capturar falhas dos chunks de página. Deploy e Production Preflight não são executados nem modificados por esta sprint; o fluxo existente continua responsável pela publicação.
