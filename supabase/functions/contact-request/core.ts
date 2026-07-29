export const categories = ['question', 'support', 'account', 'suggestion', 'report', 'other'] as const;
export type ContactPayload = { name?: unknown; email?: unknown; subject?: unknown; category?: unknown; message?: unknown; consent?: unknown; website?: unknown };
export type ValidContact = { name: string; email: string; subject: string; category: typeof categories[number]; message: string };
const limits = { name: [2, 100], email: [3, 254], subject: [3, 150], message: [10, 5000] } as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePayload(payload: ContactPayload): ValidContact | null {
  if (payload.website !== '' && payload.website !== undefined) return null;
  if (payload.consent !== true || typeof payload.category !== 'string' || !categories.includes(payload.category as ValidContact['category'])) return null;
  if (typeof payload.name !== 'string' || typeof payload.email !== 'string' || typeof payload.subject !== 'string' || typeof payload.message !== 'string') return null;
  const value = { name: payload.name.trim().replace(/\s+/g, ' '), email: payload.email.trim().toLowerCase(), subject: payload.subject.trim().replace(/\s+/g, ' '), category: payload.category as ValidContact['category'], message: payload.message.trim() };
  if (value.name.length < limits.name[0] || value.name.length > limits.name[1] || value.subject.length < limits.subject[0] || value.subject.length > limits.subject[1] || value.message.length < limits.message[0] || value.message.length > limits.message[1] || value.email.length > limits.email[1] || !emailPattern.test(value.email)) return null;
  return value;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] as string);
}

export function buildEmail(contact: ValidContact, date: Date) {
  const row = (label: string, value: string) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`;
  return { subject: `[Contato: ${contact.category}] ${contact.subject}`.replace(/[\r\n]/g, ' '), html: [row('Nome', contact.name), row('E-mail', contact.email), row('Categoria', contact.category), row('Assunto', contact.subject), row('Mensagem', contact.message).replace(/\n/g, '<br>'), row('Data (UTC)', date.toISOString())].join('') };
}

export class RateLimiter {
  private readonly requests = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  constructor(limit = 5, windowMs = 60 * 60 * 1000) { this.limit = limit; this.windowMs = windowMs; }
  allow(key: string, now = Date.now()) { const recent = (this.requests.get(key) ?? []).filter((time) => now - time < this.windowMs); if (recent.length >= this.limit) return false; recent.push(now); this.requests.set(key, recent); return true; }
}
