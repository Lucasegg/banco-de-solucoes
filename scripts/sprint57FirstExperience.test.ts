import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const home = read('src/pages/Home.tsx');
const locale = read('src/i18n/locales/home.ts');
const footer = read('src/components/InstitutionalFooter.tsx');
const workflow = read('.github/workflows/deploy.yml');

test('principal CTAs use existing public routes', () => {
  for (const route of ['search', 'problemas', 'mapa', 'contact']) {
    assert.match(home, new RegExp(`page=\\"${route}\\"`));
  }
  for (const key of ['home.searchSolutions', 'home.exploreProblems', 'home.openMap', 'home.requestSupport']) {
    assert.match(home, new RegExp(key.replace('.', '\\.')));
  }
});

test('visitor, authenticated member, and administrator receive possible actions only', () => {
  assert.match(home, /isAuthenticated \? <>/);
  assert.match(home, /page="login"/);
  assert.match(home, /page="novo-problema"/);
  assert.match(home, /permissions\.canAccessAdmin && <Action page="admin"/);
});

test('four-step guidance and first contribution rules are bilingual', () => {
  for (let step = 1; step <= 4; step += 1) assert.equal((locale.match(new RegExp(`home\\.how\\.step${step}\\.title`, 'g')) ?? []).length, 2);
  for (const key of ['home.guide.problem', 'home.guide.solution', 'home.guide.sources', 'home.guide.moderation']) {
    assert.equal((locale.match(new RegExp(key.replaceAll('.', '\\.'), 'g')) ?? []).length, 2);
  }
  assert.match(home, /<ol className=/);
});

test('semantic keyboard controls and legal/contact links remain available', () => {
  assert.doesNotMatch(home, /onClick=.*<div/);
  assert.match(home, /aria-labelledby="how-it-works"/);
  for (const route of ['#\/contact', '#\/privacy', '#\/terms', '#\/lgpd']) assert.ok(footer.includes(route));
});

test('Sprint 57 contract is part of CI without changing data gates', () => {
  assert.match(workflow, /npm run test:sprint57/);
  assert.match(workflow, /npm run security:audit/);
  assert.match(workflow, /npm run test:pending-migrations/);
});
