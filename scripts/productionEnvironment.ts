export const PRODUCTION_ORIGIN = 'https://www.bancodesolucoes.com.br';

const realProjectHost = /(^|\.)(?:www\.)?bancodesolucoes\.com\.br$/i;

export function assertMutableE2eTargetIsSafe(rawUrl: string): string {
  let target: URL;
  try { target = new URL(rawUrl); } catch { throw new Error(`E2E_BASE_URL inválida: ${rawUrl}`); }
  if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname) || realProjectHost.test(target.hostname)) {
    throw new Error(`FAIL-CLOSED: testes E2E mutáveis só podem usar HTTP local; destino recusado: ${target.origin}`);
  }
  return target.origin;
}

export function assertProductionSmokeTarget(rawUrl: string): string {
  const target = new URL(rawUrl);
  if (target.origin !== PRODUCTION_ORIGIN || target.protocol !== 'https:') {
    throw new Error(`Production smoke recusou destino diferente de ${PRODUCTION_ORIGIN}`);
  }
  return target.origin;
}
