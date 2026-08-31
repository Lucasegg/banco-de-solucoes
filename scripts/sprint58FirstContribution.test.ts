import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const home = read('src/pages/Home.tsx');
const forms = read('src/pages/Forms.tsx');
const app = read('src/App.tsx');
const authRoute = read('src/components/auth/AuthenticatedRoute.tsx');
const authReturn = read('src/components/auth/authReturnTo.ts');
const locales = [read('src/i18n/locales/home.ts'), read('src/i18n/locales/forms.ts')].join('\n');
const workflow = read('.github/workflows/deploy.yml');
const e2e = read('e2e/first-contribution.spec.ts');
const optionalLinksMigration = read('supabase/migrations/20260831010000_allow_solutions_without_related_problems.sql');
const optionalLinksAssertions = read('scripts/fixtures/solution_problem_optional_assertions.sql');
const searchTagsPermissions = read('supabase/migrations/20260831134538_restore_search_tags_index_permissions.sql');
const searchTagsAssertions = read('scripts/fixtures/search_tags_index_permissions_assertions.sql');

test('journey uses the existing protected problem and solution routes', () => {
  assert.match(home, /page="novo-problema"/);
  assert.match(home, /page="nova-solucao"/);
  assert.match(app, /page === 'novo-problema'/);
  assert.match(app, /page === 'nova-solucao'/);
  assert.doesNotMatch(app, /first-contribution.*<.*Form/s);
});

test('authentication preserves a safe intended destination for login and registration', () => {
  assert.match(authRoute, /saveAuthReturnTo\(undefined, true\)/);
  assert.match(authReturn, /startsWith\('#\/'\)/);
  assert.match(authReturn, /consumeAuthReturnTo/);
  assert.match(app, /<AuthenticatedRoute[^>]+authPrompt=/);
});

test('guidance, differentiated choices, moderation-safe success and bilingual parity are present', () => {
  for (const key of ['home.guide.account', 'home.guide.choiceProblemTitle', 'home.guide.choiceSolutionTitle', 'forms.problemGuidance', 'forms.solutionGuidance', 'forms.authProblem', 'forms.authSolution']) {
    assert.equal((locales.match(new RegExp(key.replaceAll('.', '\\.'), 'g')) ?? []).length, 2, key);
  }
  assert.match(locales, /pode passar por moderação antes de ser publicado/);
  assert.match(locales, /may be moderated before publication/);
});

test('forms retain validation, recoverable values, accessible feedback and duplicate-submit protection', () => {
  assert.match(forms, /const submissionLock = useRef\(false\)/);
  assert.match(forms, /if \(submissionLock\.current\) return/);
  assert.equal((forms.match(/submissionLock\.current = false/g) ?? []).length, 2);
  assert.match(forms, /disabled=\{saving\}/);
  assert.match(forms, /aria-invalid=/);
  assert.match(forms, /aria-describedby=/);
  assert.match(forms, /role="alert"/);
  assert.match(forms, /feedbackIsSuccess \? 'status' : 'alert'/);
  assert.doesNotMatch(forms, /setValues\(initial(?:Problem|Solution)\)/);
});

test('solution problem links are optional in the form, RPCs and real PostgreSQL regression', () => {
  assert.doesNotMatch(forms, /values\.relatedProblemIds\.length === 0/);
  assert.match(forms, /forms\.optional/);
  assert.doesNotMatch(optionalLinksMigration, /At least one related problem is required/);
  assert.match(optionalLinksMigration, /coalesce\(p_problem_ids, '\{\}'::uuid\[\]\)/);
  assert.match(optionalLinksAssertions, /create_solution_with_problems[\s\S]*'\{\}'::uuid\[\]/);
  assert.match(optionalLinksAssertions, /update_solution_with_problems[\s\S]*p_problem_ids := '\{\}'::uuid\[\]/);
  assert.match(workflow, /Apply optional solution problem link hotfix[\s\S]*Verify solutions without related problems/);
  assert.match(e2e, /submete solução sem problema relacionado/);
});

test('authenticated contributions can maintain private full-text indexes', () => {
  assert.match(searchTagsPermissions, /revoke all on function public\.search_tags_text\(text\[\]\) from public, anon/);
  assert.match(searchTagsPermissions, /grant execute on function public\.search_tags_text\(text\[\]\) to authenticated/);
  assert.doesNotMatch(searchTagsPermissions, /grant execute[\s\S]*\bto\s+(?:public|anon)\b/i);
  assert.match(searchTagsAssertions, /set local role authenticated/);
  assert.match(searchTagsAssertions, /insert into public\.problems/);
  assert.match(searchTagsAssertions, /insert into public\.solutions/);
  assert.match(workflow, /Restore authenticated search index maintenance[\s\S]*Verify authenticated problem and solution writes/);
});

test('browser journey and blocking CI contract are wired without weakening prior gates', () => {
  for (const scenario of ['visitante escolhe', 'continua no formulário pretendido', 'submete problema uma vez', 'erro recuperável', 'submete solução', 'sem administração ou overflow']) assert.match(e2e, new RegExp(scenario));
  assert.match(workflow, /npm run test:sprint58/);
  assert.match(workflow, /npm run test:sprint57/);
  assert.match(workflow, /npm run security:audit/);
  assert.match(workflow, /npm run test:pending-migrations/);
});
