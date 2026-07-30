export type NotificationType =
  | 'contribution.received'
  | 'contribution.approved'
  | 'contribution.rejected'
  | 'contribution.changes_requested'
  | 'comment.created'
  | 'comment.replied'
  | 'comment.reacted'
  | 'favorite.content_updated'
  | 'user.role_changed'
  | 'report.reviewing'
  | 'report.resolved'
  | 'report.dismissed'
  | 'content.archived'
  | 'content.restored';

export type NotificationCategory = 'contributions' | 'comments' | 'favorites' | 'account';

export interface NotificationItem {
  id: string;
  actorId: string | null;
  actorName: string;
  type: NotificationType;
  title: string;
  message: string;
  targetType: string | null;
  targetId: string | null;
  reportId?: string | null;
  notificationOrder?: number;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFilters {
  category?: NotificationCategory;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationPageResult { items: NotificationItem[]; hasMore: boolean }
