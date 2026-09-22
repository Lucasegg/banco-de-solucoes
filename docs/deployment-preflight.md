# Preflight de produção antes do merge

## Objetivo

O preflight valida antes do merge condições que dependem do ambiente remoto e não são
comprovadas apenas pelos testes locais. A documentação pública não reproduz nomes ou
valores da configuração usada para autenticar os diagnósticos.

## Diagnóstico

O diagnóstico usa endpoints estáveis do backend para dados, autenticação e armazenamento.
A autenticação necessária é fornecida pelo ambiente protegido do CI. A saída não deve
mostrar cabeçalhos, corpos privados ou detalhes internos de infraestrutura.

## O que bloqueia o deploy

Em pushes para `main`, `migrate-and-health` executa instalação, restauração do build,
validação da configuração, vínculo do projeto, baseline, lista de migrations, validação
de pendências, `db push`, configuração do Pages e upload do artifact. Falha em migration,
baseline ou histórico impede o deploy.

## Como executar

1. Abra **Actions → Verify, migrate and deploy → Run workflow**.
2. Informe a branch da PR ou o SHA exato.
3. Aguarde o workflow e confirme o SHA validado.
4. Registre na revisão apenas URL do run, SHA e resultado.

O preflight faz checkout, instalação, testes, build, validações de migration, vínculo
remoto, listagem do histórico e prévia do push. Ele não publica Pages, não executa repair
e não aplica migrations.

## Regra de merge

Production Preflight verde é obrigatório antes do merge quando a PR altera migrations,
workflows, scripts de diagnóstico/baseline/deploy ou configuração do banco. Em falha,
não faça merge: corrija a causa e execute novamente no novo SHA.
