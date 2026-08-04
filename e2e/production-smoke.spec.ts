import { expect, test, type Page } from '@playwright/test';
import { PRODUCTION_ORIGIN } from '../scripts/productionEnvironment.ts';

type SmokePage = Page & { assertSmokeErrors?: () => void };
async function openReadOnly(page: Page, hash = '/') {
  const response = await page.goto(hash, { waitUntil: 'networkidle' });
  expect(response?.ok(), `HTTP inválido ao carregar ${hash}`).toBe(true);
  expect(page.url()).toMatch(/^https:\/\/www\.bancodesolucoes\.com\.br\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  const consoleErrors: string[] = []; const pageErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', async route => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
      if (route.request().url().includes('/rest/v1/rpc/search_')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      throw new Error(`Production smoke bloqueou escrita ${route.request().method()} ${route.request().url()}`);
    }
    await route.continue();
  });
  (page as SmokePage).assertSmokeErrors = () => {
    expect(pageErrors, 'pageerror em produção').toEqual([]);
    expect(consoleErrors, 'erros inesperados no console de produção').toEqual([]);
  };
});
test.afterEach(async ({ page }) => (page as SmokePage).assertSmokeErrors?.());

test('home, HTTPS e assets críticos estão funcionais', async ({ page, request }) => {
  await openReadOnly(page);
  await expect(page).toHaveTitle(/Banco de Soluções/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const assets = await page.locator('script[src], link[rel="stylesheet"][href], link[rel="manifest"][href]').evaluateAll(nodes => nodes.map(node => (node as HTMLScriptElement).src || (node as HTMLLinkElement).href));
  expect(assets.length).toBeGreaterThan(1);
  for (const asset of assets) {
    const response = await request.get(asset);
    expect(response.status(), `asset crítico retornou ${response.status()}: ${asset}`).not.toBe(404);
    expect(response.ok(), `asset crítico indisponível: ${asset}`).toBe(true);
  }
});

test('navegação pública permanece somente leitura', async ({ page }) => {
  await openReadOnly(page);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(`${PRODUCTION_ORIGIN}/#/search`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Busca/);
  for (const [route, heading] of [['privacy', /Privacidade/], ['terms', /Termos/], ['lgpd', /LGPD/], ['contact', /Fale Conosco/]] as const) {
    await openReadOnly(page, `/#/${route}`); await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
  await openReadOnly(page, '/#/sprint-50-rota-inexistente');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});
