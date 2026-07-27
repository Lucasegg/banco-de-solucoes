import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { DEFAULT_LOCALE, detectLocale, normalizeLocale, translate } from './core.ts';
import { enUS, ptBR } from './resources.ts';
import { formatCount, formatDate, formatNumber } from './format.ts';

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
});

test('locale resources have exact key parity and no duplicate source keys', () => {
  assert.deepEqual(Object.keys(enUS).sort(), Object.keys(ptBR).sort());
  const source = readFileSync(new URL('./resources.ts', import.meta.url), 'utf8');
  for (const block of [source.match(/ptBR = \{([\s\S]*?)\} as const/)?.[1], source.match(/enUS[^=]*= \{([\s\S]*?)\n\};/)?.[1]]) {
    assert.ok(block);
    const keys = [...block.matchAll(/['"]([^'"]+)['"]\s*:/g)].map((match) => match[1]);
    assert.equal(new Set(keys).size, keys.length, 'translation keys must not be duplicated');
  }
});

test('Intl formatters localize and safely handle invalid values', () => {
  assert.equal(formatNumber(1234.5, 'pt-BR'), '1.234,5');
  assert.equal(formatNumber(1234.5, 'en-US'), '1,234.5');
  assert.equal(formatDate('invalid', 'en-US'), '—');
  assert.equal(formatCount(1, 'en-US', 'result', 'results'), '1 result');
  assert.equal(formatCount(2, 'en-US', 'result', 'results'), '2 results');
});
