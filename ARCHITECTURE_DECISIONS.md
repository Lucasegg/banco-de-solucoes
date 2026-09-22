# Architecture Decisions

## 1. Hash routing

O projeto usa hash routing (`#/rota`) porque a aplicação é estática e precisa funcionar em ambientes como GitHub Pages sem configurar rewrites de servidor. A parte após `#` não é enviada ao servidor, então links diretos como `#/admin` carregam `index.html` e deixam o React resolver a tela localmente.

## 2. Persistência local nas primeiras fases

As primeiras fases usaram `localStorage` para prototipação, testes manuais e evolução rápida sem backend. Esse mecanismo permanece apenas como parte do histórico arquitetural e, quando existente no código, como suporte local/compatibilidade. **Ele não é a fonte de verdade da produção atual.**

A produção 1.0 utiliza Supabase Auth, PostgreSQL com RLS, Realtime, Storage e Edge Functions. Dados de usuários, conteúdo, interações, contribuições e demais domínios persistentes devem ser tratados como dados reais do backend, sujeitos às políticas e contratos versionados.

## 3. Autorização no domínio

Permissões não podem existir apenas na interface. Guards e helpers do frontend são defesa em profundidade e experiência de usuário; a autorização definitiva para operações persistentes fica em RLS, RPCs e validações server-side. Nunca assuma que esconder um botão equivale a proteger um recurso.

## 4. Relação entre comentários, reportes, contribuições e moderação

Comentários são a fonte de verdade das discussões; reportes alimentam o fluxo de moderação sem duplicar arbitrariamente o domínio. Contribuições mantêm histórico e autoria, e o painel administrativo opera sobre contratos já existentes do backend. Mudanças nesses fluxos devem preservar RLS, auditoria e rastreabilidade.

## 5. Supabase como backend de produção

A migração planejada nas primeiras sprints foi concluída ao longo da versão 1.0. A arquitetura atual usa Supabase como backend real:

- Auth para identidade e sessão;
- PostgreSQL para dados persistentes;
- RLS e RPCs para autorização e operações sensíveis;
- Realtime para notificações e atualizações suportadas;
- Storage para arquivos permitidos;
- Edge Function para o fluxo de contato.

O frontend usa apenas configuração pública prevista para o cliente. Credenciais privilegiadas permanecem fora do browser e são fornecidas somente a jobs/serviços server-side autorizados.

## 6. Segurança da persistência

A segurança da produção não depende de armazenamento local ou de estado manipulável pelo usuário. Dados locais não conferem papel, autorização nem precedência sobre o banco. Qualquer mudança de schema deve ocorrer por migration versionada; migrations já aplicadas não são editadas. Consulte [SECURITY.md](SECURITY.md), [SUPABASE.md](SUPABASE.md) e [PERSISTENCE.md](PERSISTENCE.md).
