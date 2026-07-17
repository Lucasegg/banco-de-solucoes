import { APP_BASE_PATH, getNormalizedOrigin, getPasswordRecoveryCallback, isSupportedOrigin } from '../../config/appUrls';

const CALLBACK_MARKER = 'callback';

export function getPasswordRecoveryRedirectUrl() {
  return getPasswordRecoveryCallback();
}

export function isPasswordRecoveryCallbackUrl(url = window.location.href) {
  const parsed = new URL(url);
  return isSupportedOrigin(parsed) && parsed.searchParams.get('recovery') === CALLBACK_MARKER;
}

export function readPasswordRecoveryCallback(url = window.location.href) {
  const parsed = new URL(url);
  return {
    code: parsed.searchParams.get('code'),
    hasError: parsed.searchParams.has('error') || parsed.searchParams.has('error_description'),
  };
}

export function cleanPasswordRecoveryCallbackUrl() {
  const origin = isSupportedOrigin() ? window.location.origin : getNormalizedOrigin();
  window.history.replaceState(null, '', `${origin}${APP_BASE_PATH}#/password-recovery`);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
