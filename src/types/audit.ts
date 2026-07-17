export type AuditEvent = { id: string; actorId: string | null; actorName: string; eventType: string; targetType: string | null; targetId: string | null; metadata: Record<string, unknown>; createdAt: string };
export type AuditFilters = { eventType: string; targetType: string; actorId: string; from: string; to: string; search: string; ascending: boolean; page: number };
export type AdminUser = { id: string; name: string; role: 'member' | 'curator' | 'moderator' | 'admin' };
