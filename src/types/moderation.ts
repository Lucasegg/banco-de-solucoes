export type ModerationStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';
export type ContentVisibility = 'visible' | 'hidden' | 'removed';
export type ModerationTargetType = 'comment' | 'contribution';
export type ModerationActionType = 'case_created' | 'assigned' | 'review_started' | 'note_added' | 'comment_hidden' | 'comment_restored' | 'comment_removed' | 'report_dismissed' | 'case_resolved' | 'contribution_assigned' | 'contribution_approved' | 'contribution_rejected';

export interface ModerationCase {
  id: string;
  targetType: ModerationTargetType;
  targetId: string;
  status: ModerationStatus;
  visibility: ContentVisibility;
  reportIds: string[];
  assignedToId: string | null;
  assignedToName: string | null;
  internalNote: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface ModerationAction {
  id: string;
  caseId: string;
  targetType: ModerationTargetType;
  targetId: string;
  action: ModerationActionType;
  moderatorId: string;
  moderatorName: string;
  reason: string;
  createdAt: string;
}
