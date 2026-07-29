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

test('uses Node 24-compatible action majors without changing workflow gates', () => {
  assert.doesNotMatch(workflow, /actions\/(checkout|setup-node)@v4/);
  assert.match(workflow, /actions\/checkout@v5/);
  assert.match(workflow, /actions\/setup-node@v5/);
  for (const gate of ['pull_request:', 'push:', 'workflow_dispatch:', 'production-preflight:', 'migrate-and-health:', 'deploy:']) {
    assert.ok(workflow.includes(gate), `${gate} gate must remain present`);
  }
});
