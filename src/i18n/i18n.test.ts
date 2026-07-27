import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DEFAULT_LOCALE, detectLocale, normalizeLocale, translate } from './core.ts';
import { enUS, ptBR } from './resources.ts';
import { formatCount, formatDate, formatNumber } from './format.ts';
import { readStoredLocale, writeStoredLocale, type LocaleStorage } from './storage.ts';
import { applyLocaleToDocument } from './document.ts';

test('uses pt-BR by default and detects supported browser variants', () => {
  assert.equal(DEFAULT_LOCALE, 'pt-BR');
  assert.equal(detectLocale(null, ['fr-FR', 'en-GB']), 'en-US');
  assert.equal(detectLocale(null, ['fr-FR']), 'pt-BR');
  assert.equal(normalizeLocale('pt_PT'), 'pt-BR');
});

test('persisted supported choice wins and unsupported values safely fall back', () => {
  assert.equal(detectLocale('en-US', ['pt-BR']), 'en-US');
  assert.equal(detectLocale('invalid', ['es']), 'pt-BR');
  assert.equal(translate('en-US', 'nav.home'), 'Home');
  assert.equal(translate('invalid', 'nav.home'), 'Início');
  assert.equal(translate('invalid', 'missing.key'), 'missing.key');
});

test('storage failures never prevent locale fallback or switching', () => {
  const unavailable: LocaleStorage = { getItem: () => { throw new DOMException('blocked', 'SecurityError'); }, setItem: () => { throw new DOMException('blocked', 'SecurityError'); } };
  assert.equal(readStoredLocale(unavailable), null);
  assert.equal(writeStoredLocale(unavailable, 'en-US'), false);
  const values = new Map<string, string>();
  const available: LocaleStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  assert.equal(writeStoredLocale(available, 'en-US'), true);
  assert.equal(readStoredLocale(available), 'en-US');
});

test('a real locale application updates lang, title and meta description', () => {
  const attributes = new Map<string, string>();
  const fakeDocument = { documentElement: { lang: 'pt-BR' }, title: '', querySelector: () => ({ setAttribute: (name: string, value: string) => attributes.set(name, value) }) };
  applyLocaleToDocument(fakeDocument, 'en-US');
  assert.equal(fakeDocument.documentElement.lang, 'en-US');
  assert.equal(fakeDocument.title, 'Solution Bank');
  assert.equal(attributes.get('content'), 'Solution Bank — shared knowledge for real challenges.');
});

test('locale resources have exact key parity and no duplicate source keys', () => {
  assert.deepEqual(Object.keys(enUS).sort(), Object.keys(ptBR).sort());
  for (const file of ['common.ts', 'home.ts']) {
    const source = readFileSync(new URL(`./locales/${file}`, import.meta.url), 'utf8');
    const blocks = [...source.matchAll(/export const \w+ = \{([\s\S]*?)\} as const;/g)];
    assert.equal(blocks.length, 2);
    for (const block of blocks) {
      const keys = [...block[1].matchAll(/['"]([^'"]+)['"]\s*:/g)].map((match) => match[1]);
      assert.equal(new Set(keys).size, keys.length, 'translation keys must not be duplicated');
    }
  }
});

test('Intl formatters localize and safely handle invalid values', () => {
  assert.equal(formatNumber(1234.5, 'pt-BR'), '1.234,5');
  assert.equal(formatNumber(1234.5, 'en-US'), '1,234.5');
  assert.equal(formatDate('invalid', 'en-US'), '—');
  const t = (key: Parameters<typeof translate>[1]) => translate('en-US', key);
  assert.equal(formatCount(1, 'en-US', t, 'count.result.one', 'count.result.other'), '1 result');
  assert.equal(formatCount(2, 'en-US', t, 'count.result.one', 'count.result.other'), '2 results');
});

test('migrated screens do not regress to hard-coded interface copy', () => {
  for (const file of ['../components/Layout.tsx', '../pages/Home.tsx']) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, />\s*(Início|Entrar|Explorar problemas|Nenhum problema publicado)\s*</);
  }
});

test('language selector remains keyboard-native and accessibly named', () => {
  const layout = readFileSync(new URL('../components/Layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /<select id="language-selector" aria-label=\{t\('language.label'\)\}/);
  assert.match(layout, /<option value="pt-BR">/);
  assert.match(layout, /<option value="en-US">/);
});
