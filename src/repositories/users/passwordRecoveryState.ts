export const PASSWORD_RECOVERY_ACTIVE_KEY = 'banco-de-solucoes.password-recovery.active';
export const PASSWORD_RECOVERY_RESEND_AT_KEY = 'banco-de-solucoes.password-recovery.resend-at';
export const PASSWORD_RECOVERY_EMAIL_KEY = 'banco-de-solucoes.password-recovery.email';
export const PASSWORD_RECOVERY_STEP_KEY = 'banco-de-solucoes.password-recovery.step';
export const PASSWORD_RECOVERY_LEGACY_NOTICE_KEY = 'banco-de-solucoes.password-recovery.legacy-notice';

export function readRecoveryStorage(key: string) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}

export function writeRecoveryStorage(key: string, value: string) {
  try { window.sessionStorage.setItem(key, value); } catch { /* Continue in memory when storage is unavailable. */ }
}

export function removeRecoveryStorage(key: string) {
  try { window.sessionStorage.removeItem(key); } catch { /* Continue in memory when storage is unavailable. */ }
}

export function clearPasswordRecoveryFlowState(options: { keepLegacyNotice?: boolean } = {}) {
  removeRecoveryStorage(PASSWORD_RECOVERY_ACTIVE_KEY);
  removeRecoveryStorage(PASSWORD_RECOVERY_RESEND_AT_KEY);
  removeRecoveryStorage(PASSWORD_RECOVERY_EMAIL_KEY);
  removeRecoveryStorage(PASSWORD_RECOVERY_STEP_KEY);
  if (!options.keepLegacyNotice) removeRecoveryStorage(PASSWORD_RECOVERY_LEGACY_NOTICE_KEY);
}

