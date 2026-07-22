export type PublicErrorCode = 'AUTH_REQUIRED' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'VALIDATION' | 'DATABASE' | 'UNKNOWN';
export type PublicError = { code: PublicErrorCode; message: string };

export function toPublicError(error: unknown, fallback = 'Não foi possível concluir a operação.'): PublicError {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  if (code === '23505') return { code: 'ALREADY_EXISTS', message: 'Este item já está nos seus favoritos.' };
  if (code === '42501' || code === 'P0001') return { code: 'FORBIDDEN', message: 'Você não possui permissão para realizar esta ação.' };
  if (code === 'PGRST301' || code === '401') return { code: 'SESSION_EXPIRED', message: 'Sua sessão expirou. Entre novamente.' };
  if (code === 'P0002') return { code: 'NOT_FOUND', message: 'Este conteúdo não está mais disponível.' };
  if (code === '23514' || code === '22023') return { code: 'VALIDATION', message: 'Os dados informados não são válidos.' };
  return { code: 'UNKNOWN', message: fallback };
}
export function publicErrorMessage(error: unknown, fallback?: string) { return toPublicError(error, fallback).message; }
export function safeDatabaseMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  const code = error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
  if (code === '54000') return 'Você atingiu o limite de itens pendentes. Aguarde uma revisão.';
  return publicErrorMessage(error, fallback);
}
