import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const origin = 'https://www.bancodesolucoes.com.br';
const pages = ['', 'problems', 'solutions', 'mapa', 'about', 'contact', 'privacy', 'terms', 'lgpd'] as const;
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/generateSocialCard.ts'], { cwd: root });
execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/generateSeoEntrypoints.ts'], { cwd: root });

function htmlFor(path: string) {
  return read(path ? `${path}/index.html` : 'index.html');
}
function meta(html: string, attribute: 'name' | 'property', key: string) {
  return html.match(new RegExp(`<meta ${attribute}="${key}" content="([^"]+)" \\/>`))?.[1];
}
function structuredData(html: string) {
  const source = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source, 'JSON-LD deve existir');
  return JSON.parse(source);
}

test('as nove páginas publicam metadados sociais completos e individuais', () => {
  for (const path of pages) {
    const html = htmlFor(path);
    const canonical = `${origin}/${path ? `${path}/` : ''}`;
    assert.equal(html.match(/<link rel="canonical" href="([^"]+)" \/>/)?.[1], canonical);
    assert.equal(meta(html, 'property', 'og:url'), canonical);
    for (const key of ['og:title', 'og:description', 'og:type', 'og:site_name', 'og:image']) assert.ok(meta(html, 'property', key), `${path || '/'}: ${key}`);
    assert.equal(meta(html, 'property', 'og:type'), 'website');
    assert.equal(meta(html, 'property', 'og:site_name'), 'Banco de Soluções');
    assert.equal(meta(html, 'name', 'twitter:card'), 'summary_large_image');
    for (const key of ['twitter:title', 'twitter:description', 'twitter:image']) assert.ok(meta(html, 'name', key), `${path || '/'}: ${key}`);
    assert.equal(meta(html, 'name', 'robots'), 'index,follow');
  }
});

test('JSON-LD descreve WebSite e Organization apenas na home e WebPage nas páginas internas', () => {
  const homeTypes = structuredData(htmlFor(''))['@graph'].map((entry: { '@type': string }) => entry['@type']);
  assert.deepEqual(homeTypes, ['WebSite', 'Organization']);
  for (const path of pages.slice(1)) {
    const graph = structuredData(htmlFor(path))['@graph'];
    assert.deepEqual(graph.map((entry: { '@type': string }) => entry['@type']), ['WebPage', 'BreadcrumbList']);
    assert.equal(graph[0].url, `${origin}/${path}/`);
    assert.equal(graph[1].itemListElement.length, 2);
  }
});

test('fonte Base64 textual gera PNG local otimizado em 1200 por 630', () => {
  const source = read('assets/social-card.png.base64');
  assert.doesNotMatch(source, /[^A-Za-z0-9+/=\s]/);
  const compact = source.replace(/\s/g, '');
  assert.match(compact, /^(?:[A-Za-z0-9+/]{4})+(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
  const image = Buffer.from(compact, 'base64');
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.ok(image.byteLength < 100_000, `imagem possui ${image.byteLength} bytes`);
  assert.ok(existsSync(new URL('public/social-card.png', root)), 'o gerador deve materializar o PNG público');
  assert.deepEqual(readFileSync(new URL('public/social-card.png', root)), image);
  assert.equal(execFileSync('git', ['ls-files', '--', 'public/social-card.png'], { cwd: root, encoding: 'utf8' }), '');
  assert.match(execFileSync('git', ['check-ignore', 'public/social-card.png'], { cwd: root, encoding: 'utf8' }), /public\/social-card\.png/);
  for (const path of pages) assert.equal(meta(htmlFor(path), 'property', 'og:image'), `${origin}/social-card.png`);
});

test('sitemap e robots preservam o contrato de indexação sem hashes', () => {
  const sitemap = read('public/sitemap.xml');
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 9);
  assert.doesNotMatch(sitemap, /#/);
  assert.match(read('public/robots.txt'), new RegExp(`Sitemap: ${origin.replaceAll('.', '\\.')}/sitemap\\.xml`));
});
