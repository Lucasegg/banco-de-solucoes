import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../../integrations/supabase/client';
import type { NotificationFilters, NotificationItem, NotificationPageResult, NotificationType } from '../../types/notification';
import { safeNotificationActionUrl } from '../../notifications/navigation';
import { safeDatabaseMessage } from '../errors';
import { notificationPage } from './pagination';

type Result<T> = { ok: true; data: T } | { ok: false; message: string };
const allowedTypes = new Set<NotificationType>(['contribution.received','contribution.approved','contribution.rejected','contribution.changes_requested','comment.created','comment.replied','comment.reacted','favorite.content_updated','user.role_changed','report.reviewing','report.resolved','report.dismissed','content.archived','content.restored']);

export function mapNotificationRow(row: Record<string, unknown>): NotificationItem | null {
  const type = (row.notification_type ?? row.type) as NotificationType;
  if (!allowedTypes.has(type)) return null;
  return {
    id: String(row.id), actorId: row.actor_id ? String(row.actor_id) : null,
    actorName: String(row.actor_name ?? 'Sistema'), type,
    title: String(row.title), message: String(row.message), targetType: row.target_type ? String(row.target_type) : null,
    targetId: row.target_id ? String(row.target_id) : null,
    reportId: row.report_id ? String(row.report_id) : null,
    notificationOrder: row.notification_order === undefined ? undefined : Number(row.notification_order),
    actionUrl: safeNotificationActionUrl(row.action_url),
    metadata: {},
    readAt: row.read_at ? String(row.read_at) : null, createdAt: String(row.created_at),
  };
}

export class SupabaseNotificationRepository {
  constructor(private readonly client: SupabaseClient) {}
  async list(filters: NotificationFilters = {}): Promise<Result<NotificationPageResult>> {
    const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
    const request = filters.category
      ? this.client.rpc('get_notifications_page', { p_category: filters.category, p_unread_only: filters.unreadOnly ?? false, p_limit: limit + 1, p_offset: Math.max(0, filters.offset ?? 0) })
      : this.client.rpc('get_my_notifications', { p_unread_only: filters.unreadOnly ?? false, p_limit: limit, p_offset: Math.max(0, filters.offset ?? 0) });
    const { data, error } = await request;
    if (error) return { ok: false, message: safeDatabaseMessage(error, 'Não foi possível carregar as notificações.') };
    const items = ((data ?? []) as Record<string, unknown>[]).map(mapNotificationRow).filter((item): item is NotificationItem => item !== null);
    return { ok: true, data: notificationPage(items, limit) };
  }
  async getUnreadCount(): Promise<Result<number>> { const { data,error }=await this.client.rpc('get_my_unread_notification_count'); return error?{ok:false,message:safeDatabaseMessage(error,'Não foi possível atualizar o contador.')}:{ok:true,data:Number(data??0)}; }
  async markRead(notificationId: string): Promise<Result<boolean>> { const {data,error}=await this.client.rpc('mark_my_notification_read',{p_notification_id:notificationId}); return error?{ok:false,message:safeDatabaseMessage(error,'Não foi possível marcar a notificação.')}:{ok:true,data:Boolean(data)}; }
  async markAllRead(): Promise<Result<number>> { const {data,error}=await this.client.rpc('mark_all_my_notifications_read'); return error?{ok:false,message:safeDatabaseMessage(error,'Não foi possível marcar as notificações.')}:{ok:true,data:Number(data??0)}; }
  async getPreferences() { const {data,error}=await this.client.rpc('get_my_notification_preferences'); const row=Array.isArray(data)?data[0]:data; return error?{ok:false as const,message:safeDatabaseMessage(error,'Não foi possível carregar as preferências.')}:{ok:true as const,data:{contributions:Boolean(row?.contributions),comments:Boolean(row?.comments),favorites:Boolean(row?.favorites),updatedAt:String(row?.updated_at??'')}}; }
  async updatePreferences(preferences: {contributions:boolean;comments:boolean;favorites:boolean}) { const {data,error}=await this.client.rpc('update_my_notification_preferences',{p_contributions:preferences.contributions,p_comments:preferences.comments,p_favorites:preferences.favorites}); return error?{ok:false as const,message:safeDatabaseMessage(error,'Não foi possível salvar as preferências.')}:{ok:true as const,data:Boolean(data)}; }
  async cleanupRead() { const {data,error}=await this.client.rpc('delete_my_old_read_notifications'); return error?{ok:false as const,message:safeDatabaseMessage(error,'Não foi possível limpar as notificações.')}:{ok:true as const,data:Number(data??0)}; }
}
export const NotificationRepository = supabaseClient ? new SupabaseNotificationRepository(supabaseClient) : null;
