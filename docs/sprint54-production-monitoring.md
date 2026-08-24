# Sprint 54 — monitoramento operacional da versão pública 1.0

## Finalidade, frequência e custo

O workflow **Daily production health monitor** detecta regressões públicas após o lançamento sem deploy, migrations, escrita no Supabase, publicação de Edge Function, alteração no Pages, analytics ou coleta de dados pessoais. Ele reutiliza integralmente `test:production-smoke` e sua barreira fail-closed de mutações.

Executa uma vez ao dia às **11:00 UTC (08:00 de Brasília, UTC-3)** e também sob demanda. São esperados cerca de 30 runs por mês, cada um limitado a 10 minutos em runner Linux (até 300 minutos/mês no limite; normalmente menos), mais retenção por três dias apenas quando falhar. Consulte os minutos disponíveis no plano do repositório porque faturamento e franquia dependem da conta GitHub.

## Execução e interpretação

Em **Actions → Daily production health monitor → Run workflow**, selecione `main` e confirme. O workflow não recebe secrets. O nome do teste, a rota passada ao helper e a mensagem de cada assertion identificam o contrato quebrado. O summary registra o resultado; em falha, baixe `production-monitor-failure-<run-id>` para abrir o relatório, screenshot e `trace.zip`. Os artefatos contêm apenas navegação pública e alvos de requisição sanitizados, nunca query strings, credenciais ou formulário enviado.

Matriz: raiz/HTTPS e assets; `#/search`; `#/problems`; `#/solutions`; `#/mapa`; `#/contact` (sem submissão); `#/privacy`; `#/terms`; `#/lgpd`; uma rota inexistente/404; `/robots.txt`; `/sitemap.xml`; canonical raiz; versão `1.0.0`; erros críticos de console e página em todas as navegações.

## Diferença entre gates

- **CI:** valida código da revisão, testes, build, segurança e orçamento antes de publicar; não afirma que produção atual está saudável.
- **Production Preflight:** valida manualmente gates e estado operacional antes do deploy, incluindo inspeções administrativas protegidas e dry-run de migrations; não publica.
- **Monitor agendado:** observa diariamente apenas superfícies públicas já publicadas, sem secrets e somente leitura; não compila nem corrige produção.

## Incidente, rollback e pausa emergencial

Checklist inicial: confirme se a falha reproduz manualmente; identifique rota/contrato e projeto desktop/320; verifique domínio, certificado, Pages e assets; preserve run/trace; compare com o último run verde; avalie impacto e pause merges. Não tente “validar” enviando o Fale Conosco nem alterando dados.

Rollback é indicado para indisponibilidade persistente, assets essenciais 4xx/5xx, erro JavaScript que bloqueie fluxo público, violação legal/SEO relevante ou risco de escrita/exposição. Faça revert por PR do SHA instável, rode CI e Preflight e valide smoke após o deploy; siga o runbook da Sprint 50. Falha transitória isolada deve ser confirmada antes de rollback.

Para pausar emergencialmente sem mudar permissões, desabilite **Daily production health monitor** em **Actions → workflow → … → Disable workflow**. Reabilite no mesmo menu após registrar e mitigar a causa; não apague o cron nem conceda permissões adicionais.
