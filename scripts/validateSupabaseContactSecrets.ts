export const REQUIRED_CONTACT_SECRETS = [
  'RESEND_API_KEY',
  'CONTACT_ADMIN_EMAIL',
  'CONTACT_FROM_EMAIL',
  'CONTACT_ALLOWED_ORIGINS',
  'CONTACT_RATE_LIMIT_SECRET',
] as const;

export type SecretValidation =
  | { ok: true; message: string }
  | { ok: false; kind: 'invalid_json' | 'unexpected_format' | 'missing'; message: string };

export function validateSupabaseContactSecrets(output: string): SecretValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return { ok: false, kind: 'invalid_json', message: 'Supabase secrets query returned invalid JSON.' };
  }

  if (!Array.isArray(parsed) || !parsed.every((entry) => entry !== null && typeof entry === 'object' && typeof (entry as { name?: unknown }).name === 'string')) {
    return { ok: false, kind: 'unexpected_format', message: 'Supabase secrets query returned an unexpected JSON format.' };
  }

  const names = new Set(parsed.map((entry) => (entry as { name: string }).name));
  const missing = REQUIRED_CONTACT_SECRETS.find((name) => !names.has(name));
  if (missing) return { ok: false, kind: 'missing', message: `Missing required Supabase secret: ${missing}` };
  return { ok: true, message: 'Required contact secret names are configured.' };
}
