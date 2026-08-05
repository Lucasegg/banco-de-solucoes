# Sprint 52 — Governança de dependências e estabilidade das atualizações automáticas

## Causa

Após a Sprint 51, o Dependabot abriu várias PRs simultâneas. A configuração semanal era correta, mas os limites ainda permitiam excesso de filas, grupos amplos de npm e majors de GitHub Actions separadas que consumiam CI sem decisão humana prévia. A `concurrency.group` anterior (`pages-${{ github.event_name }}`) colocava todas as PRs no mesmo grupo; isso não cancelava PRs diferentes porque `cancel-in-progress` era `false`, mas serializava checks independentes e amplificava a tempestade de execuções.

## Arquitetura adotada

- npm e GitHub Actions continuam separados, semanais e mirando `main`.
- npm fica limitado a 2 PRs abertas; GitHub Actions fica limitado a 1 PR aberta.
- Grupos são somente `patch` e `minor`; majors nunca entram em grupo.
- TailwindCSS 3 → 4 fica explicitamente adiado por `ignore` de major.
- GitHub Actions major ficam bloqueadas por `ignore` geral de `version-update:semver-major`.
- PRs usam concurrency por número da PR (`ci-pr-{n}`), cancelando apenas execuções antigas da mesma PR.
- Pushes para `main` usam o grupo único `deploy-main`, mantendo migrations, deploy e smoke serializados.
- Production Preflight manual usa grupo por ref informado e não faz deploy.

## Auditoria das PRs abertas pelo Dependabot em 2026-08-05

| PR | Atualização | Classificação | Decisão |
| --- | --- | --- | --- |
| #87 | `actions/setup-node` 5.0.0 → 7.0.0 | GitHub Action major com possível mudança de runtime | Fechar ou adiar; exigir sprint dedicada, changelog, revisão de runtime e nova pinagem por SHA. |
| #88 | grupo `npm-compatible-patches` com 4 updates | patch segura, sujeita ao audit/build/E2E | Revisar primeiro; pode ser aceita se changelogs não indicarem quebra e todos os gates ficarem verdes. |
| #89 | `actions/checkout` 5.1.0 → 7.0.1 | GitHub Action major com possível mudança de runtime | Fechar ou adiar; não aceitar apenas por automação. |
| #90 | `actions/download-artifact` 7.0.0 → 8.0.1 | GitHub Action major com possível mudança de runtime | Fechar ou adiar; validar runtime, permissões, artefatos e pin SHA em sprint própria. |
| #92 | grupo `npm-compatible-minors` com 3 updates | minor compatível em tese | Revisar separadamente dos patches; aceitar apenas com changelog sem breaking changes, audit limpo, build, budget e E2E verdes. |
| #93 | `tailwindcss` 3.4.19 → 4.3.3 | major incompatível ou que exige sprint dedicada | Fechar ou adiar; TailwindCSS 4 está fora da Sprint 52. |

## Procedimento operacional

1. Não fazer merge automático de PRs do Dependabot.
2. Para patch segura: conferir diff do lockfile, changelog, advisory quando existir, `npm run security:audit:report`, `npm run security:audit`, `npm test`, build, bundle budget e E2E crítico.
3. Para minor compatível: além dos passos de patch, verificar breaking changes documentadas, notas de migração, mudanças de peer dependencies e impacto no bundle.
4. Para major: criar sprint específica com plano de rollback, changelog completo, prova de compatibilidade e validação manual. Não misturar major com updates de rotina.
5. Para GitHub Actions: confirmar changelog oficial, runtime Node usado pela Action, permissões necessárias, manutenção da pinagem por SHA de 40 caracteres e comentário de versão legível.
6. PR cancelada por concorrência da mesma PR: reexecutar checks após o último push do mesmo branch.
7. PR falha com erro real: tratar como incompatibilidade até correção; não reexecutar indefinidamente.
8. PR incompatível ou fora de sprint: fechar com comentário apontando a sprint futura ou o motivo de adiamento.
9. Antes de aprovar merge em `main`, executar Production Preflight no SHA final e registrar o SHA validado.

## Preservações obrigatórias

A Sprint 52 não cria migrations e não remove migrations automatizadas, Production Preflight, auditorias de segurança, SBOM CycloneDX, E2E crítico, deploy, smoke somente-leitura de produção, Node 24.15.0 nem a política de zero exposição de secrets.
