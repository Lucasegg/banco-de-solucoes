import assert from 'node:assert/strict';
import test from 'node:test';
import { canDeleteContribution, canEditProblem, canEditSolution } from '../src/lib/authorship.ts';
import { toPublicError } from '../src/repositories/errors.ts';

test('authorship helpers compare IDs from the same domain', () => {
  assert.equal(canEditProblem('auth-a', { authorId: 'auth-a' }), true);
  assert.equal(canEditProblem('auth-b', { authorId: 'auth-a' }), false);
  assert.equal(canEditSolution('auth-b', { authorId: 'auth-a' }), false);
  assert.equal(canDeleteContribution('auth-a', { userId: 'auth-a', status: 'pending' } as never), true);
  assert.equal(canDeleteContribution('auth-a', { userId: 'auth-a', status: 'approved' } as never), false);
});

test('public errors never relay transport details', () => {
  const messages = [toPublicError({ code: '42501', message: 'internal provider policy' }).message, toPublicError({ message: 'provider returned invalid payload' }).message];
  for (const message of messages) assert.doesNotMatch(message.toLowerCase(), /supabase|postgres|postgrest|jwt|rls|policy|rpc|storage\.objects|schema|stack trace/);
});
