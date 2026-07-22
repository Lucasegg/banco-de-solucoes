# Preflight de produção antes do merge

## Por que ele existe

Até a PR #40, a CI de pull requests validava testes e build, enquanto o fluxo que aplicava migrations e consultava os serviços remotos só era executado após o merge em `main`. Por isso, uma PR podia ficar verde e ainda falhar na produção. A falha atual ilustra a lacuna: o health check tentou chamar `POST /rest/v1/rpc/get_system_health` e recebeu HTTP 404 porque essa RPC não está disponível remotamente.

O gate de deploy não usa mais RPCs customizadas, incluindo `get_system_health` e `audit_legacy_schema`. O `check:database` consulta somente endpoints estáveis, autenticados com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`:

- `GET /rest/v1/` para a API de dados;
- `GET /auth/v1/settings` para autenticação;
- `GET /storage/v1/bucket` para armazenamento.

Os três precisam responder HTTP 200. O script não mostra credenciais, cabeçalhos, corpos de resposta nem detalhes de infraestrutura.

## O que ainda bloqueia o deploy

Em pushes para `main`, `migrate-and-health` continua executando, nesta ordem: instalação, restauração do build, validação de secrets, link do projeto, baseline, lista de migrations, validação de migrations pendentes, `db push`, endpoints de serviço, configuração do Pages e upload do artifact. Uma falha em migration, baseline ou endpoint impede o job `deploy`, que depende desse job.

## Como executar o preflight

1. Abra **Actions** > **Verify, migrate and deploy** > **Run workflow**.
2. Informe a branch da PR ou o SHA exato do commit que será revisado.
3. Aguarde o workflow verde e copie o URL do run e o SHA efetivamente validado exibido pelo checkout.
4. Registre ambos na revisão/descrição da PR, junto com o resultado.

O job `production-preflight`, no workflow já existente de deploy, usa o environment `production-preflight`, que pode ser protegido nas configurações do repositório. Ele só roda em `workflow_dispatch`, faz checkout do ref informado, `npm ci`, testes, build, validações de migration, link, `migration list --linked`, `db push --dry-run` e `check:database`. Ele não publica Pages, não executa `migration repair` e não aplica migrations. A CLI fixada (`2.39.2`) oferece `db push --dry-run`; se uma futura versão removê-lo, o preflight deve falhar em vez de usar uma flag inventada. Nesse caso, mantenha `migration list --linked`, os testes estáticos e a validação em banco local, documente a limitação e restaure uma prévia suportada antes de aprovar o merge.

## Regra de merge

É obrigatório um Production preflight verde antes do merge de uma PR que altere qualquer um destes caminhos:

- `supabase/migrations/**`;
- `.github/workflows/**`;
- `scripts/checkDatabase.ts`;
- scripts de baseline ou de deploy;
- configuração do banco.

O workflow verde da PR, isoladamente, **não** significa que é seguro fazer merge. A revisão deve registrar o link do run, o commit SHA e o resultado. Em caso de falha, não faça merge: corrija a causa, execute novamente no novo SHA e registre o novo run. Nunca contorne a falha com `continue-on-error`, retry que oculte erro, RPC de diagnóstico ou `migration repair` automático.
