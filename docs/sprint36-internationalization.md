# Sprint 36 — Internacionalização

## Arquitetura

A camada `src/i18n` isola recursos tipados, detecção, fallback, contexto React e formatadores `Intl`. Os recursos são divididos por domínio em `src/i18n/locales`; o catálogo `pt-BR` define o tipo de todas as chaves e `en-US` precisa implementar exatamente esse contrato. A aplicação usa `pt-BR` como fallback seguro. O provider expõe somente `locale`, `setLocale` e `t`, sem Supabase e sem expor armazenamento à UI.

Na primeira visita, a primeira preferência compatível de `navigator.languages` é usada; se nenhuma for compatível, usa-se `pt-BR`. Uma escolha no seletor é salva sob a chave versionável `banco-de-solucoes.locale`. A escolha persistida tem prioridade. Leitura e escrita passam por um adaptador defensivo: `SecurityError`, armazenamento ausente e falhas de quota não interrompem a aplicação. Toda alteração atualiza imediatamente o contexto, `document.documentElement.lang`, o título e a descrição do documento, sem recarga.

## Como adicionar traduções

1. Adicione uma chave semântica ao módulo de domínio adequado em `src/i18n/locales`.
2. Adicione a mesma chave a `enUS`; o TypeScript e `npm run test:sprint36` rejeitam chaves ausentes.
3. Use `useTranslation().t('namespace.key')` na interface, sem traduzir valores livres recebidos do repositório.
4. Use `formatDate`, `formatDateTime`, `formatNumber` ou `formatCount`; nunca monte datas ou números manualmente.
5. Execute o teste da Sprint 36, que também rejeita chaves duplicadas no arquivo-fonte.

## Compatibilidade e limitações

Conteúdo criado por usuários permanece integralmente no idioma original. Categorias, tags, status e papéis mantêm seus nomes canônicos persistidos; valores conhecidos são traduzidos exclusivamente por mapas tipados de apresentação em `src/i18n/presentation.ts`. Não foram alterados banco, RPCs, contratos públicos nem migrations.

A cobertura inclui o shell global e todas as interfaces inventariadas: autenticação, conta e perfil; problemas, soluções, detalhes e formulários; busca textual e geográfica, mapas e paginação; favoritos, contribuições, discussões, notificações e recomendações; taxonomia; administração, moderação, auditoria e diagnóstico do Supabase. O gate automatizado rejeita qualquer linha `pending` no inventário. Conteúdo livre continua no idioma de autoria. Ficam explicitamente fora do escopo: tradução automática de conteúdo, idiomas adicionais, persistência da preferência no perfil e suporte a escrita RTL.
