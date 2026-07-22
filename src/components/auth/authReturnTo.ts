const KEY = 'banco-de-solucoes.auth-return-to';

/** Only internal hash routes are accepted; external URLs are never persisted. */
export function isSafeReturnTo(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith('#/') && !value.startsWith('#//') && !value.includes('://') && !value.includes('\\'));
}

export function saveAuthReturnTo(value = window.location.hash, overwrite = false) {
  if (!isSafeReturnTo(value) || value === '#/login') return;
  const existing = window.sessionStorage.getItem(KEY);
  if (overwrite || !isSafeReturnTo(existing)) window.sessionStorage.setItem(KEY, value);
}

export function consumeAuthReturnTo() {
  const value = window.sessionStorage.getItem(KEY);
  window.sessionStorage.removeItem(KEY);
  return isSafeReturnTo(value) ? value : '#/profile';
}
