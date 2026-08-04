import { expect, test as base, type Page } from '@playwright/test';

const apiPrefix = '**/__e2e_supabase/**';
export type ApiMode = 'empty' | 'success' | 'error' | 'rate-limit';

export async function mockApi(page: Page, mode: ApiMode = 'empty', ownProfile: 'public' | 'not_found' = 'public') {
  await page.route(apiPrefix, async (route) => {
    const url = route.request().url();
    if (url.includes('/functions/v1/contact-request')) {
      const status = mode === 'rate-limit' ? 429 : mode === 'error' ? 503 : 202;
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status === 202 ? { accepted: true } : { error: 'simulated' }) });
    }
    if (url.includes('/rest/v1/rpc/search_')) {
      if (mode === 'error') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'simulated' }) });
      const rows = mode === 'success' ? [{ id: '11111111-1111-4111-8111-111111111111', title: 'Horta comunitária', summary: 'Alimentos e convivência no bairro', category: 'environment', tags: ['horta'], author_name: 'Equipe local', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', favorites: 2, comments: 1, total_count: 1, status: 'published', city: 'Recife', state: 'PE', solution_count: 1 }] : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
    }
    if (url.includes('/rest/v1/rpc/get_public_member_profile')) {
      const username = JSON.parse(route.request().postData() || '{}').p_username;
      const body = username === 'ana' && ownProfile === 'public' ? { status: 'public', profile: { userId: '22222222-2222-4222-8222-222222222222', username: 'ana', displayName: 'Ana Silva', avatarUrl: null, bio: 'Mobilizadora comunitária', organization: 'Rede Local', city: 'Recife', state: 'PE', country: 'Brasil', website: 'https://example.org/ana', role: 'member', joinedAt: '2025-01-01', metrics: { reputation: 10, comments: 1, discussions: 1, reactionsReceived: 2, bestAnswers: 0, problems: 1, solutions: 0, approvedContributions: 0 }, achievements: [], activity: [{ kind: 'problem', id: 'activity-1', title: 'Horta comunitária', occurred_at: '2026-01-01T00:00:00Z', target_kind: 'problem', target_id: '11111111-1111-4111-8111-111111111111' }] } } : { status: 'not_found' };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?::4173)?\/)/, (route) => route.abort('blockedbyclient'));
}

export type ExpectedHttpError = { status: 429 | 503; endpoint: string };
type BrowserConsoleError = { text: string; url: string };

export const test = base.extend<{ consoleErrors: BrowserConsoleError[]; expectedHttpErrors: ExpectedHttpError[] }>({
  expectedHttpErrors: async ({}, use) => { await use([]); },
  consoleErrors: async ({ page, expectedHttpErrors }, use) => {
    const errors: BrowserConsoleError[] = [];
    const pageErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push({ text: message.text(), url: message.location().url });
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await use(errors);
    expect(pageErrors, 'pageerror não tratado no navegador').toEqual([]);
    const unexpected = errors.filter((error) => !expectedHttpErrors.some(({ status, endpoint }) =>
      error.url.includes(endpoint) && new RegExp(`\\bstatus of ${status}\\b`).test(error.text)));
    expect(unexpected, 'erros de console não previstos').toEqual([]);
    for (const expected of expectedHttpErrors) {
      expect(errors.some((error) => error.url.includes(expected.endpoint)
        && new RegExp(`\\bstatus of ${expected.status}\\b`).test(error.text)),
      `HTTP ${expected.status} esperado em ${expected.endpoint}`).toBe(true);
    }
  },
});
export { expect };
