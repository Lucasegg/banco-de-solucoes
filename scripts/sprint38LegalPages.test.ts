import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import { enUS, ptBR, type SupportedLocale } from '../src/i18n/resources.ts';
import { translate } from '../src/i18n/core.ts';
import { hashFromPage, pageFromHash } from '../src/routing/hashRouter.ts';

let vite: ViteDevServer;

before(async () => { vite = await createServer({ appType: 'custom', server: { middlewareMode: true } }); });
after(async () => { await vite.close(); });

async function render(modulePath: string, exportName: string, locale: SupportedLocale) {
  const [{ I18nProvider }, pageModule] = await Promise.all([
    vite.ssrLoadModule('/src/i18n/I18nProvider.tsx'), vite.ssrLoadModule(modulePath),
  ]);
  const Component = pageModule[exportName] as ComponentType;
  return renderToStaticMarkup(createElement(I18nProvider, { initialLocale: locale }, createElement(Component)));
}

test('rendered footer has native hash links, accessible landmark and dynamic year in both languages', async () => {
  const pt = await render('/src/components/InstitutionalFooter.tsx', 'InstitutionalFooter', 'pt-BR');
  const en = await render('/src/components/InstitutionalFooter.tsx', 'InstitutionalFooter', 'en-US');
  assert.match(pt, /^<footer /);
  for (const href of ['#/contact', '#/privacy', '#/terms', '#/lgpd']) assert.ok(pt.includes(`href="${href}"`), href);
  assert.ok(pt.includes(String(new Date().getFullYear())));
  assert.ok(pt.includes('Política de Privacidade'));
  assert.ok(en.includes('Privacy Policy'));
  assert.ok(en.includes('Institutional footer'));
});

test('rendered legal pages expose headings, essential sections and native Contact links', async () => {
  const privacy = await render('/src/pages/Privacy.tsx', 'Privacy', 'pt-BR');
  assert.ok(privacy.includes('<h1'));
  for (const heading of ['Dados tratados', 'Finalidades e bases legais possíveis', 'Cookies, sessão e armazenamento local', 'Seus direitos', 'Solicitações de privacidade']) assert.ok(privacy.includes(heading), heading);
  assert.ok(privacy.includes('href="#/contact"'));

  const terms = await render('/src/pages/Terms.tsx', 'Terms', 'en-US');
  for (const heading of ['Terms of Use', 'User responsibilities', 'Prohibited content and conduct', 'Intellectual property', 'Limitation of liability']) assert.ok(terms.includes(heading), heading);
  assert.ok(terms.includes('href="#/contact"'));
});

test('rendered LGPD page has localized content and the safe official ANPD link', async () => {
  const pt = await render('/src/pages/Lgpd.tsx', 'Lgpd', 'pt-BR');
  const en = await render('/src/pages/Lgpd.tsx', 'Lgpd', 'en-US');
  for (const html of [pt, en]) {
    assert.ok(html.includes('href="https://www.gov.br/anpd/"'));
    assert.ok(html.includes('target="_blank"'));
    assert.ok(html.includes('rel="noopener noreferrer"'));
  }
  assert.ok(pt.includes('LGPD e Direitos do Titular'));
  assert.ok(pt.includes('Acessar o site oficial da ANPD'));
  assert.ok(en.includes('LGPD and Data Subject Rights'));
  assert.ok(en.includes('Visit the official ANPD website'));
});

test('hash router converts legal routes and query strings while unknown paths use not-found', () => {
  for (const page of ['contact', 'privacy', 'terms', 'lgpd']) {
    assert.equal(hashFromPage(page), `#/${page}`);
    assert.equal(pageFromHash(`#/${page}`), page);
    assert.equal(pageFromHash(`#/${page}?source=footer`), page);
  }
  assert.equal(pageFromHash('#/not-a-route'), 'not-found');
  assert.equal(pageFromHash(''), 'home');
  assert.equal(hashFromPage('not-a-page'), '#/');
});

test('legal translation resources keep exact parity and switch language', () => {
  assert.deepEqual(Object.keys(enUS).sort(), Object.keys(ptBR).sort());
  assert.equal(translate('pt-BR', 'privacy.title'), 'Política de Privacidade');
  assert.equal(translate('en-US', 'privacy.title'), 'Privacy Policy');
  assert.equal(translate('pt-BR', 'lgpd.anpd.body').includes('ANPD'), true);
  assert.equal(translate('en-US', 'terms.prohibited.title'), 'Prohibited content and conduct');
});
