# Deploy e diagnóstico

## Pré-requisitos

- Node.js 24+, projeto Supabase e Supabase CLI autenticada.
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no build.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` e um `SUPABASE_ACCESS_TOKEN` de administrador somente no CI seguro.

## Procedimento

1. Faça backup e execute `supabase db push`. Migrations futuras devem usar `IF NOT EXISTS` para objetos/dados e `CREATE OR REPLACE FUNCTION` para funções.
2. Execute `npm test`, `npm run test:sprint26`, `npm run build` e `npm run check:database`.
3. Publique `dist/` e valide `#/admin/system` com uma conta `admin`.

O diagnóstico confere conectividade, versão, RPCs e colunas críticas sem alterar dados. Falhas retornam exit code não zero. O endpoint é restrito a administradores; prefira token administrativo de curta duração.

## Rollback e observabilidade

Reverta primeiro o frontend. Não apague migrations aplicadas: crie uma migration compensatória idempotente e registre uma nova versão. Consulte logs com prefixo `BancoDeSolucoes`, logs do PostgREST e a página administrativa; nunca registre tokens ou dados pessoais.
