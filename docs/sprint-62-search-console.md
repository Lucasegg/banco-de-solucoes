# Sprint 62 — acompanhamento de indexação no Google Search Console

Este checklist é operacional: não registra como concluída nenhuma ação que dependa do Google. O responsável deve preencher data, responsável, evidência e observações a cada revisão, sem incluir credenciais ou dados pessoais no repositório.

## Cadência e registro

- Revisar semanalmente durante as quatro semanas posteriores ao deploy e, depois, mensalmente.
- Comparar os dados com o deploy anterior; métricas do Search Console podem levar alguns dias para estabilizar.
- Registrar a data do deploy e o intervalo consultado: `____`.
- Registrar responsável e link interno da evidência: `____`.

## Checklist

| Área | Verificação no Search Console | Situação | Evidência / observações |
| --- | --- | --- | --- |
| Sitemap | Enviar `https://www.bancodesolucoes.com.br/sitemap.xml`; confirmar sucesso e última leitura | Pendente | ____ |
| Descoberta | Conferir se as nove URLs públicas foram descobertas e se não há URL com `#` | Pendente | ____ |
| Indexação | Conferir quantas das nove URLs estão indexadas; inspecionar individualmente as ausentes | Pendente | ____ |
| Cobertura | Revisar “Por que as páginas não estão indexadas”, duplicadas, canonical divergente, bloqueios e erros 4xx/5xx | Pendente | ____ |
| Core Web Vitals | Revisar grupos mobile e desktop, especialmente LCP, INP e CLS; abrir issue com URL e evidência para falhas | Pendente | ____ |
| Ações manuais | Confirmar que não existem ações manuais | Pendente | ____ |
| Segurança | Confirmar que não existem problemas de segurança | Pendente | ____ |

## Critérios de triagem

1. Não solicitar indexação de rotas privadas ou URLs legadas com fragmento.
2. Antes de solicitar nova validação, confirmar HTTP 200, `index,follow`, canonical próprio e presença no sitemap.
3. Tratar queda de páginas indexadas, ação manual ou alerta de segurança como incidente; seguir `docs/operations-runbook.md`.
4. Abrir issue para Core Web Vitals reprovado com dispositivo, grupo de URLs, métrica, período e captura; não elevar orçamento de bundle como correção automática.
5. A decisão final de indexação pertence ao mecanismo de busca; “descoberta” não equivale a “indexada”.
