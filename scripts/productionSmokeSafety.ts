export const READ_ONLY_PUBLIC_RPC_PATHS = new Set([
  '/rest/v1/rpc/search_problems',
  '/rest/v1/rpc/search_solutions',
  '/rest/v1/rpc/search_nearby_problems',
  '/rest/v1/rpc/search_nearby_solutions',
  '/rest/v1/rpc/list_taxonomy_terms',
  '/rest/v1/rpc/get_problems_in_bounds',
]);

export type ProductionRequestDecision = 'continue' | 'intercept-read-only-rpc' | 'block-mutation';

export function classifyProductionRequest(method: string, rawUrl: string): ProductionRequestDecision {
  const normalizedMethod = method.toUpperCase();
  let pathname: string;
  try { pathname = new URL(rawUrl).pathname; } catch { return 'block-mutation'; }
  if (['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod)) return 'continue';
  if (normalizedMethod === 'POST' && READ_ONLY_PUBLIC_RPC_PATHS.has(pathname)) return 'intercept-read-only-rpc';
  return 'block-mutation';
}

export function sanitizedRequestTarget(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '[URL inválida]';
  }
}
