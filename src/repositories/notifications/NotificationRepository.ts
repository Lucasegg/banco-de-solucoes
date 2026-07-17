import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { NotificationFilters, NotificationItem, NotificationPageResult, NotificationType } from '../../types/notification';
import { safeDatabaseMessage } from '../errors';

type Result<T> = { ok: true; data: T } | { ok: false; message: string };
const allowedTypes = new Set<NotificationType>(['contribution.approved','contribution.rejected','comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed']);

function mapRow(row: Record<string, unknown>): NotificationItem | null {
  if (!allowedTypes.has(row.type as NotificationType)) return null;
  return {
    id: String(row.id), actorId: row.actor_id ? String(row.actor_id) : null,
    actorName: String(row.actor_name ?? 'Sistema'), type: row.type as NotificationType,
    title: String(row.title), message: String(row.message), targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    actionUrl: typeof row.action_url === 'string' && row.action_url.startsWith('/') && !row.action_url.startsWith('//') ? row.action_url : null,
    metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {},
    readAt: row.read_at ? String(row.read_at) : null, createdAt: String(row.created_at),
  };
}

export class SupabaseNotificationRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(filters: NotificationFilters = {}): Promise<Result<NotificationPageResult>> {
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const { data, error } = await this.client.rpc('get_notifications', { p_type: filters.type ?? null, p_unread_only: filters.unreadOnly ?? false, p_limit: limit, p_offset: Math.max(0, filters.offset ?? 0) });
    if (error) return { ok: false, message: safeDatabaseMessage(error, 'Não foi possível carregar as notificações.') };
    const items = ((data ?? []) as Record<string, unknown>[]).map(mapRow).filter((item): item is NotificationItem => item !== null);
    return { ok: true, data: { items, hasMore: items.length === limit } };
  }
  async getUnreadCount(): Promise<Result<number>> { const { data,error }=await this.client.rpc('get_unread_notification_count'); return error?{ok:false,message:safeDatabaseMessage(error,'Não foi possível atualizar o contador.')}:{ok:true,data:Number(data??0)}; }
  async markRead(notificationId: string): Promise<Result<boolean>> { const {data,error}=await this.client.rpc('mark_notification_read',{p_notification_id:notificationId}); return error?{ok:false,message:safeDatabaseMessage(error,'Não foi possível marcar a notificação.')}:{ok:true,data:Boolean(data)}; }
  async markAllRead(): Promise<Result<number>> { const {data,error}=await this.client.rpc('mark_all_notifications_read'); return error?{ok:false,message:safeDatabaseMessage(error,'Não foi possível marcar as notificações.')}:{ok:true,data:Number(data??0)}; }
}
export const NotificationRepository = supabaseClient ? new SupabaseNotificationRepository(supabaseClient) : null;
