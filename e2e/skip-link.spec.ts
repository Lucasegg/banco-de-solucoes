import { expect, test, mockApi } from './fixtures';

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('skip link focuses main content without changing HashRouter route', async ({ page }) => {
  await page.goto('/#/search?tab=problems&sort=recent');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Busca');
  await expect(page).toHaveURL(/#\/search\?tab=problems&sort=recent$/);
  const originalHref = await page.evaluate(() => window.location.href);
  const originalHash = await page.evaluate(() => window.location.hash);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo principal' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.locator('main#main-content')).toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.querySelector('main#main-content'))).toBe(true);
  expect(await page.evaluate(() => window.location.href)).toBe(originalHref);
  expect(await page.evaluate(() => window.location.hash)).toBe(originalHash);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Busca');
  await expect(page.getByText('Página não encontrada')).toHaveCount(0);

  await page.goto('/#/solutions');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Soluções');
  const mouseHref = await page.evaluate(() => window.location.href);
  const mouseHash = await page.evaluate(() => window.location.hash);
  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo principal' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await skipLink.click();
  await expect(page.locator('main#main-content')).toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.querySelector('main#main-content'))).toBe(true);
  expect(await page.evaluate(() => window.location.href)).toBe(mouseHref);
  expect(await page.evaluate(() => window.location.hash)).toBe(mouseHash);
  await expect(page.getByText('Página não encontrada')).toHaveCount(0);
});
