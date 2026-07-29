# Sprint 38 — rodapé institucional e páginas legais

## Entrega e navegação

O `InstitutionalFooter` é parte do `Layout`, portanto aparece de forma consistente nas telas públicas e permanece ao fim da viewport em páginas curtas. Seus links nativos usam `href` para abrir `#/contact`, `#/privacy`, `#/terms` e `#/lgpd`; assim, funcionam sem JavaScript de clique, podem ser copiados ou abertos em nova aba e continuam compatíveis com o deploy estático no GitHub Pages. Atalhos das páginas legais para o Fale Conosco também são âncoras nativas. O ano é calculado no navegador. As páginas usam `article`, `header`, seções nomeadas e navegação rotulada, além do foco visível global.

Toda a interface nova está nos recursos `pt-BR` e `en-US`, com paridade verificada automaticamente. A data exibida identifica a versão do conteúdo e deve ser revista quando houver alteração material nas práticas ou nos textos.

Os testes da Sprint 38 carregam os componentes TSX pelo modo SSR do Vite e usam `react-dom/server` para verificar o HTML realmente renderizado em ambos os idiomas. As asserções cobrem o landmark do rodapé, `href`s nativos, ano dinâmico, títulos e seções legais, atalhos de contato e o link externo seguro da ANPD. O roteador hash foi extraído para funções puras e é exercitado diretamente com rotas legais, query string e fallback; a paridade integral dos recursos de tradução continua validada.

## Auditoria de privacidade e armazenamento

A redação foi baseada nos fluxos do repositório: Supabase fornece banco, Auth, Storage e Edge Functions; Resend encaminha mensagens do Fale Conosco; GitHub Pages hospeda o frontend. O formulário não persiste seu payload no banco, enquanto o rate limit conserva por até duas horas somente um identificador HMAC derivado do IP, conforme a implementação da Sprint 37.

A busca no código não encontrou integração própria de publicidade, analytics, `document.cookie` ou cookies não essenciais. Há `localStorage` para a sessão gerenciada pelo cliente Supabase, preferência de idioma, configurações e estados funcionais; `sessionStorage` conserva retornos temporários de autenticação. Por isso, essas práticas foram explicadas na Política de Privacidade e **não** foi criado banner de consentimento nem política de cookies separada. Provedores de identidade podem manter cookies nos próprios domínios e têm políticas independentes.

## Infraestrutura e deploy

Não foi necessária migration, alteração de Edge Function, secret ou dependência. O workflow recebeu somente o novo teste da Sprint 38 no job de verificação; não houve mudança nas permissões, nos gates de banco nem na publicação. O deploy continua sendo o build estático atual e não exige variável ou configuração adicional. Antes de publicar, a equipe deve revisar os textos sempre que fornecedores, retenção, dados tratados ou funcionalidades mudarem. O conteúdo informa práticas técnicas observáveis e não constitui promessa de certificação ou garantia de conformidade jurídica.
