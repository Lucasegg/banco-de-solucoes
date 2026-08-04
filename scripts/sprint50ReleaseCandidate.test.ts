import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile('.github/workflows/deploy.yml', 'utf8');
const smoke = await readFile('e2e/production-smoke.spec.ts', 'utf8');
const smokeSafety = await readFile('scripts/productionSmokeSafety.ts', 'utf8');
const localAnonymous = await readFile('e2e/anonymous.spec.ts', 'utf8');
const overflowHelper = await readFile('e2e/overflow.ts', 'utf8');
const config = await readFile('playwright.production.config.ts', 'utf8');
const localConfig = await readFile('playwright.config.ts', 'utf8');
const budget = JSON.parse(await readFile('config/bundle-budget.json', 'utf8'));
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const productionJob = workflow.slice(workflow.indexOf('\n  production-smoke:'));

test('production-smoke sucede deploy e nunca roda em pull_request', () => {
  assert.match(productionJob, /needs: deploy/);
  assert.match(productionJob, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(productionJob, /pull_request/);
});

test('verify executa os testes da Sprint 50 antes do build', () => {
  const verify = workflow.slice(workflow.indexOf('\n  verify:'), workflow.indexOf('\n  e2e:'));
  const sprint50 = verify.indexOf('- name: Sprint 50 release candidate tests');
  const build = verify.indexOf('- name: Build');
  assert.ok(sprint50 > 0 && build > sprint50);
  assert.match(verify.slice(sprint50, build), /run: npm run test:sprint50/);
  assert.match(pkg.scripts['test:sprint50'], /sprint50ReleaseCandidate\.test\.ts/);
  assert.match(pkg.scripts['test:sprint50'], /productionEnvironment\.test\.ts/);
  assert.match(pkg.scripts['test:sprint50'], /productionSmokeSafety\.test\.ts/);
});

test('smoke é estritamente read-only e sem credenciais', () => {
  assert.doesNotMatch(smoke, /\.fill\(|\.check\(|\.click\([^\n]*Enviar|POST|PUT|PATCH|DELETE/i);
  assert.match(smoke, /classifyProductionRequest/);
  assert.match(smoke, /route\.abort\('blockedbyclient'\)/);
  assert.match(smoke, /sanitizedRequestTarget/);
  assert.doesNotMatch(productionJob, /secrets\.|SUPABASE_|service.role/i);
  assert.match(smokeSafety, /READ_ONLY_PUBLIC_RPC_PATHS/);
  assert.doesNotMatch(smokeSafety, /READ_ONLY_SEARCH_RPC_PATHS/);
  assert.match(smokeSafety, /'\/rest\/v1\/rpc\/list_taxonomy_terms'/);
  assert.match(smoke, /body: '\[\]'/);
});

test('locale do production smoke é explicitamente pt-BR', () => {
  assert.match(config, /locale: 'pt-BR'/);
  assert.match(smoke, /addInitScript/);
  assert.match(smoke, /document\.documentElement\.lang/);
  assert.match(smoke, /toBe\('pt-BR'\)/);
});

test('smoke aceita navegação same-document sem enfraquecer as validações', () => {
  assert.match(smoke, /if \(response\) \{[\s\S]*response\.ok\(\)/);
  assert.match(smoke, /toHaveURL\(new URL\(hash, PRODUCTION_ORIGIN\)\.href\)/);
  assert.match(smoke, /assertNoHorizontalOverflow/);
  assert.match(smoke, /requests mutáveis bloqueados/);
  assert.match(smoke, /pageerror em produção/);
  assert.match(smoke, /erros inesperados no console/);
});

test('diagnóstico de overflow expõe somente geometria e identificação visual', () => {
  for (const field of ['selector', 'tag', 'classes', 'width', 'left', 'right', 'clientWidth', 'scrollWidth']) {
    assert.match(overflowHelper, new RegExp(`\\b${field}\\b`));
  }
  assert.doesNotMatch(overflowHelper, /textContent|innerText|innerHTML|\.value/);
  assert.match(overflowHelper, /toBeLessThanOrEqual\(1\)/);
});

test('E2E local valida o overflow da home também no projeto mobile-320', () => {
  assert.match(localAnonymous, /heading[\s\S]*assertNoHorizontalOverflow\(page, 'home local'\)[\s\S]*Buscar/);
  assert.match(localConfig, /name: 'mobile-320'[\s\S]*width: 320/);
});

test('domínio é centralizado, HTTPS e validado', async () => {
  assert.match(workflow, /PRODUCTION_BASE_URL: https:\/\/www\.bancodesolucoes\.com\.br/);
  assert.match(config, /assertProductionSmokeTarget/);
  assert.equal((await readFile('public/CNAME', 'utf8')).trim(), 'www.bancodesolucoes.com.br');
});

test('E2E mutável tem proteção fail-closed', () => {
  assert.match(localConfig, /assertMutableE2eTargetIsSafe/);
});

test('retries, timeout e artefatos são limitados e somente em falha', () => {
  assert.match(productionJob, /timeout-minutes: 10/);
  assert.match(productionJob, /delays=\(5 10 20 30 45\)/);
  assert.match(config, /retries: 0/);
  assert.match(productionJob, /if: failure\(\)[\s\S]*production-smoke-failure/);
});

test('orçamento de bundle está ativo', () => {
  assert.ok(budget.budgets.length >= 5);
  assert.equal(pkg.scripts['check:bundle-budget'].includes('checkBundleBudget'), true);
  assert.match(workflow, /npm run check:bundle-budget/);
});

test('Production Preflight permanece isolado e sem deployment', () => {
  const preflight = workflow.slice(workflow.indexOf('\n  production-preflight:'), workflow.indexOf('\n  service-diagnostics:'));
  assert.match(preflight, /github\.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(preflight, /deploy-pages|upload-pages-artifact/);
});

test('pipeline de migrations preserva seus gates', () => {
  const migration = workflow.slice(workflow.indexOf('\n  migrate-and-health:'), workflow.indexOf('\n  deploy:'));
  for (const required of ['needs: [verify, e2e]', 'check:migration-baseline', 'migration list --linked', 'test:pending-migrations', 'db push']) assert.ok(migration.includes(required), required);
  assert.match(workflow.slice(workflow.indexOf('\n  deploy:')), /needs: migrate-and-health/);
});
