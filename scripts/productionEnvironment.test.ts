import assert from 'node:assert/strict';
import test from 'node:test';
import { assertMutableE2eTargetIsSafe, assertProductionSmokeTarget, PRODUCTION_ORIGIN } from './productionEnvironment.ts';

test('E2E mutável aceita apenas HTTP local', () => {
  assert.equal(assertMutableE2eTargetIsSafe('http://127.0.0.1:4173'), 'http://127.0.0.1:4173');
  for (const url of [PRODUCTION_ORIGIN, 'http://www.bancodesolucoes.com.br', 'https://localhost:4173', 'https://example.test']) {
    assert.throws(() => assertMutableE2eTargetIsSafe(url), /FAIL-CLOSED/);
  }
});

test('smoke aceita somente o domínio HTTPS canônico', () => {
  assert.equal(assertProductionSmokeTarget(PRODUCTION_ORIGIN), PRODUCTION_ORIGIN);
  assert.throws(() => assertProductionSmokeTarget('http://www.bancodesolucoes.com.br'));
});
