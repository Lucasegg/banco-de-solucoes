import { expect, test, mockApi, type ExpectedHttpError } from './fixtures';
import { assertNoHorizontalOverflow } from './overflow';
import type { Page } from '@playwright/test';

const problemId = '11111111-1111-4111-8111-111111111111';
const solutionId = '33333333-3333-4333-8333-333333333333';
const now = '2026-08-25T00:00:00Z';
const problemRow = { id: problemId, author_id: '22222222-2222-4222-8222-222222222222', author_name: 'Ana Silva', title: 'Iluminação insuficiente', summary: 'Trecho escuro', description: 'O trecho fica escuro à noite.', category: 'Infraestrutura', city: 'Recife', state: 'PE', country: 'Brasil', image_url: null, status: 'Reportado', views: 0, likes: 0, comments: 0, impact_level: 'local', tags: [], created_at: now, updated_at: now, source_type: null, source_name: null, source_url: null, source_published_at: null, source_accessed_at: null, source_verified_at: null, source_metadata: null, imported_from_external_source: false };
const solutionRow = { id: solutionId, author_id: '22222222-2222-4222-8222-222222222222', author_name: 'Ana Silva', title: 'Luminárias solares', summary: 'Instalação piloto', description: 'Luminárias autônomas com monitoramento.', category: 'Infraestrutura', image_url: null, organization: 'Rede Local', status: 'Proposta', maturity_level: 'Ideia', implementation_difficulty: 'Baixa', estimated_cost: null, implementation_time: null, location: 'Recife', country: 'Brasil', impact_metric: '20 pontos iluminados', likes: 0, comments: 0, views: 0, tags: [], evidence_links: ['https://example.test/evidencia'], created_at: now, updated_at: now, solution_problems: [{ problem_id: problemId }] };

async function asMember(page: Page, role: 'member' | 'admin' = 'member') {
  await page.addInitScript((selectedRole) => {
    localStorage.setItem('e2e.authenticated', 'true');
    localStorage.setItem('e2e.role', selectedRole);
  }, role);
}

async function mockContributionData(page: Page, options: { problemStatus?: number; delayMs?: number } = {}) {
  let problemCreates = 0;
  let solutionCreates = 0;
  let lastSolutionProblemIds: string[] | null = null;
  await page.route('**/__e2e_supabase/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (url.includes('/rest/v1/rpc/list_taxonomy_terms')) {
      const payload = JSON.parse(request.postData() || '{}');
      const rows = payload.p_kind === 'category' ? [{ id: 'taxonomy-1', kind: 'category', scope: payload.p_scope, name: 'Infraestrutura', slug: 'infraestrutura', total_count: 1 }] : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
    }
    if (url.includes('/rest/v1/problems') && request.method() === 'POST') {
      problemCreates += 1;
      if (options.delayMs) await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      const status = options.problemStatus ?? 201;
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 201 ? problemRow : { message: 'simulated' }) });
    }
    if (url.includes('/rest/v1/problems')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([problemRow]) });
    if (url.includes('/rest/v1/rpc/create_solution_with_problems')) {
      solutionCreates += 1;
      const payload = JSON.parse(request.postData() || '{}');
      lastSolutionProblemIds = payload.p_problem_ids;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(solutionId) });
    }
    if (url.includes('/rest/v1/solutions')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.includes('id=eq.') ? solutionRow : [solutionRow]) });
    return route.fallback();
  });
  return { problemCalls: () => problemCreates, solutionCalls: () => solutionCreates, solutionProblemIds: () => lastSolutionProblemIds };
}

async function fillProblem(page: Page) {
  await page.getByLabel('Título').fill(problemRow.title);
  await page.getByLabel('Resumo').fill(problemRow.summary);
  await page.getByLabel('Descrição').fill(problemRow.description);
  await page.getByLabel('Categoria', { exact: true }).selectOption('Infraestrutura');
  await page.getByLabel('Cidade').fill(problemRow.city);
  await page.getByLabel('Estado').fill(problemRow.state);
}

