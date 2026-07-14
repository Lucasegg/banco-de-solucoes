# Architecture Decisions

## 1. Hash routing

O projeto usa hash routing (`#/rota`) porque a aplicação é estática e precisa funcionar em ambientes como GitHub Pages sem configurar rewrites de servidor. A parte após `#` não é enviada ao servidor, então links diretos como `#/admin` carregam `index.html` e deixam o React resolver a tela localmente.

## 2. localStorage nas primeiras fases

As primeiras fases persistem dados em `localStorage` para permitir prototipação, testes manuais e uso offline sem provisionar backend. Essa escolha mantém contribuições, discussões, favoritos, sessão e moderação no navegador, com validação ao recuperar dados para evitar que conteúdo inválido quebre a interface.

## 3. Autorização no domínio

Permissões não podem existir apenas na interface. Os hooks de domínio (`useContributions`, `useDiscussions` e `useModeration`) verificam o papel tipado do usuário antes de executar escritas sensíveis, porque botões podem ser escondidos, mas chamadas locais ainda precisam ser protegidas.

## 4. Relação entre comentários, reportes, contribuições e moderação

Comentários continuam sendo a fonte de verdade de discussões. Reportes ficam dentro do próprio comentário e alimentam casos gerados por `useModeration`, sem criar uma segunda lista de reportes. Contribuições continuam em `useContributions`; o painel administrativo apenas consome o hook existente e registra ações de revisão no histórico de moderação.

## 5. Caminho para Supabase

Quando o projeto migrar para Supabase, os hooks atuais devem trocar leitura/escrita de `localStorage` por queries e mutations. Comentários, reportes, contribuições, casos e ações podem virar tabelas relacionais com policies por `roleKey`. A interface e os contratos dos hooks devem mudar pouco: validação passa a proteger payloads da API, e autorização local continua como camada de UX, enquanto Row Level Security vira a camada obrigatória de segurança.

## 6. Limitações de segurança local

Uma aplicação totalmente local não é segura contra usuários mal-intencionados. Qualquer pessoa pode alterar `localStorage`, mudar papéis, apagar histórico ou chamar funções pelo console. As proteções atuais reduzem erros de uso e preservam integridade durante prototipação, mas não substituem autenticação, autorização e auditoria no servidor.
