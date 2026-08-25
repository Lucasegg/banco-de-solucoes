import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const requiredDocs = [
  'README.md',
  'ARCHITECTURE.md',
  'docs/operations-runbook.md',
  'docs/sprint-60-final-audit.md',
  'docs/release-1.0-manifesto.md',
];
const docs = Object.fromEntries(requiredDocs.map((path) => [path, read(path)]));
const combined = Object.values(docs).join('\n');
const workflow = read('.github/workflows/deploy.yml');
const monitor = read('.github/workflows/production-monitor.yml');
const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

test('documentos finais existem e o README funciona como índice sem duplicar o runbook', () => {
  for (const path of requiredDocs) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
  for (const link of ['ARCHITECTURE.md', 'docs/operations-runbook.md', 'docs/sprint-60-final-audit.md', 'docs/release-1.0-manifesto.md', 'CONTRIBUTING.md']) {
    assert.ok(docs['README.md'].includes(link), `link ausente no README: ${link}`);
  }
  assert.ok(docs['README.md'].length < 6_000, 'README deve permanecer um ponto de entrada conciso');
});

test('handoff ancora o merge da Sprint 59 e limita afirmações à evidência', () => {
  const baseline = '6acf9ed60d9c60ec74d1bf287650e7f428c926d5';
  for (const path of ['docs/sprint-60-final-audit.md', 'docs/release-1.0-manifesto.md']) {
    assert.ok(docs[path].includes(baseline), `${path} não registra o baseline`);
  }
  assert.match(combined, /32802239294/);
  assert.match(combined, /ECONNRESET/);
  assert.match(docs['docs/release-1.0-manifesto.md'], /CANDIDATA, NÃO ENCERRADA/);
  assert.match(docs['docs/release-1.0-manifesto.md'], /PENDENTES?.*SHA final/is);
  assert.doesNotMatch(combined, /Sprint 60[^\n]{0,80}(?:foi|está|ficou) (?:integralmente )?(?:aprovada|verde|concluída)/i);
});

test('arquitetura registra frontend, Supabase, RLS, Edge Function e dependências', () => {
  const architecture = docs['ARCHITECTURE.md'];
  for (const contract of ['## Frontend', '## Supabase, migrations e RLS', '## Autenticação e autorização', '## Entrega e operação', 'supabase/functions/contact-request', 'GitHub Pages', 'Resend']) {
    assert.ok(architecture.includes(contract), `contrato arquitetural ausente: ${contract}`);
  }
  for (const impact of ['Migrations criadas ou alteradas: **não**', 'RLS ou permissões alteradas: **não**', 'Dependências ou lockfile modificados: **não**', 'Impacto no deploy']) {
    assert.ok(docs['docs/sprint-60-final-audit.md'].includes(impact), `impacto ausente: ${impact}`);
  }
});

test('runbook contém preflight, monitor, rollback, incidentes e diagnóstico não destrutivo', () => {
  const runbook = docs['docs/operations-runbook.md'];
  for (const heading of ['## Saúde de produção', '## Production Preflight', '## Daily production health monitor', '## Como interpretar os gates', '## Migration falhou', '## Deploy ou smoke falhou', '## Fale Conosco', '## Domínio, DNS e certificado', '## Rollback e resposta a incidentes', '## Responsabilidades do administrador']) {
    assert.ok(runbook.includes(heading), `seção ausente: ${heading}`);
  }
  for (const safeguard of ['nenhuma assertion funcional quebrou', 'execução seguinte passa inteira', 'migration compensatória', 'não faça force-push', 'nunca são removidas']) {
    assert.match(runbook, new RegExp(safeguard, 'i'));
  }
});

test('documentação lista somente nomes de secrets, sem atribuições ou tokens reais', () => {
  for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_DB_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'CONTACT_FROM_EMAIL', 'CONTACT_TO_EMAIL']) {
    assert.ok(combined.includes(name), `nome de secret ausente: ${name}`);
  }
  assert.doesNotMatch(combined, /(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ACCESS_TOKEN|RESEND_API_KEY)\s*=\s*[^\s$<"']+/);
  assert.doesNotMatch(combined, /(?:eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|re_[A-Za-z0-9_-]{20,})/);
});

test('gate Sprint 60 é bloqueante e mantém os gates e workflows principais', () => {
  assert.equal(packageJson.scripts['test:sprint60'], 'node --experimental-strip-types --test scripts/sprint60FinalHandoff.test.ts');
  for (const command of ['test:sprint57', 'test:sprint58', 'test:sprint59', 'test:sprint60', 'security:audit:report', 'security:audit', 'test:pending-migrations', 'build', 'check:bundle-budget']) {
    assert.match(workflow, new RegExp(`npm run ${command.replace(':', '\\:')}`), command);
  }
  const sprint60Step = workflow.match(/- name: Sprint 60[^\n]*\n\s+run: npm run test:sprint60/)?.[0] ?? '';
  assert.ok(sprint60Step);
  assert.doesNotMatch(sprint60Step, /continue-on-error|\|\|\s*true/);
  for (const job of ['verify:', 'production-preflight:', 'migrate-and-health:', 'deploy:', 'production-smoke:']) assert.match(workflow, new RegExp(`^  ${job}`, 'm'));
  assert.match(workflow, /^name: Verify, migrate and deploy$/m);
  assert.match(monitor, /^name: Daily production health monitor$/m);
});

test('auditoria cobre todas as áreas pedidas e confirma smoke sem mutações', () => {
  const audit = docs['docs/sprint-60-final-audit.md'];
  for (const area of ['Jornadas públicas e busca', 'Autenticação e recuperação', 'Primeira contribuição', 'Administração e moderação', 'Taxonomia e busca', 'Notificações', 'Perfis públicos', 'Contato/e-mail', 'Legal, consentimento e LGPD', 'Acessibilidade/responsividade', 'pt-BR/en-US', 'Monitoramento', 'Rotas protegidas', 'Smoke sem mutações']) {
    assert.ok(audit.includes(area), `área de auditoria ausente: ${area}`);
  }
  assert.match(audit, /bloqueia POST\/PUT\/PATCH\/DELETE antes da rede/);
});
