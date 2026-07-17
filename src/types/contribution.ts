export type ContributionTargetType = 'problem' | 'solution';
export type ContributionStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';
export type ContributionType = 'correction' | 'update' | 'evidence' | 'general';
export type SerializableValue = string | number | boolean | null | SerializableValue[] | { [key: string]: SerializableValue };

export interface ContributionChange {
  id?: string;
  field: string;
  label: string;
  previousValue: SerializableValue;
  proposedValue: SerializableValue;
}

export interface ContributionPayload {
  title?: string;
  description: string;
  summary: string;
  references: string[];
  images: string[];
  changes: ContributionChange[];
}

export interface Contribution {
  id: string;
  userId: string;
  problemId: string | null;
  solutionId: string | null;
  targetType: ContributionTargetType;
  targetId: string;
  targetTitle: string;
  userName: string;
  userAvatarUrl: string | null;
  contributionType: ContributionType;
  payload: ContributionPayload;
  status: ContributionStatus;
  moderatorId: string | null;
  moderatorName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface ContributionAudit {
  id: string;
  contributionId: string;
  moderatorId: string;
  moderatorName: string;
  action: 'approved' | 'rejected';
  createdAt: string;
}

export const contributionStatusLabel: Record<ContributionStatus, string> = {
  pending: 'Pendente', reviewing: 'Em revisão', approved: 'Aprovada', rejected: 'Rejeitada',
};
