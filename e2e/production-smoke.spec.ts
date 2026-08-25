import { expect, test, type Page } from '@playwright/test';
import { PRODUCTION_ORIGIN } from '../scripts/productionEnvironment.ts';
import { classifyProductionRequest, sanitizedRequestTarget } from '../scripts/productionSmokeSafety.ts';
import { sharedPtBR } from '../src/i18n/locales/shared.ts';
import { assertNoHorizontalOverflow } from './overflow';

type SmokePage = Page & { assertSmokeErrors?: () => void };
type RequestViolation = { method: string; url: string };
const LOCALE_STORAGE_KEY = 'banco-de-solucoes.locale';
async function openReadOnly(page: Page, hash = '/') {
  const response = await page.goto(hash, { waitUntil: 'networkidle' });
  if (response) {
    expect(response.ok(), `HTTP inválido ao carregar ${hash}`).toBe(true);
  }
  expect(page.url()).toMatch(/^https:\/\/www\.bancodesolucoes\.com\.br\//);
  await expect(page).toHaveURL(new URL(hash, PRODUCTION_ORIGIN).href);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('pt-BR');
  await assertNoHorizontalOverflow(page, hash);
}

test.beforeEach(async ({ page }) => {
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const violations: RequestViolation[] = [];
  await page.addInitScript(([key, locale]) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, locale);
  }, [LOCALE_STORAGE_KEY, 'pt-BR']);
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', async route => {
    const request = route.request();
    const decision = classifyProductionRequest(request.method(), request.url());
    if (decision === 'continue') return route.continue();
    if (decision === 'intercept-read-only-rpc') return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    violations.push({ method: request.method(), url: sanitizedRequestTarget(request.url()) });
    await route.abort('blockedbyclient');
  });
  (page as SmokePage).assertSmokeErrors = () => {
    expect(violations, 'requests mutáveis bloqueados antes de chegar à produção').toEqual([]);
    expect(pageErrors, 'pageerror em produção').toEqual([]);
    expect(consoleErrors, 'erros inesperados no console de produção').toEqual([]);
  };
});
test.afterEach(async ({ page }) => (page as SmokePage).assertSmokeErrors?.());

test('home, HTTPS e assets críticos estão funcionais', async ({ page, request }) => {
  await openReadOnly(page);
  await expect(page).toHaveTitle(/Banco de Soluções/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${PRODUCTION_ORIGIN}/`);
  await expect(page.locator('meta[name="application-version"]')).toHaveAttribute('content', '1.0.0');
  const assets = await page.locator('script[src], link[rel="stylesheet"][href], link[rel="manifest"][href]').evaluateAll(nodes => nodes.map(node => (node as HTMLScriptElement).src || (node as HTMLLinkElement).href));
  expect(assets.length).toBeGreaterThan(1);
  for (const asset of assets) {
    const response = await request.get(asset);
    expect(response.status(), `asset crítico retornou ${response.status()}: ${asset}`).not.toBe(404);
    expect(response.ok(), `asset crítico indisponível: ${asset}`).toBe(true);
  }
});

test('robots e sitemap preservam o contrato público seguro', async ({ request }) => {
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok(), 'robots.txt deve responder com sucesso').toBe(true);
  const robots = await robotsResponse.text();
  expect(robots, 'robots.txt não pode bloquear a raiz').not.toMatch(/Disallow:\s*\/$/im);
  expect(robots).toContain(`Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml`);

  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.ok(), 'sitemap.xml deve responder com sucesso').toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain(`<loc>${PRODUCTION_ORIGIN}/</loc>`);
  expect(sitemap, 'sitemap não pode publicar fragmentos hash').not.toContain('#');
  for (const route of ['admin', 'login', 'register', 'account', 'profile', 'notifications', 'callback']) {
    expect(sitemap, `sitemap não pode publicar rota privada: ${route}`).not.toMatch(new RegExp(`(?:/|>)${route}(?:/|<)`, 'i'));
  }
});

test('navegação pública permanece somente leitura', async ({ page }) => {
  await openReadOnly(page);
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(`${PRODUCTION_ORIGIN}/#/search`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Busca/);
  for (const [route, heading] of [['problems', /Problemas/], ['solutions', /Soluções/], ['mapa', /Mapa/]] as const) {
    await openReadOnly(page, `/#/${route}`); await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
  for (const [route, heading] of [['privacy', /Privacidade/], ['terms', /Termos/], ['lgpd', /LGPD/], ['contact', /Fale Conosco/]] as const) {
    await openReadOnly(page, `/#/${route}`); await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
  await openReadOnly(page, '/#/sprint-50-rota-inexistente');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('idiomas, skip link e foco permanecem funcionais após recarga direta', async ({ page }) => {
  await openReadOnly(page, '/#/privacy');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Pular para o conteúdo principal' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.getByLabel('Idioma da interface').selectOption('en-US');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacy');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByLabel('Interface language')).toHaveValue('en-US');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
});

test('visitante não monta contribuição protegida e conserva o destino no login', async ({ page }) => {
  await openReadOnly(page, '/#/problems/new');
  await expect(page.getByRole('heading', { name: sharedPtBR['auth.continue'] })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(`${PRODUCTION_ORIGIN}/#/login`);
  const returnTo = await page.evaluate(() => sessionStorage.getItem('banco-de-solucoes.auth-return-to'));
  expect(returnTo).toBe('#/problems/new');

  await openReadOnly(page, '/#/admin');
  await expect(page).toHaveURL(`${PRODUCTION_ORIGIN}/#/login`);
});
