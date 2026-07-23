/** Returns a normalized internal destination, or null for every untrusted URL. */
export function safeNotificationActionUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 500 || /[\\\x00-\x1f\x7f?#]/.test(value)) return null;
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  return value === '/profile' || new RegExp(`^/(?:problems|solutions|contributions)/${uuid}$`, 'i').test(value) ? value : null;
}
