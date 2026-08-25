# Contribuindo com o Banco de Soluções

Obrigado por considerar contribuir. O projeto busca ser simples, aberto e acolhedor para pessoas de diferentes níveis técnicos.

## Como começar

1. Leia o README e o PRD.
2. Crie uma branch exclusiva a partir de `main` atualizado e instale com `npm ci`.
3. Rode o projeto com `npm run dev`.
4. Antes de abrir uma proposta, execute `npm run build`.

## Padrões de código

- Use TypeScript para todos os módulos de aplicação.
- Prefira componentes pequenos e nomes claros.
- Mantenha dados mockados em `src/data`.
- Mantenha tipos compartilhados em `src/types`.
- Evite dependências novas sem justificativa.
- Não envolva imports com `try/catch`.

## Fluxo obrigatório de sprint e correção

- Nunca desenvolva ou faça push diretamente em `main`; use uma branch curta e descritiva.
- Faça commits pequenos e focados e mantenha o lockfile coerente.
- Execute os gates aplicáveis, `git diff --check`, build e E2E antes da revisão.
- Explique problema, causa, solução, migrations, dependências, secrets, RLS e impacto de deploy no Pull Request.
- Inclua screenshots quando alterar interface.
- Documente decisões relevantes.
- Execute Production Preflight no SHA final quando tocar banco, workflow ou entrega;
  não faça merge com qualquer gate pendente ou vermelho.
- Aguarde revisão completa. O autor da implementação não deve tratar a abertura da PR
  como autorização para merge.

## Critérios para novas funcionalidades

Toda funcionalidade deve responder:

- Qual problema ela resolve?
- Como ela ajuda a conectar problemas, soluções, pessoas, empresas ou projetos?
- Ela mantém a experiência simples?
- Ela prepara ou dificulta a evolução para dados reais?

## Reportando problemas

Ao abrir uma issue, inclua:

- Contexto do problema.
- Passos para reproduzir, quando aplicável.
- Resultado esperado.
- Evidências, prints ou logs.
