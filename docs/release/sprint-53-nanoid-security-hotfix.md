# Sprint 53 — hotfix do gate de segurança

## Contexto e causa raiz

O [Actions #352](https://github.com/Lucasegg/banco-de-solucoes/actions/runs/32739035895) bloqueou build, E2E, deploy e smoke da Sprint 53 porque o gate de auditoria encontrou `nanoid@3.3.16`, vulnerável a indisponibilidade por loop infinito em geradores customizados quando o tamanho é zero (`GHSA-2v37-7h3g-55p8`, faixa `<3.3.18`).

Na árvore de produção, a dependência direta que introduz a cadeia é `vite@8.1.4`:

```text
banco-de-solucoes@1.0.0
└─ vite@8.1.4 (dependência direta de produção)
   └─ postcss@8.5.25 (^8.5.16)
      └─ nanoid@3.3.16 (^3.3.12) — vulnerável
```

`postcss@8.5.25` também é declarado diretamente como dependência de desenvolvimento e é compartilhado por `autoprefixer` e `tailwindcss`, mas essa entrada de desenvolvimento não é o motivo de `nanoid` permanecer no grafo de `npm audit --omit=dev`.

## Correção mínima e compatibilidade

O lockfile passa a resolver `nanoid` em `3.3.18`, primeira versão corrigida. A faixa já declarada por `postcss@8.5.25` (`^3.3.12`) aceita essa atualização patch; portanto não é necessário alterar `vite`, `postcss`, o manifesto ou adicionar `overrides`. Atualizar a dependência direta aumentaria o escopo sem alterar a cadeia responsável. Nenhuma major foi introduzida.

```text
banco-de-solucoes@1.0.0
└─ vite@8.1.4 (inalterado)
   └─ postcss@8.5.25 (inalterado)
      └─ nanoid@3.3.18 — corrigido
```

Versão alterada: somente `nanoid`, de `3.3.16` para `3.3.18`, com URL e integridade fixadas no `package-lock.json` para instalação determinística.

## Impacto

- Vulnerabilidades `high`/`critical` de produção após a correção: **zero** (confirmado por `npm audit --omit=dev --json --offline` com o banco de advisories em cache).
- Bundle da aplicação: **sem impacto**; o build permaneceu dentro do orçamento (`index`: 264.605/288.000 bytes; `client`: 205.331/226.000; `leaflet`: 148.814/164.000; `I18nProvider`: 140.828/155.000; CSS: 36.197/39.000). `nanoid` pertence ao toolchain de build e nenhuma dependência ou fonte de runtime foi alterada.
- Migrations: **nenhuma**.
- Alterações funcionais não relacionadas: **nenhuma**.
- Gate: mantido integralmente; `scripts/securityAudit.ts` não foi alterado.

Esta PR é exclusivamente corretiva e desbloqueia o deploy da Sprint 53 sem realizar o merge.
