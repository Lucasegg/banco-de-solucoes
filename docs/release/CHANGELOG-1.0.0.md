# Changelog — Banco de Soluções 1.0.0

Data de publicação: **24 de agosto de 2026**. A identificação operacional e as
evidências do go-live estão no [manifesto final](1.0.0-manifest.md).

## Funcionalidades públicas

- Catálogos navegáveis de problemas e soluções, páginas de detalhe e cadastro
  autenticado, com proveniência e estados de carregamento, vazio e erro.
- Busca textual, filtros, taxonomia global moderada, recomendações e pesquisa
  geográfica por raio, proximidade e região.
- Mapa público com Leaflet/OpenStreetMap e exposição de localização pública com
  precisão controlada.
- Interface responsiva e acessível em português do Brasil e inglês, com
  preferência local e fallback para `pt-BR`.

## Segurança e privacidade

- Autenticação por e-mail e provedores sociais, recuperação de senha, MFA,
  proteção de rotas e autorização/RLS no Supabase.
- Moderação e auditoria de conteúdo, validação de uploads, rate limits e
  tratamento explícito de consentimentos aplicáveis.
- Pipeline fail-closed com auditoria de dependências, SBOM, verificação de
  migrations e barreira contra escrita no smoke de produção.
- Nenhum analytics ou cookie de rastreamento foi incluído na versão 1.0. Os
  serviços externos operacionais são Supabase, Resend e OpenStreetMap/Leaflet.

## Páginas legais e contato

- Política de Privacidade (`#/privacy`), Termos de Uso (`#/terms`) e página LGPD
  (`#/lgpd`) públicas, ligadas pelo rodapé.
- Fale Conosco (`#/contact`) com validação, proteção antiabuso e envio por Edge
  Function/Resend; o monitor apenas abre a página e nunca submete o formulário.

## Comunidade

- Perfis públicos, favoritos, comentários, reações, reputação e conquistas.
- Contribuições propostas com autoria, histórico, notificações in-app/realtime,
  denúncias e filas administrativas de moderação.

## Observabilidade e operação

- CI cumulativa, Critical Browser Flows em desktop e viewport estreito,
  Production Preflight manual, migrations/health check antes do deploy,
  GitHub Pages e smoke pós-deploy somente leitura.
- Production Monitor diário sem secrets ou mutações, com relatório, screenshot
  e trace preservados em caso de falha.
- Diagnóstico administrativo protegido para banco, schema, RPCs, Auth, Storage
  e tempo de resposta.

## Limitações conhecidas

- O `HashRouter` não fornece URLs HTTP independentes: sitemap e canonical
  apontam somente para a raiz, e SEO por rota depende da execução do JavaScript.
- A interface cobre apenas `pt-BR` e `en-US`; conteúdo criado por usuários e
  valores canônicos não recebem tradução automática.
- O mapa depende de serviços externos e a posição pública pode ser aproximada;
  não é uma ferramenta de navegação ou resposta a emergências.
- Não existe rollback automático de banco. Migrations aplicadas exigem correção
  compensatória, nunca reversão destrutiva.
- O monitor público verifica contratos somente leitura e não substitui testes
  administrativos, disponibilidade garantida ou observabilidade interna dos
  provedores.
- O repositório ainda não contém uma licença definitiva; a disponibilidade
  pública do código, por si só, não concede uma licença open source.

## Adiado para versões futuras

- API pública, exportação de dados abertos e integrações com governos,
  pesquisa e outras comunidades.
- SSR/prerenderização ou rotas HTTP reais para SEO independente por página.
- Novos idiomas, RTL, tradução automática e preferência de idioma sincronizada
  ao perfil.
- Analytics ou telemetria de produto com avaliação de privacidade e
  consentimento próprios.
- Convites para projetos/times e mecanismos adicionais de organização
  comunitária.

Nenhum item desta seção é compromisso de prazo ou funcionalidade já executada.
