import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
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

test('hotfix migration is ordered, transactional, and avoids fixed RPC signatures', async () => {
  const migrationsDir = path.resolve('supabase/migrations');
  const migrations = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  const hotfix = '20260722300000_hotfix_favorites_authorship.sql';
  assert.ok(migrations.includes(hotfix));
  assert.equal(migrations.at(-1), hotfix, 'new migrations must follow the current history');
  assert.ok(!migrations.includes('20260722100000_hotfix_favorites_authorship.sql'));

  const sql = await readFile(path.join(migrationsDir, hotfix), 'utf8');
  assert.match(sql, /^begin;/mi);
  assert.match(sql, /commit;\s*$/mi);
  assert.doesNotMatch(sql, /(?:revoke|grant)\s+.+on\s+function\s+public\.update_solution_with_problems\s*\(/i);
  assert.match(sql, /Users can create own favorites/);
  assert.match(sql, /Authors can update own problems/);
  assert.match(sql, /Authors can update own solutions/);
  assert.match(sql, /Authors update editable contributions/);
  assert.doesNotMatch(sql, /service[_ -]?role/i);
});
