# Sprint 37 — Fale Conosco

## Arquitetura e privacidade

O formulário público chama `contact-request`, uma Supabase Edge Function. Ela valida novamente o payload, rejeita categorias desconhecidas e o honeypot, limita cinco tentativas por IP/hora e só aceita origens de uma allowlist. Nenhuma solicitação é persistida: os dados existem apenas durante o encaminhamento, evitando uma migration e reduzindo retenção de dados pessoais. O destinatário jamais vem do navegador.

O adaptador de envio usa a API transacional do Resend por ser compatível com `fetch` no runtime Edge. O HTML é escapado, o assunto não aceita quebras de linha e somente o e-mail validado vira `reply_to`. A função não registra payloads nem respostas do provedor e devolve erros genéricos.

> O rate limit em memória atua por instância. Para ambientes de alto tráfego, uma futura evolução deve adotar um contador distribuído (por exemplo, Upstash) sem armazenar conteúdo ou identidade do contato.

## Configuração

Cadastre e verifique no Resend o domínio de `CONTACT_FROM_EMAIL`. Configure, exclusivamente como secrets do Supabase:

```sh
supabase secrets set RESEND_API_KEY=... CONTACT_ADMIN_EMAIL=... CONTACT_FROM_EMAIL=... CONTACT_ALLOWED_ORIGINS=https://app.exemplo
supabase functions deploy contact-request --no-verify-jwt
```

`CONTACT_ALLOWED_ORIGINS` aceita origens exatas separadas por vírgula, sem barra final. Defina `CONTACT_ADMIN_EMAIL` com o endereço administrativo. Nunca use prefixo `VITE_` nesses quatro valores. O cliente precisa apenas de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, já existentes.

## Verificação controlada

Depois de configurar os secrets em um projeto de homologação, envie uma mensagem sintética pela interface a partir de uma origem permitida. Confirme recebimento, assunto, campos escapados e `reply-to`; apague o e-mail de teste. Não use dados pessoais reais nem rode essa verificação em testes automatizados. O repositório não afirma entrega real sem essa etapa com credenciais.
