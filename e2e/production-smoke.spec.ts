import { expect, test, type Page } from '@playwright/test';
import { PRODUCTION_ORIGIN } from '../scripts/productionEnvironment.ts';
import { classifyProductionRequest, sanitizedRequestTarget } from '../scripts/productionSmokeSafety.ts';

type SmokePage = Page & { assertSmokeErrors?: () => void };
type RequestViolation = { method: string; url: string };
type OverflowDiagnostic = {
  selector: string;
  tag: string;
  classes: string;
  width: number;
  left: number;
  right: number;
  clientWidth: number;
  scrollWidth: number;
};
const LOCALE_STORAGE_KEY = 'banco-de-solucoes.locale';
async function openReadOnly(page: Page, hash = '/') {
  const response = await page.goto(hash, { waitUntil: 'networkidle' });
  if (response) {
    expect(response.ok(), `HTTP inválido ao carregar ${hash}`).toBe(true);
  }
  expect(page.url()).toMatch(/^https:\/\/www\.bancodesolucoes\.com\.br\//);
  await expect(page).toHaveURL(new URL(hash, PRODUCTION_ORIGIN).href);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('pt-BR');
  const { overflow, elements }: { overflow: number; elements: OverflowDiagnostic[] } = await page.evaluate(() => {
    const rootWidth = document.documentElement.clientWidth;
    const selectorFor = (element: Element) => {
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && current !== document.documentElement) {
        const parent: Element | null = current.parentElement;
        const siblings = parent ? [...parent.children].filter(sibling => sibling.tagName === current?.tagName) : [];
        const position = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : '';
        parts.unshift(`${current.tagName.toLowerCase()}${position}`);
        current = parent;
      }
      return parts.join(' > ');
    };
    const elements = [...document.querySelectorAll('*')].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const htmlElement = element as HTMLElement;
      if (rect.right <= rootWidth && rect.left >= 0 && htmlElement.scrollWidth <= htmlElement.clientWidth) return [];
      return [{
        selector: selectorFor(element), tag: element.tagName.toLowerCase(), classes: element.getAttribute('class') ?? '',
        width: rect.width, left: rect.left, right: rect.right,
        clientWidth: htmlElement.clientWidth, scrollWidth: htmlElement.scrollWidth,
      }];
    });
    return { overflow: document.documentElement.scrollWidth - rootWidth, elements };
  });
  if (elements.length) console.info(`Diagnóstico de overflow em ${hash}: ${JSON.stringify(elements)}`);
  expect(overflow, `overflow horizontal em ${hash}; elementos: ${JSON.stringify(elements)}`).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => {
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const violations: RequestViolation[] = [];
  await page.addInitScript(([key, locale]) => localStorage.setItem(key, locale), [LOCALE_STORAGE_KEY, 'pt-BR']);
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
