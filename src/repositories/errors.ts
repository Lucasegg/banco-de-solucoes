type DatabaseError = { code?: unknown };
export function safeDatabaseMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  const code = error && typeof error === 'object' ? (error as DatabaseError).code : undefined;
  if (code === '42501') return 'Você não tem permissão para realizar esta ação.';
  if (code === '23514' || code === '22023') return 'Os dados informados não são válidos.';
  if (code === 'P0002') return 'O registro solicitado não foi encontrado.';
  if (code === '54000') return 'Você atingiu o limite de itens pendentes. Aguarde uma revisão.';
  return fallback;
}
