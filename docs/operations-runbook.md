# Runbook operacional da versão 1.0

## Saúde de produção

1. Confirme que o último **Verify, migrate and deploy** de `main` tem `verify`,
   `migrate-and-health`, `deploy` e `production-smoke` verdes e corresponde ao SHA esperado.
2. Confirme o último **Daily production health monitor** verde.
3. Abra o domínio canônico por HTTPS, confira certificado, home, `robots.txt`,
   `sitemap.xml` e `manifest.webmanifest`; não execute escrita como teste casual.
4. Se necessário, um administrador consulta `#/admin/system`; nunca copie tokens para logs.

“Workflow verde” é evidência apenas do SHA mostrado pelo checkout. Ausência de run,
job ignorado ou resultado antigo não comprova saúde atual.

## Production Preflight

Em **Actions → Verify, migrate and deploy → Run workflow**, informe a branch ou SHA
final em `ref`. O job `production-preflight` executa instalação, contratos, auditoria,
build, bundle, baseline, `migration list --linked` e `db push --dry-run`; não publica
nem aplica migration. Registre URL, SHA e resultado na PR. Ative diagnóstico de serviços
somente quando necessário. Mais detalhes: [deployment-preflight.md](deployment-preflight.md).

## Daily production health monitor

Em **Actions → Daily production health monitor → Run workflow**, selecione a branch/SHA
que contém o contrato a validar. O job roda `npm run test:production-smoke` contra o
domínio canônico e guarda artifacts apenas em falha. Por ser também agendado, confira
sempre o SHA do checkout: um agendamento de `main` não valida automaticamente uma branch.

## Como interpretar os gates

| Gate | Significado verde | Ação quando vermelho |
|---|---|---|
| `verify` | typecheck, contratos, auditoria, build e orçamento aprovados | corrigir assertion/código; não flexibilizar o gate |
| E2E | jornadas determinísticas em dois viewports | reproduzir pelo spec e guardar trace |
| migrations / preflight | histórico e prévia remota coerentes | interromper; comparar lista local/remota e SQL |
| `migrate-and-health` | migration aplicada e artifact preparado | não publicar; seguir recuperação abaixo |
| `deploy` | artifact aceito pelo Pages | verificar environment/artifact; redeploy só após causa |
| smoke | domínio publicado satisfaz contratos read-only | comparar SHA, asset, console, DNS e resposta HTTP |

Nenhum desses jobs usa `continue-on-error` para transformar falha bloqueante em sucesso.

## Migration falhou

Não edite uma migration já aplicada, não use `--include-all`, não faça `repair` às cegas
e não repita até “passar”. Preserve logs, execute `migration list --linked`, determine se
houve aplicação parcial e restaure em staging. Corrija por nova migration compensatória,
aditiva e idempotente, revisada em PR; valide banco local, preflight e backup. Aplique
somente pelo pipeline. Operações destrutivas exigem plano aprovado fora deste runbook.

## Deploy ou smoke falhou

- **Deploy:** confirme que `verify` e `migrate-and-health` passaram, o artifact pertence
  ao SHA e o environment Pages não está bloqueado. Corrija configuração/código em PR.
- **Smoke:** identifique a assertion funcional exata. Compare rede, DNS/certificado,
  status do provedor e asset publicado. Uma assertion funcional quebrada é regressão,
  mesmo que uma repetição ocasional passe.
- **Transiência:** reexecução só é evidência aceitável quando a causa exata é operacional
  e registrada, nenhuma assertion funcional quebrou e a execução seguinte passa inteira.
  Exemplo histórico: no pós-merge da Sprint 59, a primeira leitura de
  `manifest.webmanifest` sofreu `ECONNRESET`; a reexecução integral verde, sem assertion
  quebrada, sustentou a classificação de falha transitória.
- **PR corretiva obrigatória:** bug reproduzível, assertion funcional, diferença de SHA,
  migration/schema divergente, falha recorrente ou causa desconhecida. Não reexecute para
  ocultar intermitência.

## Fale Conosco

Confira logs da Edge Function `contact-request` por request ID, resultado do provedor
Resend, remetente/domínio verificado e caixa de destino (incluindo spam). Não registre
mensagem, e-mail completo ou credenciais em issue. Um teste real envia dados: obtenha
autorização, use conteúdo identificável como teste e confirme consentimento/rate limit;
o smoke de produção nunca envia formulário.

## Domínio, DNS e certificado

Confirme `public/CNAME`, domínio customizado/HTTPS no GitHub Pages, CNAME de `www` no
provedor DNS e redirecionamento do apex. Use `dig www.bancodesolucoes.com.br CNAME`,
`curl -I https://www.bancodesolucoes.com.br/` e inspecione emissor/validade do certificado.
Não troque DNS por tentativa; registre TTL e resolução em mais de um resolvedor.

## Secrets e serviços externos

Somente nomes (nunca valores): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`,
`CONTACT_TO_EMAIL`, `CONTACT_ALLOWED_ORIGINS` e `CONTACT_RATE_LIMIT_SALT`.
Serviços: GitHub Pages/Actions, Supabase, Resend, Registro.br/DNS e provedores OAuth.
Rotacione no console do fornecedor diante de exposição; nunca envie valores por PR.

## Rollback e resposta a incidentes

1. Conter: suspenda merge/deploy, preserve run, logs, SHA, horários e impacto; revogue
   credencial somente se houver evidência de exposição.
2. Diagnosticar com consultas somente leitura. Não apague dados, não faça force-push,
   `migration repair`, rollback SQL destrutivo ou alteração improvisada de RLS/DNS.
3. Para frontend, reverta por PR o commit defeituoso e publique novamente o artifact
   conhecido. Para banco, restaure em staging e crie migration compensatória; migrations
   aplicadas nunca são removidas. Para DNS/serviço, reverta apenas a mudança registrada.
4. Rode todos os gates, preflight, deploy e smoke; registre causa raiz, correção e
   prevenção. Escale ao responsável administrativo quando identidade, dados pessoais,
   disponibilidade prolongada ou credenciais estiverem envolvidos.

## Responsabilidades do administrador

Revisar fila de contribuições e denúncias com justificativa auditável; limitar concessão
de papel; acompanhar saúde, custos, rate limits e entregabilidade; manter DNS, OAuth e
secrets; atender direitos LGPD conforme política; preservar evidências e backups. Nunca
moderar ou elevar permissão usando conta compartilhada.
