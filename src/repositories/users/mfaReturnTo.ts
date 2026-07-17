const MFA_RETURN_TO_KEY = 'banco-de-solucoes.mfa.returnTo';
const SAFE_MFA_DESTINATION = /^#\/(?:profile|account|favorites|contributions(?:\/[A-Za-z0-9_-]+)?|admin)$/;

export function normalizeMfaReturnTo(value?: string | null): string | null {
  if (!value || value === '#/mfa-challenge' || !SAFE_MFA_DESTINATION.test(value)) return null;
  return value;
}

export function saveMfaReturnTo(value?: string | null) {
  let safeDestination = normalizeMfaReturnTo(value);
  try {
    // A transição intermediária por login ou pelo próprio desafio não pode
    // sobrescrever um destino protegido capturado anteriormente.
    safeDestination ??= normalizeMfaReturnTo(window.sessionStorage.getItem(MFA_RETURN_TO_KEY));
    safeDestination ??= '#/profile';
    window.sessionStorage.setItem(MFA_RETURN_TO_KEY, safeDestination);
  } catch { safeDestination ??= '#/profile'; }
  return safeDestination;
}

export function consumeMfaReturnTo() {
  try {
    const destination = normalizeMfaReturnTo(window.sessionStorage.getItem(MFA_RETURN_TO_KEY));
    window.sessionStorage.removeItem(MFA_RETURN_TO_KEY);
    return destination ?? '#/profile';
  } catch { return '#/profile'; }
}

export function clearMfaReturnTo() {
  try { window.sessionStorage.removeItem(MFA_RETURN_TO_KEY); } catch { /* Nothing sensitive is retained by application state. */ }
}
