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

test('documentos finais existem e README funciona como índice', () => {
  for (const path of requiredDocs) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
  for (const link of ['ARCHITECTURE.md', 'docs/operations-runbook.md', 'docs/sprint-60-final-audit.md', 'docs/release-1.0-manifesto.md', 'CONTRIBUTING.md']) {
    assert.ok(docs['README.md'].includes(link), `link ausente: ${link}`);
  }
  assert.ok(docs['README.md'].length < 6_000);
});

test('handoff preserva baseline histórico e estado publicado', () => {
  assert.ok(docs['docs/sprint-60-final-audit.md'].includes('6acf9ed60d9c60ec74d1bf287650e7f428c926d5'));
  assert.match(combined, /32802239294/);
  assert.match(combined, /ECONNRESET/);
  assert.match(docs['docs/release-1.0-manifesto.md'], /PUBLICADA E EM PRODUÇÃO/);
  assert.doesNotMatch(docs['docs/release-1.0-manifesto.md'], /CANDIDATA, NÃO ENCERRADA/);
});

test('arquitetura registra contratos principais', () => {
  const architecture = docs['ARCHITECTURE.md'];
  for (const contract of ['## Frontend', '## Supabase, migrations e RLS', '## Autenticação e autorização', '## Entrega e operação', 'supabase/functions/contact-request', 'GitHub Pages', 'Resend']) {
    assert.ok(architecture.includes(contract), contract);
  }
});

test('runbook mantém operação, rollback e incidentes', () => {
  const runbook = docs['docs/operations-runbook.md'];
  for (const heading of ['## Saúde de produção', '## Production Preflight', '## Daily production health monitor', '## Como interpretar os gates', '## Migration falhou', '## Deploy ou smoke falhou', '## Fale Conosco', '## Domínio, DNS e certificado', '## Rollback e resposta a incidentes', '## Responsabilidades do administrador']) {
    assert.ok(runbook.includes(heading), heading);
  }
  assert.match(runbook, /documentação pública não lista nomes exatos nem valores/i);
});

test('gate Sprint 60 permanece bloqueante', () => {
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

test('auditoria cobre áreas e smoke sem mutações', () => {
  const audit = docs['docs/sprint-60-final-audit.md'];
  for (const area of ['Jornadas públicas e busca', 'Autenticação e recuperação', 'Primeira contribuição', 'Administração e moderação', 'Taxonomia e busca', 'Notificações', 'Perfis públicos', 'Contato/e-mail', 'Legal, consentimento e LGPD', 'Acessibilidade/responsividade', 'pt-BR/en-US', 'Monitoramento', 'Rotas protegidas', 'Smoke sem mutações']) {
    assert.ok(audit.includes(area), area);
  }
  assert.match(audit, /bloqueia POST\/PUT\/PATCH\/DELETE antes da rede/);
});
