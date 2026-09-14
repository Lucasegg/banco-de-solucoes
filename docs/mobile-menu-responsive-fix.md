# Correção de responsividade do menu mobile

## Problema
O cabeçalho exibía todos os links em `flex-wrap` também em telas pequenas. Em smartphones isso fazia o menu ocupar várias linhas, aumentar excessivamente a altura do cabeçalho e comprometer a navegação.

## Correção
- mantém a navegação desktop a partir do breakpoint `md`;
- adiciona botão de menu (hambúrguer) em smartphones;
- exibe navegação mobile em painel vertical com rolagem limitada à viewport;
- fecha o painel após qualquer navegação;
- mantém ações autenticadas, notificações e seletor de idioma disponíveis no mobile;
- adiciona `aria-expanded` e `aria-controls` ao botão do menu;
- preserva as rotas, permissões e regras já existentes.

## Validação esperada
- layout sem overflow horizontal em smartphones;
- cabeçalho compacto em 320 px, 375 px e 390 px;
- abertura e fechamento do menu pelo botão;
- navegação fecha o menu após selecionar um item;
- desktop permanece com navegação horizontal atual.
