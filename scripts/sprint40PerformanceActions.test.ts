import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const fallback = readFileSync(new URL('../src/components/RouteLoadingFallback.tsx', import.meta.url), 'utf8');
const translations = readFileSync(new URL('../src/i18n/locales/common.ts', import.meta.url), 'utf8');
const router = readFileSync(new URL('../src/routing/hashRouter.ts', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');

test('keeps direct hash routes declared for public, account, MFA and legal pages', () => {
  for (const path of ['/problems', '/solutions', '/contact', '/privacy', '/terms', '/lgpd', '/account', '/mfa-challenge', '/password-recovery']) {
    assert.match(router, new RegExp(`['\"]${path.replaceAll('/', '\\/')}['\"]`));
  }
  assert.match(router, /path\.startsWith\('\/problems\/'\)/);
  assert.match(router, /path\.startsWith\('\/solutions\/'\)/);
});

test('loads route pages on demand behind an accessible Suspense fallback', () => {
  for (const module of ['Home', 'ExploreProblems', 'PublicMap', 'Search', 'Contact', 'Privacy', 'Terms', 'Account', 'MfaChallenge', 'PasswordRecovery']) {
    assert.match(app, new RegExp(`const ${module} = lazy\\(`), `${module} must remain lazy`);
  }
  assert.match(app, /<Suspense fallback={<RouteLoadingFallback \/>}>/);
  assert.match(fallback, /role="status"/);
  assert.match(fallback, /aria-live="polite"/);
  assert.match(fallback, /aria-busy="true"/);
});

test('provides the route loading message in pt-BR and en-US', () => {
  assert.match(translations, /'route\.loading': 'Carregando página…'/);
  assert.match(translations, /'route\.loading': 'Loading page…'/);
  assert.match(fallback, /t\('route\.loading'\)/);
});

test('uses Node 24-compatible pinned action versions without changing workflow gates', () => {
  const actionPins = [...workflow.matchAll(/uses: ([^@\s]+)@([a-f0-9]{40}) # (v\d+(?:\.\d+){0,2})/g)];
  const actionVersions = new Map(actionPins.map(([, action, sha, version]) => [action, { sha, version }]));
  assert.ok(actionPins.length > 0, 'workflow must pin Actions by immutable SHA with readable version comments');
  assert.doesNotMatch(workflow, /uses: [^\n]+@v\d+(?:\s|$)/, 'mutable Action tags are not allowed');
  assert.equal(actionVersions.get('actions/checkout')?.version.split('.')[0], 'v5');
  assert.equal(actionVersions.get('actions/setup-node')?.version.split('.')[0], 'v5');
  for (const [action, expectedMajor] of Object.entries({
    'dorny/paths-filter': 'v3',
    'denoland/setup-deno': 'v2',
    'actions/upload-artifact': 'v7',
    'actions/download-artifact': 'v7',
    'actions/configure-pages': 'v6',
    'actions/upload-pages-artifact': 'v5',
    'actions/deploy-pages': 'v5',
  })) assert.equal(actionVersions.get(action)?.version.split('.')[0], expectedMajor, `${action} major must remain documented`);
  for (const gate of ['pull_request:', 'push:', 'workflow_dispatch:', 'production-preflight:', 'migrate-and-health:', 'deploy:']) {
    assert.ok(workflow.includes(gate), `${gate} gate must remain present`);
  }
});
