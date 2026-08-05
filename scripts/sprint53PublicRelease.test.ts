import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import pkg from '../package.json' with { type: 'json' };
import { seoForPage } from '../src/seo.ts';

const read = (path: string) => readFileSync(path, 'utf8');

test('versão pública 1.0.0 é única e documentada', () => {
  assert.equal(pkg.version, '1.0.0');
  assert.match(read('src/version.ts'), /PUBLIC_VERSION = '1\.0\.0'/);
  assert.match(read('docs/release/sprint-53-public-1.0.md'), /package\.json[\s\S]*src\/version\.ts/);
});

test('seoForPage marca rotas públicas esperadas como indexáveis', () => {
  const routes = ['home','problemas','solucoes','mapa','search','sobre','contact','privacy','terms','lgpd','problema:123','solucao:456','member:ana'];
  for (const route of routes) {
    const seo = seoForPage(route);
    assert.equal(seo.index, true, `${route} must be indexable`);
    assert.match(seo.title, /Banco de Soluções/);
    assert.ok(seo.description.length >= 40, `${route} must have a specific description`);
  }
});

test('seoForPage marca rotas administrativas, privadas e sensíveis como noindex', () => {
  const privateRoutes = ['admin','login','register','password-recovery','mfa-challenge','account','profile','notifications'];
  for (const route of privateRoutes) assert.equal(seoForPage(route).index, false, `${route} must be noindex`);
});

test('SEO usa canonical e og:url raiz enquanto não há rotas HTTP reais', () => {
  const html = read('index.html');
  const seo = read('src/seo.ts');
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.bancodesolucoes\.com\.br\/"/);
  assert.match(html, /property="og:url" content="https:\/\/www\.bancodesolucoes\.com\.br\/"/);
  assert.match(seo, /const canonical = `\$\{OFFICIAL_ORIGIN\}\/`/);
  assert.doesNotMatch(seo, /canonical = `\$\{OFFICIAL_ORIGIN\}.*#/);
});

test('robots e sitemap publicam somente a URL HTTP raiz canônica sem fragmentos', () => {
  const robots = read('public/robots.txt');
  const sitemap = read('public/sitemap.xml');
  assert.match(robots, /Sitemap: https:\/\/www\.bancodesolucoes\.com\.br\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/www\.bancodesolucoes\.com\.br\/<\/loc>/);
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 1);
  assert.doesNotMatch(sitemap, /#/);
  for (const forbidden of ['admin','login','register','password-recovery','mfa-challenge','account','profile','notifications','callback']) assert.doesNotMatch(sitemap, new RegExp(forbidden));
});

test('contratos essenciais de acessibilidade e skip link sem mutação de hash estão presentes', () => {
  const layout = read('src/components/Layout.tsx');
  assert.match(layout, /preventDefault\(\)/);
  assert.match(layout, /getElementById\('main-content'\)\?\.focus/);
  assert.match(layout, /href="#main-content"/);
  assert.match(layout, /onClick=\{focusMainContent\}/);
  assert.match(layout, /<main id="main-content"/);
  assert.equal((layout.match(/<main /g) ?? []).length, 1);
  assert.match(layout, /focus:not-sr-only/);
  assert.match(read('src/styles.css'), /focus-visible/);
  assert.match(layout, /aria-label=\{t\('language\.label'\)\}/);
});

test('documentação operacional preserva HashRouter, não promete indexação hash e declara ausência de migrations', () => {
  const doc = read('docs/release/sprint-53-public-1.0.md');
  assert.match(doc, /HashRouter/);
  assert.match(doc, /títulos client-side não garantem indexação independente/);
  assert.match(doc, /rotas HTTP reais, SSR ou prerenderização/);
  assert.match(doc, /sitemap\.xml` lista somente a URL HTTP raiz canônica/);
  assert.match(doc, /Não foram adicionados analytics, cookies ou scripts de terceiros/);
  assert.match(doc, /não inclui migrations/i);
  assert.match(read('docs/release/release-manifest-template.md'), /Este manifesto não deve conter secrets/);
});
