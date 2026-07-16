# Banco de Soluções

Banco de Soluções é uma plataforma open source para conectar problemas reais a soluções reutilizáveis, pessoas, empresas e projetos. A visão é construir uma base mundial de conhecimento colaborativo, onde desafios possam ser descritos com contexto, soluções possam ser comparadas por impacto e comunidades possam se organizar em torno da execução.

## Visão do produto

A visão completa do Banco de Soluções está documentada em [VISION.md](VISION.md), incluindo o papel das contribuições na preservação de conhecimento e na evolução de soluções aplicáveis.

## Objetivos

- Mapear problemas relevantes de forma estruturada.
- Catalogar soluções existentes, experimentais e propostas.
- Conectar pessoas, empresas e projetos por área de atuação.
- Incentivar colaboração aberta, documentação clara e evolução contínua.
- Preparar uma base técnica simples para evoluir com backend, autenticação e dados reais.

## Stack da Fase 1

- React
- TypeScript
- Vite
- TailwindCSS
- Dados mockados tipados
- GitHub Actions
- GitHub Pages

## Páginas implementadas

- Home
- Explorar Problemas
- Explorar Soluções
- Detalhes do Problema
- Detalhes da Solução
- Cadastrar Problema
- Cadastrar Solução
- Sobre

## Como executar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

O artefato final é gerado em `dist/`.

## Deploy

O projeto inclui workflow de GitHub Actions para build e publicação no GitHub Pages. O deploy é disparado em pushes para `main` e também pode ser iniciado manualmente pela aba Actions.

## Estrutura principal

```text
src/
  components/      Componentes reutilizáveis
  data/            Dados fictícios tipados
  lib/             Preparação para integrações futuras
  pages/           Páginas da aplicação
  types/           Tipos compartilhados
```

## Integração futura com Supabase

A integração ainda não está ativa para dados da aplicação. A infraestrutura inicial está documentada em [SUPABASE.md](SUPABASE.md), incluindo client, adapter, provider, diagnósticos, RLS, Auth, Storage e plano de migração futura. A rota `#/diagnostics` exibe o status atual sem substituir o `LocalStorageAdapter`.

## Como contribuir

Leia o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para entender o fluxo de contribuição, padrões de código e critérios para propostas.

## Licença

Este projeto é open source. A licença definitiva será definida antes da primeira versão pública estável.

## Decisões de arquitetura

As decisões sobre hash routing, persistência local, autorização no domínio, relação entre moderação/discussões/contribuições e limitações de segurança local estão documentadas em [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md).

## Sprint 13 — Supabase Auth e profiles

A aplicação usa Supabase Auth para autenticação, sessão e perfis quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão configuradas. Sem essas variáveis, o build continua válido e a interface mostra estado de Supabase não configurado.

- Cadastro: `signUp` envia apenas dados públicos editáveis; a confirmação de e-mail pode deixar a sessão nula até o usuário confirmar.
- Profile: a tabela `public.profiles` é criada por migration SQL e preenchida automaticamente por trigger em `auth.users`.
- Campos editáveis pelo formulário comum: `username`, `display_name`, `country`, `bio` e `avatar_url`; `role` não é editável pelo cliente.
- GitHub Actions: o build recebe `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de secrets, mas pull requests sem secrets continuam compilando.
- Domínios locais: problemas, soluções, comentários, reações, favoritos, contribuições e moderação continuam em localStorage via repositórios atuais.
- Limitações: permissões administrativas críticas em Supabase precisarão de claims confiáveis ou backend seguro em sprint posterior.

Consulte `SUPABASE.md` para aplicar e verificar manualmente a migração pelo SQL Editor.

## Sprint 17 — Autenticação social OAuth

A aplicação mantém e-mail/senha e adiciona login/cadastro social via Supabase Auth para Google, GitHub e Microsoft/Azure. O frontend usa apenas a anon key já existente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`), não usa service role, não armazena tokens manualmente e delega PKCE/estado ao fluxo padrão do Supabase.

### URLs de callback e redirects

A URL pública do GitHub Pages é `https://lucasegg.github.io/banco-de-solucoes/`. Como o app usa hash routing, o redirect OAuth é centralizado para a raiz física segura do Pages, preservando o base path e retornando ao hash após restaurar a sessão:

- Site URL no Supabase: `https://lucasegg.github.io/banco-de-solucoes/`
- Redirect URL permitida no Supabase: `https://lucasegg.github.io/banco-de-solucoes/`
- Redirect URL permitida no Supabase para callback OAuth: `https://lucasegg.github.io/banco-de-solucoes/?oauth=callback`
- Desenvolvimento local: cadastre também `http://localhost:5173/` e `http://localhost:5173/?oauth=callback`

Nos provedores externos, use a Callback URL do próprio Supabase Auth, no formato:

```text
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

### Providers configurados

- Google: habilite o provider Google no Supabase Auth e cadastre a callback do Supabase no OAuth Client do Google Cloud. Escopos solicitados: `openid email profile`.
- GitHub: habilite o provider GitHub no Supabase Auth e cadastre a callback do Supabase no GitHub OAuth App. Escopos solicitados: `read:user user:email`; não há solicitação de acesso a repositórios.
- Microsoft/Azure: habilite o provider `azure` no Supabase Auth e cadastre a callback do Supabase no Microsoft Entra ID. Escopos solicitados: `openid email profile`; não há solicitação de calendário, arquivos ou contatos.

### Migration de perfis

A migration da Sprint 17 atualiza a função `handle_new_auth_user_profile` para perfis criados por identidades sociais. Ela gera `username` inicial seguro e único, preenche `display_name` e `avatar_url` somente como valores iniciais quando o provedor envia metadados confiáveis, mantém `role` sempre como `member` e não sobrescreve campos já editados pelo usuário em logins posteriores.

### Limitações conhecidas

Não há vinculação manual de contas nesta sprint. Se um e-mail já existir com e-mail/senha ou outra identidade, o comportamento seguro depende das regras do Supabase Auth e o frontend apenas mostra uma mensagem explicativa; contas não são mescladas no cliente.
