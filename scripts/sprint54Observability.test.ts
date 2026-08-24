import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const workflow = read('.github/workflows/production-monitor.yml');
const smoke = read('e2e/production-smoke.spec.ts');

test('workflow diário e manual usa permissões mínimas, limites e Actions imutáveis', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:[\s\S]*cron: '0 11 \* \* \*'/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /concurrency:[\s\S]*production-health-monitor[\s\S]*cancel-in-progress: false/);
  assert.match(workflow, /timeout-minutes: 10/);
  assert.match(workflow, /node-version-file: \.nvmrc/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  for (const line of workflow.split('\n').filter(line => line.includes('uses:'))) {
    assert.match(line, /uses: [^@]+@[a-f0-9]{40} # v\d/, `Action sem SHA imutável e versão: ${line}`);
  }
});

test('monitor reutiliza smoke somente leitura e não contém operação de publicação', () => {
  assert.match(workflow, /npm run test:production-smoke/);
  assert.match(smoke, /classifyProductionRequest/);
  assert.match(smoke, /requests mutáveis bloqueados antes de chegar à produção/);
  assert.doesNotMatch(workflow, /\b(?:deploy-pages|configure-pages|upload-pages|db push|migration|functions deploy|supabase)\b/i);
  assert.doesNotMatch(workflow, /secrets\./);
});

test('contratos públicos, SEO e versão estão cobertos no domínio oficial', () => {
  assert.match(workflow, /https:\/\/www\.bancodesolucoes\.com\.br/);
  for (const route of ['search', 'problems', 'solutions', 'mapa', 'contact', 'privacy', 'terms', 'lgpd']) assert.match(smoke, new RegExp(route));
  assert.match(smoke, /robots\.txt/);
  assert.match(smoke, /sitemap\.xml/);
  assert.match(smoke, /canonical/);
  assert.match(smoke, /application-version[\s\S]*1\.0\.0/);
  assert.match(smoke, /Página não encontrada/);
  assert.match(smoke, /consoleErrors[\s\S]*pageErrors/);
});

test('diagnóstico só é preservado na falha com retenção curta', () => {
  assert.match(workflow, /if: failure\(\)[\s\S]*actions\/upload-artifact/);
  assert.match(workflow, /playwright-report\/[\s\S]*test-results\//);
  assert.match(workflow, /retention-days: 3/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
});

test('documentação, manifesto e privacidade são explícitos', () => {
  const docs = `${read('docs/sprint54-production-monitoring.md')}\n${read('docs/release/1.0.0-manifest.md')}`;
  for (const term of ['Production Preflight', '11:00 UTC', '08:00 de Brasília', 'rollback', 'pausar', 'PR #95', 'PR #100', 'nanoid']) assert.match(docs, new RegExp(term, 'i'));
  assert.match(read('docs/release/release-manifest-template.md'), /<preencher no release>/);
  assert.match(docs, /sem deploy[\s\S]*analytics[\s\S]*dados pessoais/i);
  assert.doesNotMatch(`${workflow}\n${smoke}`, /google-analytics|googletagmanager|fingerprint|pixel\b/i);
});

test('verify executa o contrato da Sprint 54', () => {
  assert.match(read('.github/workflows/deploy.yml'), /Sprint 54 observability contract tests[\s\S]*npm run test:sprint54/);
});
