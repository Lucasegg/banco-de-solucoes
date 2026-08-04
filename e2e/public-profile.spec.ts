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
  const responses: string[] = [];
  page.on('response', async (response) => { if (response.url().includes('get_public_member_profile')) responses.push(await response.text()); });
  await page.goto('/#/members/private'); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); const privateHtml = await page.locator('main').innerHTML();
  await page.goto('/#/members/unknown'); await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); const missingHtml = await page.locator('main').innerHTML();
  expect(privateHtml).toBe(missingHtml);
  expect(responses).toEqual([JSON.stringify({ status: 'not_found' }), JSON.stringify({ status: 'not_found' })]);
  expect(privateHtml).not.toMatch(/privad/i);
});
