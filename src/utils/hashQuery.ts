export type QueryValue = string | number | boolean | null | undefined;

export function getHashPath(hash = window.location.hash) {
  return hash.replace(/^#/, '').split('?')[0] || '/';
}

export function readHashQuery(hash = window.location.hash) {
  const query = hash.split('?')[1] ?? '';
  return new URLSearchParams(query.split('#')[0]);
}

export function getQueryString(values: Record<string, QueryValue>) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    params.set(key, String(value));
  });

  return params.toString();
}

export function updateHashQuery(values: Record<string, QueryValue>, hash = window.location.hash) {
  const path = hash.split('?')[0] || '#/';
  const query = getQueryString(values);
  window.history.replaceState(null, '', `${path}${query ? `?${query}` : ''}`);
}

export function parsePositiveInteger(value: string | null, fallback = 1) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseBooleanParam(value: string | null) {
  return value === 'true';
}

export function parseEnumParam<T extends string>(value: string | null, allowed: readonly T[], fallback: T) {
  return value && allowed.includes(value as T) ? (value as T) : fallback;
}
