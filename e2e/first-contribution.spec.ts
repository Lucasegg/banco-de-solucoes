import { expect, test, mockApi } from './fixtures';
import { assertNoHorizontalOverflow } from './overflow';

async function asMember(page: import('@playwright/test').Page, role: 'member' | 'admin' = 'member') {
  await page.addInitScript((selectedRole) => {
    localStorage.setItem('e2e.authenticated', 'true');
    localStorage.setItem('e2e.role', selectedRole);
  }, role);
}

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('visitante escolhe problema ou solução e recebe autenticação contextual', async ({ page, consoleErrors }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quero relatar um problema' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quero compartilhar uma solução' })).toBeVisible();
  await assertNoHorizontalOverflow(page, 'escolha da primeira contribuição');
  await page.getByRole('button', { name: 'Cadastrar solução' }).click();
  await expect(page).toHaveURL(/#\/solutions\/new/);
  await expect(page.getByText(/Depois você voltará diretamente a este formulário/)).toBeVisible();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
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

test('membro acessa os dois formulários, valida campos e não recebe controles administrativos', async ({ page, consoleErrors }) => {
  await asMember(page);
  await page.goto('/#/problems/new');
  const save = page.getByRole('button', { name: 'Salvar' });
  await save.click();
  await expect(page.getByRole('alert').first()).toContainText('Campo obrigatório');
  await expect(page.getByText('Preencha todos os campos obrigatórios.')).toBeVisible();
  await page.goto('/#/solutions/new');
  await expect(page.getByRole('heading', { name: 'Cadastrar solução' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir administração' })).toHaveCount(0);
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
});

test('administrador preserva acesso administrativo', async ({ page, consoleErrors }) => {
  await asMember(page, 'admin');
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir administração' }).click();
  await expect(page.getByRole('heading', { name: 'Painel administrativo' })).toBeVisible();
});
