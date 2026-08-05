import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import pkg from '../package.json' with { type: 'json' };

const read = (path: string) => readFileSync(path, 'utf8');

test('versão pública 1.0.0 é única e documentada', () => {
  assert.equal(pkg.version, '1.0.0');
  assert.match(read('src/version.ts'), /PUBLIC_VERSION = '1\.0\.0'/);
  assert.match(read('docs/release/sprint-53-public-1.0.md'), /package\.json[\s\S]*src\/version\.ts/);
});

test('SEO público cobre rotas estáveis e exclui rotas privadas', () => {
  const seoSource = read('src/seo.ts');
  const required = ['home','problemas','solucoes','mapa','search','sobre','contact','privacy','terms','lgpd'];
  for (const route of required) {
    assert.match(seoSource, new RegExp(`${route}: \{[\\s\\S]*index: true`), `${route} must be indexable`);
  }
  for (const route of ['admin','login','register','password-recovery','mfa-challenge','account','profile','notifications']) assert.match(seoSource, /fallback, index: false/);
});

test('index.html tem canonical, Open Graph e Twitter Card básicos', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.bancodesolucoes\.com\.br\/"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /name="twitter:card" content="summary"/);
});

test('robots e sitemap listam somente rotas públicas estáveis', () => {
  const robots = read('public/robots.txt');
  const sitemap = read('public/sitemap.xml');
  assert.match(robots, /Sitemap: https:\/\/www\.bancodesolucoes\.com\.br\/sitemap\.xml/);
  for (const route of ['/#/problems','/#/solutions','/#/mapa','/#/search','/#/about','/#/contact','/#/privacy','/#/terms','/#/lgpd']) assert.match(sitemap, new RegExp(`https://www\\.bancodesolucoes\\.com\\.br${route.replaceAll('/', '\\/')}`));
  for (const forbidden of ['admin','login','register','password-recovery','mfa-challenge','account','profile','notifications','callback']) assert.doesNotMatch(sitemap, new RegExp(forbidden));
});

test('contratos essenciais de acessibilidade estão presentes', () => {
  const layout = read('src/components/Layout.tsx');
  assert.match(layout, /href="#main-content"/);
  assert.match(layout, /<main id="main-content"/);
  assert.equal((layout.match(/<main /g) ?? []).length, 1);
  assert.match(layout, /focus:not-sr-only/);
  assert.match(read('src/styles.css'), /focus-visible/);
  assert.match(layout, /aria-label=\{t\('language\.label'\)\}/);
});

test('documentação operacional preserva HashRouter, sem scripts novos de terceiros ou migrations', () => {
  const doc = read('docs/release/sprint-53-public-1.0.md');
  assert.match(doc, /HashRouter/);
  assert.match(doc, /Não foram adicionados analytics, cookies ou scripts de terceiros/);
  assert.match(doc, /não inclui migrations/i);
  assert.match(read('docs/release/release-manifest-template.md'), /Este manifesto não deve conter secrets/);
});
