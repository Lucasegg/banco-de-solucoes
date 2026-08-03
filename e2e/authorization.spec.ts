import { expect, test, mockApi } from './fixtures';

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('visitante não acessa perfil próprio nem administração', async ({ page, consoleErrors }) => {
  await page.goto('/#/profile'); await expect(page).toHaveURL(/#\/login/);
  await page.goto('/#/admin'); await expect(page).toHaveURL(/#\/login/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('controles visíveis possuem ação e nenhum controle inativo recebe foco', async ({ page, consoleErrors }) => {
  await page.goto('/');
  const inactiveFocusable = await page.locator('button:disabled, input:disabled, select:disabled, [aria-disabled="true"]').evaluateAll((nodes) => nodes.filter((node) => (node as HTMLElement).tabIndex >= 0).length);
  expect(inactiveFocusable).toBe(0);
  const home = page.getByRole('button', { name: /Banco de Soluções/ });
  await home.focus(); await expect(home).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/$/);
});
