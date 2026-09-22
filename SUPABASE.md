# Infraestrutura Supabase

## Estado atual

O Supabase é o backend real do ambiente de produção do Banco de Soluções. A aplicação publicada usa Supabase Auth, PostgreSQL com RLS, Realtime, Storage e Edge Functions conforme os domínios implementados.

A documentação abaixo descreve o estado operacional atual. Trechos de sprints antigas que tratavam Supabase como integração futura não representam mais a produção.

## Client

O client fica em `src/integrations/supabase/client.ts` e usa somente as variáveis públicas do Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Quando ausentes, ambientes locais podem operar sem conexão ao projeto remoto conforme o código permitir. Isso não altera o fato de que a produção publicada é conectada ao backend real.

O frontend nunca recebe credenciais administrativas, token de gerenciamento, senha do banco ou chave equivalente.

## Auth

A autenticação de produção usa Supabase Auth. O fluxo inclui cadastro/login, sessão e os recursos implementados no produto, com perfis persistidos em PostgreSQL e autorização apoiada por RLS/RPCs.

Metadados enviados pelo cliente não podem conceder papel administrativo. Papel, autoria e permissões persistentes devem ser validados pelo backend.

## PostgreSQL e RLS

O schema de produção é versionado em `supabase/migrations/`. Tabelas persistentes usam RLS e regras específicas de domínio. Em termos gerais:

- leitura pública somente onde os dados são efetivamente públicos;
- escritas autenticadas limitadas por autoria/contrato;
- moderação e administração exigem papel autorizado;
- operações sensíveis podem ser encapsuladas em RPCs;
- auditoria e histórico são preservados quando previstos.

A interface não substitui RLS. Esconder controles é apenas defesa em profundidade.

## Storage

Supabase Storage é usado nos fluxos que possuem buckets e policies versionados. Uploads devem respeitar tipo, tamanho, autoria e escopo definidos pelo produto. Buckets/policies não devem ser ampliados sem revisão de segurança.

## Realtime

Realtime é usado nos domínios que possuem contrato explícito, como notificações. Alterações de publicação/assinatura exigem migration e revisão para não expor linhas além do permitido.

## Edge Functions

`supabase/functions/contact-request` implementa o fluxo server-side do Fale Conosco. A função valida entrada/consentimento, aplica as proteções previstas e integra o serviço de e-mail configurado no ambiente.

Secrets da função são mantidos no provedor/ambiente de execução. A documentação e o código nunca devem conter valores reais.

## Migrations e deploy

O pipeline da `main`:

1. executa testes, auditorias, build e E2E;
2. valida secrets obrigatórios sem imprimir seus valores;
3. vincula o projeto Supabase configurado;
4. verifica baseline e lista local/remoto;
5. valida migrations pendentes;
6. executa `supabase db push`;
7. publica a Edge Function prevista;
8. prepara e publica o frontend;
9. executa smoke de produção somente leitura.

Migrations já aplicadas são imutáveis. Mudanças de banco devem entrar como migration nova e, quando aplicável, ser validadas também em PostgreSQL isolado e por Production Preflight antes do merge.

## Configuração e segredos

Somente nomes de configuração são documentados. Nunca versione ou copie para Markdown valores reais de:

- tokens de gerenciamento;
- senhas de banco;
- chaves administrativas/server-side;
- segredos de OAuth;
- chaves de serviços de e-mail;
- salts ou outros segredos operacionais.

Se houver suspeita de exposição, rotacione a credencial no provedor e trate o incidente conforme o runbook.

## Diagnósticos e operação

Diagnósticos administrativos devem ser executados somente por usuários autorizados e sem exibir secrets, tokens, headers sensíveis ou corpos de resposta que revelem credenciais.

Para operação, baseline, rollback e incidentes consulte:

- [Arquitetura](ARCHITECTURE.md)
- [Persistência](PERSISTENCE.md)
- [Segurança](SECURITY.md)
- [Deployment preflight](docs/deployment-preflight.md)
- [Runbook operacional](docs/operations-runbook.md)
