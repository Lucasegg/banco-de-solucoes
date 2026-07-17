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

O domínio oficial e canônico é **https://www.bancodesolucoes.com.br/**. O projeto continua usando GitHub Actions e GitHub Pages como infraestrutura de publicação; a antiga URL `lucasegg.github.io/banco-de-solucoes/` é somente uma compatibilidade técnica temporária e não deve ser divulgada aos usuários.

O build usa a raiz `/`, copia `public/CNAME` para `dist/CNAME` e é publicado em pushes para `main`. No GitHub Pages, selecione **GitHub Actions** como origem, configure o domínio personalizado `www.bancodesolucoes.com.br` e habilite HTTPS. No Registro.br, aponte o DNS de `www` para o host do GitHub Pages conforme a documentação vigente do GitHub e redirecione o domínio sem `www` para o oficial. Não configure um path de projeto como base.

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

A aplicação mantém e-mail/senha e adiciona login/cadastro social via Supabase Auth para Google, GitHub e Microsoft/Azure. O frontend usa apenas a anon key já existente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`), não usa service role, não armazena tokens manualmente e configura o Supabase Auth com PKCE explícito (`flowType: pkce`) e `detectSessionInUrl: false` para manter o callback sob controle da aplicação.

### URLs de callback e redirects

O OAuth é centralizado no domínio oficial, preserva o hash de retorno e troca uma única vez o parâmetro `code` por sessão antes de limpar todos os parâmetros do callback:

- Site URL no Supabase: `https://www.bancodesolucoes.com.br/`
- Redirect URL permitida no Supabase: `https://www.bancodesolucoes.com.br/`
- Redirect URL permitida no Supabase para callback OAuth: `https://www.bancodesolucoes.com.br/?oauth=callback`
- Desenvolvimento local: cadastre também `http://localhost:5173/` e `http://localhost:5173/?oauth=callback`

Durante a transição, mantenha temporariamente no allowlist do Supabase o callback legado já cadastrado, apenas para concluir tentativas iniciadas antes do deploy. O frontend nunca o gera para uma nova tentativa. Remova-o após a janela de transição. Origens diferentes de localhost, domínio oficial (com ou sem `www`) e host legado não são aceitas pelo consumidor de callback.

Nos provedores externos, use a Callback URL do próprio Supabase Auth, no formato:

```text
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

### Providers configurados

- Google: habilite o provider Google no Supabase Auth e cadastre a callback do Supabase no OAuth Client do Google Cloud. Configure as origens autorizadas com o domínio oficial. Escopos solicitados: `openid email profile`.
- GitHub: habilite o provider GitHub no Supabase Auth e cadastre a callback do Supabase no GitHub OAuth App; use o domínio oficial na Homepage URL. Escopos solicitados: `read:user user:email`; não há solicitação de acesso a repositórios.
- Microsoft/Azure: habilite o provider `azure` no Supabase Auth e cadastre a callback do Supabase no Microsoft Entra ID; use o domínio oficial nas configurações web aplicáveis. Escopos solicitados: `openid email profile`; não há solicitação de calendário, arquivos ou contatos.

### Migration de perfis

A migration da Sprint 17 atualiza a função `handle_new_auth_user_profile` para perfis criados por identidades sociais. Ela gera `username` inicial seguro e único, preenche `display_name` e `avatar_url` somente como valores iniciais quando o provedor envia metadados confiáveis, mantém `role` sempre como `member` e não sobrescreve campos já editados pelo usuário em logins posteriores.

### Limitações conhecidas

Não há vinculação manual de contas nesta sprint. Se um e-mail já existir com e-mail/senha ou outra identidade, o comportamento seguro depende das regras do Supabase Auth e o frontend apenas mostra uma mensagem explicativa; contas não são mescladas no cliente.

## Sprint 18 — Recuperação de senha por código

O fluxo `#/password-recovery` solicita o e-mail, confirma um OTP dentro da aplicação e, somente depois de o Supabase estabelecer uma sessão de recuperação, permite definir a nova senha. A implementação usa exclusivamente `resetPasswordForEmail`, `verifyOtp({ type: 'recovery' })`, `updateUser({ password })` e `signOut({ scope: 'local' })`; código e senha existem apenas no estado React e nunca são gravados ou registrados. O reenvio tem cooldown visual de 60 segundos. O limite definitivo de tentativas, a expiração e a entrega pertencem ao Supabase Auth.

### Template de e-mail obrigatório

Por padrão, o template de recuperação pode enviar apenas um link. Em **Authentication → Email Templates → Reset Password**, adapte o template para mostrar `{{ .Token }}` (o OTP destinado a `verifyOtp`), e não para pedir que o frontend extraia ou armazene token de uma URL. Não use `{{ .TokenHash }}` no campo de código: esse valor é destinado a links de confirmação (`token_hash`), enquanto esta interface envia o `token` digitado com o tipo `recovery`. Exemplo mínimo de conteúdo: “Seu código de recuperação é: `{{ .Token }}`”. Não inclua credenciais ou chaves no template ou no repositório.

Em **Authentication → URL Configuration**, configure:

- Site URL: `https://www.bancodesolucoes.com.br/`;
- Redirect URL de produção: `https://www.bancodesolucoes.com.br/` (a tela oficial é `https://www.bancodesolucoes.com.br/#/password-recovery`, mas o hash é navegação local e não deve ser usado como redirect do servidor);
- desenvolvimento: `http://localhost:5173/` (e a porta efetivamente usada pelo Vite, se diferente).

Em **Authentication → Rate Limits**, defina limites compatíveis com o produto para envio de e-mails e verificação de OTP. Em **Authentication → Settings**, escolha o tempo de expiração do OTP (o padrão/configuração exata deve ser conferido no projeto e comunicado ao usuário; recomenda-se um período curto). O cooldown de 60 segundos do navegador melhora a experiência, mas pode ser reiniciado por reload e não substitui esses controles do servidor.

### Comportamento e limitações

- A resposta de envio é neutra para não revelar se a conta existe. Erros de código também não distinguem código inválido, expirado, usado ou pertencente a outro e-mail.
- Ao concluir, a sessão temporária é encerrada antes do retorno a `#/login`; não há login automático. Ao cancelar, somente uma sessão marcada em memória como recuperação é encerrada, preservando sessões normais.
- Um reload antes da verificação descarta e-mail e código, exigindo reiniciar o fluxo. Depois da verificação, um marcador booleano não sensível em `sessionStorage` permite restaurar diretamente a etapa de nova senha enquanto a sessão oficial do Supabase continua válida. OTP, senha, access token, refresh token e recovery token nunca são armazenados nesse marcador, que é removido ao concluir, cancelar ou receber `SIGNED_OUT`.
- A confirmação de que a senha antiga deixou de funcionar e a nova funciona exige teste integrado contra um projeto Supabase configurado e uma caixa de e-mail real.
