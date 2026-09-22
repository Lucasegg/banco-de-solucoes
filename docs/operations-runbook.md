# Runbook operacional da versão 1.0

## Saúde de produção

1. Confirme que o último **Verify, migrate and deploy** da `main` está verde no SHA esperado.
2. Confirme o último **Daily production health monitor** verde.
3. Abra o domínio canônico por HTTPS e confira os recursos públicos.
4. Diagnósticos administrativos devem permanecer privados.

“Workflow verde” é evidência apenas do SHA mostrado pelo checkout.

## Production Preflight

Em **Actions → Verify, migrate and deploy → Run workflow**, informe a branch ou SHA final.
O preflight executa contratos, auditoria, build, baseline e prévia remota sem publicar ou
aplicar migration. Registre URL, SHA e resultado na PR.

## Daily production health monitor

Execute o monitor contra a revisão pretendida e confira sempre o SHA do checkout.
O smoke é somente leitura.

## Como interpretar os gates

| Gate | Significado verde | Ação quando vermelho |
|---|---|---|
| `verify` | contratos, auditoria e build aprovados | corrigir a causa |
| E2E | jornadas determinísticas | reproduzir pelo spec |
| migrations / preflight | histórico e prévia coerentes | interromper e auditar |
| `migrate-and-health` | banco e artifact preparados | não publicar em falha |
| `deploy` | artifact publicado | verificar revisão |
| smoke | revisão publicada satisfaz contratos read-only | comparar SHA e ambiente |

## Migration falhou

Não edite migration aplicada nem altere histórico às cegas. Preserve evidências,
determine aplicação parcial e corrija por migration compensatória revisada.

## Deploy ou smoke falhou

Identifique a assertion exata, compare SHA, artifact, rede e DNS e corrija por PR quando
houver regressão. Reexecução só é evidência quando a causa transitória é conhecida.

## Fale Conosco

Confira a Edge Function e o provedor de e-mail usando apenas identificadores seguros de
requisição. Não registre conteúdo de usuário ou configuração interna em issue.

## Domínio, DNS e certificado

Confirme domínio customizado, HTTPS, DNS e certificado. Não altere DNS por tentativa.

## Configuração operacional

A documentação pública não lista nomes exatos nem valores de variáveis de ambiente,
credenciais, chaves, senhas, salts, identificadores de projeto ou endereços internos.
Consulte os arquivos operacionais apropriados somente com acesso autorizado.

Serviços externos incluem GitHub Pages/Actions, Supabase, provedor de e-mail, DNS e OAuth.

## Rollback e resposta a incidentes

Contenha, preserve evidências, diagnostique em modo leitura, reverta frontend por PR e
banco por migration compensatória. Não faça alterações destrutivas improvisadas.

## Responsabilidades do administrador

Revisar moderação, limitar papéis, acompanhar saúde e custos, manter integrações, atender
LGPD e preservar evidências/backups sem compartilhar configuração protegida.
