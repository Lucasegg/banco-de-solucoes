# Sprint 37 — Fale Conosco

## Arquitetura e privacidade

O formulário público chama `contact-request`, uma Supabase Edge Function. O handler valida novamente o payload, rejeita categorias desconhecidas, consentimento ausente e o honeypot e só aceita origens de uma allowlist. Nome, e-mail, assunto e mensagem não são persistidos: existem apenas durante o encaminhamento.

O adaptador usa a API transacional do Resend por ser compatível com `fetch` no runtime Edge. O HTML é escapado, o assunto não aceita CR/LF e somente o e-mail validado vira `reply_to`. A função não registra payloads nem respostas do provedor e devolve erros genéricos.

## Rate limiting distribuído

A migration aditiva `20260729120000_sprint37_contact_rate_limit.sql` cria `contact_rate_limits` e a RPC atômica `claim_contact_rate_limit`. Antes de chamar a RPC com a service role, a Edge Function deriva um identificador HMAC-SHA-256 do IP observado pelo gateway usando `CONTACT_RATE_LIMIT_SECRET`. O banco nunca recebe nem armazena o IP puro ou outros dados do formulário.

O `INSERT ... ON CONFLICT DO UPDATE ... WHERE attempts < 5` serializa concorrência para o mesmo identificador e janela, inclusive entre instâncias. São permitidas cinco tentativas por hora. Registros expiram após duas horas e a própria RPC remove registros expirados. A tabela possui RLS habilitada e forçada, nenhuma policy e nenhum grant direto; somente `service_role` pode executar a função `SECURITY DEFINER`, que possui `search_path` fixo. Assertions em PostgreSQL real verificam estrutura, RLS, privilégios, expiração e comportamento do limite.

## Configuração

Cadastre e verifique no Resend o domínio usado por `CONTACT_FROM_EMAIL`. Configure exclusivamente como secrets do Supabase:

```sh
supabase secrets set RESEND_API_KEY=... CONTACT_ADMIN_EMAIL=... CONTACT_FROM_EMAIL=... CONTACT_ALLOWED_ORIGINS=... CONTACT_RATE_LIMIT_SECRET=...
supabase functions deploy contact-request --no-verify-jwt
```

Requisitos de produção:

- `CONTACT_ADMIN_EMAIL` deve apontar para `lucas.gomes.rosendo@gmail.com.br`;
- `CONTACT_ALLOWED_ORIGINS` deve conter exatamente a origem oficial de produção, sem barra final (múltiplas origens exatas são separadas por vírgula);
- `CONTACT_FROM_EMAIL` deve usar um domínio verificado no Resend;
- `CONTACT_RATE_LIMIT_SECRET` deve ser aleatório, longo e exclusivo deste ambiente;
- nenhum desses valores pode usar prefixo `VITE_` ou ser incluído no bundle do navegador.

O cliente precisa apenas de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, já existentes. O Production Preflight consulta `supabase secrets list`, mantém o resultado capturado e valida apenas os nomes obrigatórios sem imprimir valores ou digests.

## Verificação controlada

Depois de configurar os secrets em um projeto de homologação, envie uma mensagem sintética pela interface a partir de uma origem permitida. Confirme recebimento, assunto, campos escapados e `reply-to`; depois apague o e-mail de teste. Não use dados pessoais reais nem rode essa verificação em testes automatizados. O envio real somente pode ser declarado funcional após essa verificação controlada com credenciais configuradas.
