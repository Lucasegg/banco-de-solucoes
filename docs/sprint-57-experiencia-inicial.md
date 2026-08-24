# Sprint 57 — auditoria da experiência inicial

## Diagnóstico da página anterior

- **Proposta de valor:** o título explicava a conexão entre problemas e soluções, mas a descrição não deixava claro o benefício para alguém chegando pela primeira vez.
- **Hierarquia e textos:** após o hero, a página ia diretamente ao mapa e aos catálogos; faltava explicar a jornada de descoberta, colaboração e acompanhamento.
- **CTAs:** problemas, soluções e mapa estavam disponíveis, mas busca, suporte e primeira contribuição não formavam um caminho explícito.
- **Estados de sessão:** o conteúdo principal não orientava de forma diferente visitante, colaborador autenticado e administrador.
- **Responsividade:** os botões flexíveis evitavam parte do overflow, porém não havia um contrato específico para os novos caminhos em 320 px.
- **Acessibilidade:** os controles eram botões nativos e o layout já preservava skip link e foco visível, mas as ações principais e seções de orientação não tinham nomes ou relações semânticas próprias.

## Decisões implementadas

O hero agora apresenta busca, problemas e mapa como ações públicas prioritárias. Visitantes recebem apenas entrada/criação de conta para contribuir; membros recebem o cadastro de problema; somente administradores recebem acesso ao painel administrativo. A seção **Como funciona** usa uma lista ordenada de quatro etapas, e a orientação de primeira contribuição diferencia problema e solução, recomenda fontes verificáveis e informa sobre regras e moderação.

Os CTAs reutilizam as rotas HashRouter existentes (`search`, `problemas`, `mapa`, `login`, `register`, `novo-problema`, `admin` e `contact`). O rodapé, páginas legais, Fale Conosco, SEO, autenticação e autorização permanecem inalterados.

## Verificação e limites

Os contratos da Sprint 57 verificam textos bilíngues, destinos, estados de sessão, semântica e preservação dos links institucionais. Os cenários Playwright cobrem teclado, console e overflow em 320 px para visitante, além dos estados de membro e administrador. Não foram criadas migrations, dependências, cookies, analytics, secrets, permissões ou arquitetura de persistência; nenhum gate foi removido ou flexibilizado.
