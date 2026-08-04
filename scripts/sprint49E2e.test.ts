import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = readFileSync('playwright.config.ts', 'utf8');
const fixture = readFileSync('e2e/fixtures.ts', 'utf8');
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const env = readFileSync('.env.e2e', 'utf8');
const main = readFileSync('src/main.tsx', 'utf8');
const harness = readFileSync('e2e/E2EHarness.tsx', 'utf8');
const inertNotifications = readFileSync('e2e/E2ENotificationsProvider.tsx', 'utf8');

test('preview is controlled and traces are failure-only', () => {
  assert.match(config, /--strictPort/); assert.match(config, /trace: 'retain-on-failure'/);
  assert.match(config, /screenshot: 'only-on-failure'/); assert.match(config, /viewport: \{ width: 320/);
  assert.doesNotMatch(config, /waitForTimeout|sleep/);
});

test('fixtures fail closed against production and contain no privileged secret', () => {
  assert.match(fixture, /route\.abort\('blockedbyclient'\)/);
  assert.match(env, /127\.0\.0\.1:4173\/__e2e_supabase/);
  assert.doesNotMatch(`${fixture}\n${env}`, /service[_-]?role|supabase\.co|resend\.com/i);
  assert.match(fixture, /expectedHttpErrors/);
  assert.match(fixture, /error\.url\.includes\(endpoint\)/);
  assert.match(fixture, /status of \${status}/);
  assert.doesNotMatch(fixture, /message\.(?:includes|startsWith)\(['\"]Failed to load resource/);
  assert.match(env, /VITE_E2E_FIXTURES=true/);
  assert.match(main, /VITE_E2E_FIXTURES === 'true'[\s\S]*import\('\.\.\/e2e\/E2EHarness'\)/);
  assert.match(main, /initialLocale=\{useE2EFixtures \? 'pt-BR' : undefined\}/);
  assert.match(harness, /E2ENotificationsProvider/);
  assert.doesNotMatch(harness, /import \{ NotificationsProvider \}/);
  assert.doesNotMatch(inertNotifications, /supabase|WebSocket|setTimeout|setInterval|subscribe|NotificationRealtimeSubscription/i);
});

test('E2E follows verify, keeps failure artifacts, and blocks the deploy path', () => {
  const e2e = workflow.slice(workflow.indexOf('  e2e:'), workflow.indexOf('  production-preflight:'));
  assert.match(e2e, /needs: verify/); assert.match(e2e, /timeout-minutes: 15/);
  assert.match(e2e, /if: failure\(\)/); assert.doesNotMatch(e2e, /secrets\.|deploy|environment:/);
  assert.match(workflow, /migrate-and-health:[\s\S]*needs: \[verify, e2e\]/);
  assert.match(workflow, /production-preflight:[\s\S]*if: github\.event_name == 'workflow_dispatch'/);
});
