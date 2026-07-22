import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { AuthenticatedRoute, createAuthenticationPromptActions } = await vite.ssrLoadModule('/src/components/auth/AuthenticatedRoute.tsx');
const { ProblemForm, SolutionForm } = await vite.ssrLoadModule('/src/pages/Forms.tsx');

function renderRoute({ isAuthenticated, isLoading, description, children }) {
  return renderToStaticMarkup(React.createElement(AuthenticatedRoute, {
    isAuthenticated,
    isLoading,
    onLoginRequired: () => {},
    authPrompt: { description, onRegisterRequired: () => {}, onBack: () => {} },
  }, children));
}

function renderWithSpy({ isAuthenticated, isLoading }) {
  let mounts = 0;
  function SpyForm() {
    mounts += 1;
    return React.createElement('form', { 'data-testid': 'protected-form' }, React.createElement('input', { name: 'title' }));
  }
  const html = renderRoute({
    isAuthenticated,
    isLoading,
    description: 'Descrição de teste.',
    children: React.createElement(SpyForm),
  });
  return { html, mounts };
}

test('regressão: visitante não monta children protegidos', () => {
  const { html, mounts } = renderWithSpy({ isAuthenticated: false, isLoading: false });
  assert.equal(mounts, 0, 'o teste falha se AuthenticatedRoute renderizar children para visitante');
  assert.doesNotMatch(html, /protected-form|name="title"/);
  assert.match(html, /Entre ou crie uma conta para continuar/);
});

test('carregamento não monta children protegidos', () => {
  const { html, mounts } = renderWithSpy({ isAuthenticated: false, isLoading: true });
  assert.equal(mounts, 0);
  assert.match(html, /Verificando sua sessão/);
  assert.doesNotMatch(html, /protected-form/);
});

test('sessão autenticada monta children protegidos uma vez', () => {
  const { html, mounts } = renderWithSpy({ isAuthenticated: true, isLoading: false });
  assert.equal(mounts, 1);
  assert.match(html, /protected-form/);
});

test('visitante não vê campos, título ou upload reais de ProblemForm', () => {
  const html = renderRoute({
    isAuthenticated: false,
    isLoading: false,
    description: 'Para registrar um problema, você precisa estar conectado à sua conta.',
    children: React.createElement(ProblemForm),
  });
  assert.match(html, /Entre ou crie uma conta para continuar/);
  assert.match(html, /Para registrar um problema/);
  assert.doesNotMatch(html, /Cadastrar problema|Imagem do problema|<input|<select|<textarea/);
});

test('visitante não vê campos, título ou upload reais de SolutionForm', () => {
  const html = renderRoute({
    isAuthenticated: false,
    isLoading: false,
    description: 'Para cadastrar uma solução, você precisa estar conectado à sua conta.',
    children: React.createElement(SolutionForm),
  });
  assert.match(html, /Entre ou crie uma conta para continuar/);
  assert.match(html, /Para cadastrar uma solução/);
  assert.doesNotMatch(html, /Cadastrar solução|Imagem da solução|<input|<select|<textarea/);
});

function withHash(hash, callback) {
  const originalWindow = globalThis.window;
  const storage = new Map();
  globalThis.window = {
    location: { hash },
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
  };
  try {
    callback(storage);
  } finally {
    if (originalWindow) globalThis.window = originalWindow;
    else delete globalThis.window;
  }
}

test('ações de problema salvam #/problems/new e voltar direciona para problemas', () => {
  withHash('#/problems/new', (storage) => {
    let destination = '';
    const actions = createAuthenticationPromptActions(() => { destination = 'login'; }, () => { destination = 'register'; }, () => { destination = 'problems'; });
    actions.login();
    assert.equal(destination, 'login');
    assert.equal(storage.get('banco-de-solucoes.auth-return-to'), '#/problems/new');
    actions.register();
    assert.equal(destination, 'register');
    assert.equal(storage.get('banco-de-solucoes.auth-return-to'), '#/problems/new');
    actions.back();
    assert.equal(destination, 'problems');
  });
});

test('ações de solução salvam #/solutions/new e voltar direciona para soluções', () => {
  withHash('#/solutions/new', (storage) => {
    let destination = '';
    const actions = createAuthenticationPromptActions(() => { destination = 'login'; }, () => { destination = 'register'; }, () => { destination = 'solutions'; });
    actions.login();
    assert.equal(destination, 'login');
    assert.equal(storage.get('banco-de-solucoes.auth-return-to'), '#/solutions/new');
    actions.register();
    assert.equal(destination, 'register');
    assert.equal(storage.get('banco-de-solucoes.auth-return-to'), '#/solutions/new');
    actions.back();
    assert.equal(destination, 'solutions');
  });
});

await vite.close();