async function fillSolution(page: Page, options: { linkProblem?: boolean } = {}) {
  await page.getByLabel('Título').fill(solutionRow.title);
  await page.getByLabel('Resumo').fill(solutionRow.summary);
  await page.getByLabel('Descrição').fill(solutionRow.description);
  await page.getByLabel('Categoria', { exact: true }).selectOption('Infraestrutura');
  await page.getByLabel('Organização responsável').fill(solutionRow.organization);
  await page.getByLabel('Localização').fill(solutionRow.location);
  await page.getByLabel('Métrica de impacto').fill(solutionRow.impact_metric);
  await page.getByLabel('Links de evidência').fill(solutionRow.evidence_links[0]);
  if (options.linkProblem !== false) await page.getByRole('checkbox', { name: problemRow.title }).check();
}

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('visitante escolhe problema ou solução e recebe autenticação contextual', async ({ page, consoleErrors }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  const choice = page.getByRole('region', { name: 'Escolha o tipo da primeira contribuição' });
  await expect(choice.getByRole('heading', { name: 'Quero relatar um problema' })).toBeVisible();
  await expect(choice.getByRole('heading', { name: 'Quero compartilhar uma solução' })).toBeVisible();
  await assertNoHorizontalOverflow(page, 'escolha da primeira contribuição');
  await choice.getByRole('button', { name: 'Cadastrar solução' }).click();
  await expect(page).toHaveURL(/#\/solutions\/new/);
  await expect(page.getByText(/Depois você voltará diretamente a este formulário/)).toBeVisible();
  const authPrompt = page.getByRole('region', { name: 'Entre ou crie uma conta para continuar' });
  await authPrompt.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/#\/login/);
  expect(await page.evaluate(() => sessionStorage.getItem('banco-de-solucoes.auth-return-to'))).toBe('#/solutions/new');
});

test('continua no formulário pretendido após a autenticação conforme o contrato existente', async ({ page, consoleErrors }) => {
  await asMember(page);
  await page.addInitScript(() => sessionStorage.setItem('banco-de-solucoes.auth-return-to', '#/problems/new'));
  await page.goto('/#/problems/new');
  await expect(page.getByRole('heading', { name: 'Cadastrar problema' })).toBeVisible();
  await expect(page.getByText(/quem é afetado.*evidências/)).toBeVisible();
});

test('submete problema uma vez, anuncia moderação e bloqueia submits simultâneos', async ({ page, consoleErrors }) => {
  await asMember(page);
  const calls = await mockContributionData(page, { delayMs: 150 });
  await page.goto('/#/problems/new');
  await fillProblem(page);
  const save = page.getByRole('button', { name: 'Salvar', exact: true });
  await save.evaluate((button: HTMLButtonElement) => {
    const form = button.form;
    if (!form) throw new Error('Formulário principal não encontrado');
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('pode passar por moderação antes de ser publicado');
  expect(calls.problemCalls()).toBe(1);
});

test('erro recuperável mantém os dados do problema e libera nova tentativa', async ({ page, consoleErrors, expectedHttpErrors }) => {
  await asMember(page);
  const calls = await mockContributionData(page, { problemStatus: 503 });
  expectedHttpErrors.push({ status: 503, endpoint: '/rest/v1/problems' } as ExpectedHttpError);
  await page.goto('/#/problems/new');
  await fillProblem(page);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('alert').last()).toBeVisible();
  await expect(page.getByLabel('Título')).toHaveValue(problemRow.title);
  await expect(page.getByLabel('Descrição')).toHaveValue(problemRow.description);
  await expect(page.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  expect(calls.problemCalls()).toBe(1);
});

test('submete solução com vínculo e anuncia moderação', async ({ page, consoleErrors }) => {
  await asMember(page);
  const calls = await mockContributionData(page);
  await page.goto('/#/solutions/new');
  await fillSolution(page);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status')).toContainText('pode passar por moderação antes de ser publicada');
  expect(calls.solutionCalls()).toBe(1);
  expect(calls.solutionProblemIds()).toEqual([problemId]);
});

test('submete solução sem problema relacionado quando o vínculo não se aplica', async ({ page, consoleErrors }) => {
  await asMember(page);
  const calls = await mockContributionData(page);
  await page.goto('/#/solutions/new');
  await fillSolution(page, { linkProblem: false });
  const related = page.getByRole('group', { name: /Problemas relacionados.*opcional/ });
  await expect(related).not.toHaveAttribute('aria-invalid');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('status')).toContainText('pode passar por moderação antes de ser publicada');
  expect(calls.solutionCalls()).toBe(1);
  expect(calls.solutionProblemIds()).toEqual([]);
});

test('membro usa os formulários por teclado, sem administração ou overflow em 320 px', async ({ page, consoleErrors }) => {
  await asMember(page);
  await mockContributionData(page);
  await page.setViewportSize({ width: 320, height: 720 });
  for (const route of ['problems/new', 'solutions/new']) {
    await page.goto(`/#/${route}`);
    await assertNoHorizontalOverflow(page, `formulário ${route}`);
    await expect(page.getByRole('button', { name: 'Abrir administração' })).toHaveCount(0);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  }
});

test('campos obrigatórios associam erros sem invalidar o vínculo opcional', async ({ page, consoleErrors }) => {
  await asMember(page);
  await mockContributionData(page);
  await page.goto('/#/solutions/new');
  await page.getByRole('button', { name: 'Salvar' }).click();
  const description = page.getByLabel('Descrição');
  await expect(description).toHaveAttribute('aria-invalid', 'true');
  const errorId = await description.getAttribute('aria-describedby');
  await expect(page.locator(`#${errorId}`)).toHaveRole('alert');
  const related = page.getByRole('group', { name: /Problemas relacionados.*opcional/ });
  await expect(related).not.toHaveAttribute('aria-invalid');
  await expect(related).not.toHaveAttribute('aria-describedby');
});
