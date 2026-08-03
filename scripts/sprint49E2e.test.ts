import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync('playwright.config.ts', 'utf8');
const fixture = readFileSync('e2e/fixtures.ts', 'utf8');
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const env = readFileSync('.env.e2e', 'utf8');

test('preview is controlled and traces are failure-only', () => {
  assert.match(config, /--strictPort/); assert.match(config, /trace: 'retain-on-failure'/);
  assert.match(config, /screenshot: 'only-on-failure'/); assert.match(config, /viewport: \{ width: 320/);
  assert.doesNotMatch(config, /waitForTimeout|sleep/);
});

test('fixtures fail closed against production and contain no privileged secret', () => {
  assert.match(fixture, /route\.abort\('blockedbyclient'\)/);
  assert.match(env, /127\.0\.0\.1:4173\/__e2e_supabase/);
  assert.doesNotMatch(`${fixture}\n${env}`, /service[_-]?role|supabase\.co|resend\.com/i);
});

test('E2E follows verify, keeps failure artifacts, and never joins deploy', () => {
  const e2e = workflow.slice(workflow.indexOf('  e2e:'), workflow.indexOf('  production-preflight:'));
  assert.match(e2e, /needs: verify/); assert.match(e2e, /timeout-minutes: 15/);
  assert.match(e2e, /if: failure\(\)/); assert.doesNotMatch(e2e, /secrets\.|deploy|environment:/);
  assert.match(workflow, /production-preflight:[\s\S]*if: github\.event_name == 'workflow_dispatch'/);
});
