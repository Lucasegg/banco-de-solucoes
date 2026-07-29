import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { enUS, ptBR } from '../src/i18n/resources.ts';
import { translate } from '../src/i18n/core.ts';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('institutional footer renders all internal legal destinations and a dynamic year', () => {
  const footer = source('../src/components/InstitutionalFooter.tsx');
  for (const destination of ['contact', 'privacy', 'terms', 'lgpd']) assert.match(footer, new RegExp(`\\['${destination}',`));
  assert.match(footer, /new Date\(\)\.getFullYear\(\)/);
  assert.match(footer, /<footer aria-label=/);
  assert.match(source('../src/components/Layout.tsx'), /<InstitutionalFooter onNavigate=\{onNavigate\}/);
});

test('hash routing supports direct and refreshed legal URLs', () => {
  const app = source('../src/App.tsx');
  for (const route of ['privacy', 'terms', 'lgpd']) {
    assert.match(app, new RegExp(`${route}: '/${route}'`));
    assert.match(app, new RegExp(`path === '/${route}'`));
  }
});

test('legal pages contain every required auditable section', () => {
  const privacy = source('../src/pages/Privacy.tsx');
  for (const section of ['data', 'purposes', 'auth', 'content', 'contact', 'providers', 'storage', 'retention', 'sharing', 'rights', 'requests']) assert.match(privacy, new RegExp(`privacy\\.${section}\\.title`));
  const terms = source('../src/pages/Terms.tsx');
  for (const section of ['purpose', 'responsibilities', 'publishing', 'prohibited', 'ip', 'moderation', 'availability', 'liability', 'changes', 'contact']) assert.match(terms, new RegExp(`terms\\.${section}\\.title`));
  const lgpd = source('../src/pages/Lgpd.tsx');
  for (const section of ['rights', 'request', 'analysis', 'anpd']) assert.match(lgpd, new RegExp(`lgpd\\.${section}\\.title`));
});

test('legal translations have parity and switch language', () => {
  assert.deepEqual(Object.keys(enUS).sort(), Object.keys(ptBR).sort());
  assert.equal(translate('pt-BR', 'privacy.title'), 'Política de Privacidade');
  assert.equal(translate('en-US', 'privacy.title'), 'Privacy Policy');
  assert.equal(translate('pt-BR', 'lgpd.anpd.body').includes('ANPD'), true);
  assert.equal(translate('en-US', 'terms.prohibited.title'), 'Prohibited content and conduct');
});

test('privacy requests link to Contact us and Sprint 37 remains routed', () => {
  assert.match(source('../src/pages/Privacy.tsx'), /privacy\.requests\.body', contact: true/);
  assert.match(source('../src/pages/LegalPage.tsx'), /onNavigate\('contact'\)/);
  assert.match(source('../src/App.tsx'), /page === 'contact' && <Contact/);
});
