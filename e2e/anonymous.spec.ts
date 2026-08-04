import { expect, test, mockApi } from './fixtures';

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('início, menu, rodapé, teclado e idiomas são funcionais', async ({ page, consoleErrors }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page).toHaveURL(/#\/search/);
  await page.getByRole('link', { name: 'Política de Privacidade' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Privacidade');
  await page.getByLabel('Idioma da interface').selectOption('en-US');
  await expect(page.getByRole('button', { name: 'Home' })).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
  await assertNoHorizontalOverflow(page);
});

test('busca apresenta vazio, sucesso e falha com estado anunciado', async ({ page, consoleErrors }) => {
  await page.goto('/#/search');
  await expect(page.getByRole('status').first()).toContainText(/resultado/);
  await expect(page.getByRole('heading', { name: /Nenhum resultado/ })).toBeVisible();
  await page.unroute('**/__e2e_supabase/**'); await mockApi(page, 'success');
  await page.getByLabel(/Termo de busca/).fill('horta');
  await expect(page.getByRole('button', { name: /Horta comunitária/ })).toBeVisible();
  await page.unroute('**/__e2e_supabase/**'); await mockApi(page, 'error');
  await page.getByLabel(/Termo de busca/).fill('falha');
  await expect(page.getByRole('heading', { name: /Não foi possível/ })).toBeVisible();
});

test('documentos legais e rota inexistente mantêm navegação recuperável', async ({ page, consoleErrors }) => {
  for (const [hash, heading] of [['privacy', /Privacidade/], ['terms', /Termos/], ['lgpd', /LGPD/]] as const) {
    await page.goto(`/#/${hash}`); await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
  }
  await page.goto('/#/nao-existe');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto('/#/members/%E0%A4%A');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('contato valida consentimento e simula sucesso e rate limit sem segredos', async ({ page, consoleErrors }) => {
  await page.goto('/#/contact');
  await page.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expect(page.getByText('Este campo é obrigatório.').first()).toBeVisible();
  await page.getByLabel('Nome').fill('Maria Teste');
  await page.getByLabel('E-mail').fill('maria@example.test');
  await page.getByLabel('Assunto').fill('Ajuda com cadastro');
  await page.getByLabel('Categoria').selectOption('support');
  await page.getByLabel('Mensagem').fill('Preciso de ajuda para entender como concluir o meu cadastro.');
  await expect(page.getByText('É necessário consentir para enviar.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Concordo com o tratamento dos meus dados somente para resposta a esta solicitação.' }).check();
  await page.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expect(page.getByRole('status')).toContainText('Solicitação enviada com sucesso.');
  expect(await page.content()).not.toContain('service_role');
  await page.unroute('**/__e2e_supabase/**'); await mockApi(page, 'rate-limit');
  await page.reload();
  await page.getByLabel('Nome').fill('Maria Teste'); await page.getByLabel('E-mail').fill('maria@example.test'); await page.getByLabel('Assunto').fill('Ajuda com cadastro'); await page.getByLabel('Categoria').selectOption('support'); await page.getByLabel('Mensagem').fill('Preciso de ajuda para entender como concluir o meu cadastro.'); await page.getByRole('checkbox', { name: 'Concordo com o tratamento dos meus dados somente para resposta a esta solicitação.' }).check();
  await page.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expect(page.getByRole('status')).toContainText('Não foi possível enviar');
});
