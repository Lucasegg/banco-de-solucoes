import assert from 'node:assert/strict';
import test from 'node:test';
import { hashFromPage, pageFromHash } from './hashRouter.ts';

test('preserva todas as rotas estáticas conhecidas', () => {
  for (const page of ['home', 'problemas', 'solucoes', 'search', 'contact', 'privacy', 'terms', 'lgpd', 'profile', 'account', 'admin']) {
    assert.equal(pageFromHash(hashFromPage(page)), page);
  }
});

test('caminho desconhecido retorna not-found em vez de home', () => {
  assert.equal(pageFromHash('#/nao-existe'), 'not-found');
  assert.equal(pageFromHash('#/nao-existe?origem=teste'), 'not-found');
});

test('identificador percent-encoded malformado retorna invalid-route sem lançar', () => {
  assert.doesNotThrow(() => pageFromHash('#/members/%E0%A4%A'));
  assert.equal(pageFromHash('#/members/%E0%A4%A'), 'invalid-route');
});
