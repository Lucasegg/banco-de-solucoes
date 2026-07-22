import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { AuthenticatedRoute, createAuthenticationPromptActions } = await vite.ssrLoadModule('/src/components/auth/AuthenticatedRoute.tsx');
const { ProblemForm, SolutionForm } = await vite.ssrLoadModule('/src/pages/Forms.tsx');

function renderRoute({ isAuthenticated, isLoading, description, children }) {
  let formMounts = 0;
  const ProtectedForm = () => {
    formMounts += 1;
    return React.createElement('form', { 'data-testid': 'protected-form' }, React.createElement('input', { name: 'title' }));
  };
  const html = renderToStaticMarkup(React.createElement(AuthenticatedRoute, {
    isAuthenticated,
    isLoading,
    onLoginRequired: () => {},
    authPrompt: { description, onRegisterRequired: () => {}, onBack: () => {} },
  }, children ?? React.createElement(ProtectedForm)));
  return { html, formMounts };
}

test('visitante recebe bloqueio de problema sem montar o formulário', () => {
  const { html, formMounts } = renderRoute({ isAuthenticated: false, isLoading: false, description: 'Para registrar um problema, você precisa estar conectado à sua conta.', children: React.createElement(ProblemForm) });
  assert.equal(formMounts, 0);
  assert.doesNotMatch(html, /protected-form|name="title"/);
  assert.match(html, /Entre ou crie uma conta para continuar/);
  assert.match(html, /Para registrar um problema/);
  assert.match(html, /Entrar/);
  assert.match(html, /Criar conta/);
  assert.match(html, /Voltar/);
});

test('visitante recebe bloqueio de solução sem montar o formulário', () => {
  const { html, formMounts } = renderRoute({ isAuthenticated: false, isLoading: false, description: 'Para cadastrar uma solução, você precisa estar conectado à sua conta.', children: React.createElement(SolutionForm) });
  assert.equal(formMounts, 0);
  assert.doesNotMatch(html, /protected-form|name="title"/);
  assert.match(html, /Para cadastrar uma solução/);
});

test('carregamento não mostra formulário e sessão autenticada o monta', () => {
  const loading = renderRoute({ isAuthenticated: false, isLoading: true, description: 'não deve aparecer' });
  assert.equal(loading.formMounts, 0);
  assert.match(loading.html, /Verificando sua sessão/);

  const authenticated = renderRoute({ isAuthenticated: true, isLoading: false, description: 'não deve aparecer' });
  assert.equal(authenticated.formMounts, 1);
  assert.match(authenticated.html, /protected-form/);
});

test('entrar e criar conta preservam a rota protegida e voltar usa o callback da rota', () => {
  const storage = new Map();
  globalThis.window = {
    location: { hash: '#/problems/new' },
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
  };
  let destination = '';
  const problemActions = createAuthenticationPromptActions(() => { destination = 'login'; }, () => { destination = 'register'; }, () => { destination = 'problems'; });
  problemActions.login();
  assert.equal(destination, 'login');
  assert.equal(storage.get('banco-de-solucoes.auth-return-to'), '#/problems/new');

  globalThis.window.location.hash = '#/solutions/new';
  const solutionActions = createAuthenticationPromptActions(() => { destination = 'login'; }, () => { destination = 'register'; }, () => { destination = 'solutions'; });
  solutionActions.register();
  assert.equal(destination, 'register');
  assert.equal(storage.get('banco-de-solucoes.auth-return-to'), '#/solutions/new');
  problemActions.back();
  assert.equal(destination, 'problems');
  solutionActions.back();
  assert.equal(destination, 'solutions');
});

await vite.close();
