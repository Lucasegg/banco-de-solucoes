import type { Provider } from '@supabase/supabase-js';
import { APP_BASE_PATH, getNormalizedOrigin, getOAuthCallback, isSupportedOrigin } from '../../config/appUrls';

export type SocialAuthProvider = 'google' | 'github' | 'azure';

export const SOCIAL_AUTH_PROVIDERS: readonly SocialAuthProvider[] = ['google', 'github', 'azure'] as const;

export const SOCIAL_PROVIDER_LABELS: Record<SocialAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  azure: 'Microsoft',
};

export const SOCIAL_PROVIDER_SCOPES: Record<SocialAuthProvider, string> = {
  google: 'openid email profile',
  github: 'read:user user:email',
  azure: 'openid email profile',
};

const OAUTH_RETURN_TO_KEY = 'banco-de-solucoes.oauth.returnTo';
const CALLBACK_MARKER = 'oauth=callback';
const SAFE_HASH_PATH = /^#\/(?!\/)[a-z0-9/_?.=&:%@+\-.]*$/i;

export function getOAuthRedirectUrl() {
  return getOAuthCallback();
}

export function saveOAuthReturnTo(hash = window.location.hash) {
  const fallback = '#/profile';
  const returnTo = SAFE_HASH_PATH.test(hash) && !hash.startsWith('#/login') && !hash.startsWith('#/register') ? hash : fallback;
  window.sessionStorage.setItem(OAUTH_RETURN_TO_KEY, returnTo);
}

export function consumeOAuthReturnTo() {
  const value = window.sessionStorage.getItem(OAUTH_RETURN_TO_KEY);
  window.sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
  return value && SAFE_HASH_PATH.test(value) ? value : '#/profile';
}

export function isOAuthCallbackUrl(url = window.location.href) {
  const parsed = new URL(url);
  return isSupportedOrigin(parsed) && (`oauth=${parsed.searchParams.get('oauth')}` === CALLBACK_MARKER || parsed.searchParams.has('code') || parsed.searchParams.has('error'));
}

export function readOAuthCallbackParams(url = window.location.href) {
  const parsed = new URL(url);
  return {
    code: parsed.searchParams.get('code'),
    error: parsed.searchParams.get('error_description') ?? parsed.searchParams.get('error'),
  };
}

export function cleanOAuthCallbackUrl(targetHash = '#/profile') {
  const origin = isSupportedOrigin() ? window.location.origin : getNormalizedOrigin();
  window.history.replaceState(null, '', `${origin}${APP_BASE_PATH}${targetHash}`);
}

export function toSupabaseProvider(provider: SocialAuthProvider): Provider {
  return provider;
}

export function translateOAuthError(message?: string) {
  if (!message) return 'Não foi possível concluir o login social.';
  if (/provider|unsupported|disabled|not enabled/i.test(message)) return 'Este provedor social não está habilitado no Supabase.';
  if (/cancel|denied|access_denied/i.test(message)) return 'Login social cancelado antes da autorização.';
  if (/identity|already|exists|email/i.test(message)) return 'Este e-mail pode já estar associado a outra forma de login. Entre com e-mail e senha ou use o mesmo provedor já conectado.';
  if (/network|fetch|timeout/i.test(message)) return 'Falha de rede ao concluir o login social.';
  if (/session|code verifier|exchange/i.test(message)) return 'A sessão social não foi restaurada. Tente entrar novamente.';
  return 'Não foi possível concluir o login social. Verifique o provedor e tente novamente.';
}
