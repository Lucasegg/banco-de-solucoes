export const APP_CANONICAL_URL = 'https://www.bancodesolucoes.com.br/';
export const APP_ORIGIN = 'https://www.bancodesolucoes.com.br';
export const APP_BASE_PATH = '/';
export const OAUTH_CALLBACK = `${APP_ORIGIN}/?oauth=callback`;
export const PASSWORD_RECOVERY_CALLBACK = `${APP_ORIGIN}/?recovery=callback`;

const LOCAL_HOSTNAME = 'localhost';
const OFFICIAL_ORIGINS = new Set([APP_ORIGIN, 'https://bancodesolucoes.com.br']);
const LEGACY_ORIGIN = 'https://lucasegg.github.io';

function currentUrl() {
  return typeof window === 'undefined' ? new URL(APP_CANONICAL_URL) : new URL(window.location.href);
}

export function isLocalOrigin(url = currentUrl()) {
  return url.hostname === LOCAL_HOSTNAME;
}

export function isSupportedOrigin(url = currentUrl()) {
  return isLocalOrigin(url) || OFFICIAL_ORIGINS.has(url.origin) || url.origin === LEGACY_ORIGIN;
}

/** The safe current origin used while consuming callbacks, including the temporary legacy host. */
export function getNormalizedOrigin(url = currentUrl()) {
  if (isLocalOrigin(url)) return url.origin;
  if (OFFICIAL_ORIGINS.has(url.origin)) return APP_ORIGIN;
  if (url.origin === LEGACY_ORIGIN) return url.origin;
  return APP_ORIGIN;
}

export const NORMALIZED_ORIGIN = getNormalizedOrigin();

/** New OAuth attempts always use localhost or the official production callback. */
export function getOAuthCallback(url = currentUrl()) {
  return isLocalOrigin(url) ? `${url.origin}/?oauth=callback` : OAUTH_CALLBACK;
}

/** Recovery parameters must reach the client before hash routing is restored. */
export function getPasswordRecoveryCallback(url = currentUrl()) {
  return isLocalOrigin(url) ? `${url.origin}/?recovery=callback` : PASSWORD_RECOVERY_CALLBACK;
}
