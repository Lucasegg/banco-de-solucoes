export type NotificationType =
  | 'contribution.approved'
  | 'contribution.rejected'
  | 'comment.created'
  | 'comment.replied'
  | 'comment.reacted'
  | 'favorite.content_updated'
  | 'user.role_changed';

export interface NotificationItem {
  id: string;
  actorId: string | null;
  actorName: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType: string | null;
  targetId: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationPageResult { items: NotificationItem[]; hasMore: boolean }
