import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalForPage, seoForPage } from '../src/seo.ts';
import { pageFromLocation, urlFromPage } from '../src/routing/hashRouter.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const publicPages = ['problems', 'solutions', 'mapa', 'about', 'contact', 'privacy', 'terms', 'lgpd'];

test('rotas públicas possuem URL limpa e mantêm hashes legados', () => {
  assert.equal(pageFromLocation('/about/', ''), 'sobre');
  assert.equal(pageFromLocation('/', '#/about'), 'sobre');
  assert.equal(urlFromPage('contact'), '/contact/');
  assert.equal(urlFromPage('login'), '/#/login');
});

test('canonical é específico e rotas privadas não são indexadas', () => {
  assert.equal(canonicalForPage('privacy'), 'https://www.bancodesolucoes.com.br/privacy/');
  assert.equal(seoForPage('privacy').index, true);
  assert.equal(seoForPage('login').index, false);
  assert.equal(seoForPage('problema:abc').index, false);
  assert.equal(seoForPage('search').index, false);
});

test('sitemap contém somente URLs públicas servidas com HTTP 200', () => {
  const sitemap = read('public/sitemap.xml');
  for (const path of ['', ...publicPages]) {
    const suffix = path ? `${path}/` : '';
    assert.ok(sitemap.includes(`<loc>https://www.bancodesolucoes.com.br/${suffix}</loc>`), path || 'home');
  }
  assert.doesNotMatch(sitemap, /#/);
});

test('build gera entradas SEO e dados estruturados da página inicial', () => {
  const generator = read('scripts/generateSeoEntrypoints.ts');
  const index = read('index.html');
  const vite = read('vite.config.ts');
  for (const path of publicPages) {
    assert.ok(generator.includes(`path: '${path}'`), path);
    assert.ok(vite.includes(`'${path}'`), path);
  }
  assert.match(index, /application\/ld\+json/);
  assert.match(index, /"@type": "WebSite"/);
});
