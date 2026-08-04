import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyProductionRequest, READ_ONLY_SEARCH_RPC_PATHS, sanitizedRequestTarget } from './productionSmokeSafety.ts';

const api = 'https://project-ref.supabase.co';
test('somente os quatro RPCs públicos exatos de busca são interceptados', () => {
  assert.deepEqual([...READ_ONLY_SEARCH_RPC_PATHS], [
    '/rest/v1/rpc/search_problems', '/rest/v1/rpc/search_solutions',
    '/rest/v1/rpc/search_nearby_problems', '/rest/v1/rpc/search_nearby_solutions',
  ]);
  for (const pathname of READ_ONLY_SEARCH_RPC_PATHS) assert.equal(classifyProductionRequest('POST', `${api}${pathname}`), 'intercept-read-only-rpc');
});

test('prefixo parecido, contato e endpoint administrativo são rejeitados', () => {
  for (const url of [
    `${api}/rest/v1/rpc/search_problems_evil`,
    `${api}/functions/v1/contact-request`,
    `${api}/rest/v1/rpc/admin_update_role`,
  ]) assert.equal(classifyProductionRequest('POST', url), 'block-mutation');
});

test('todos os métodos mutáveis são rejeitados fora dos RPCs exatos', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) assert.equal(classifyProductionRequest(method, `${api}/rest/v1/profiles`), 'block-mutation');
  assert.equal(classifyProductionRequest('PUT', `${api}/rest/v1/rpc/search_problems`), 'block-mutation');
});

test('URL de violação é sanitizada sem query, fragmento ou credenciais', () => {
  assert.equal(sanitizedRequestTarget('https://user:secret@example.test/path?token=secret#fragment'), 'https://example.test/path');
});
