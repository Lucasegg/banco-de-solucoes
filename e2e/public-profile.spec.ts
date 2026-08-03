import { expect, test, mockApi } from './fixtures';

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('perfil encontrado tem atividade navegável e link externo seguro', async ({ page, consoleErrors }) => {
  await page.goto('/#/members/ana');
  await expect(page.getByRole('heading', { name: 'Ana Silva' })).toBeVisible();
  const website = page.getByRole('link', { name: /Visitar site/ });
  await expect(website).toHaveAttribute('target', '_blank');
  await expect(website).toHaveAttribute('rel', /noopener/);
  await page.getByRole('button', { name: /Horta comunitária/ }).click();
  await expect(page).toHaveURL(/#\/problems\/11111111/);
});

test('perfil privado e inexistente são indistinguíveis', async ({ page, consoleErrors }) => {
  await page.goto('/#/members/private'); const privateText = await page.getByRole('heading', { level: 1 }).innerText();
  await page.goto('/#/members/unknown'); const missingText = await page.getByRole('heading', { level: 1 }).innerText();
  expect(privateText).toBe(missingText);
  expect(privateText).not.toMatch(/privad/i);
});
