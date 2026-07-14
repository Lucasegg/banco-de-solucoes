export type ContributionTargetType = 'problem' | 'solution';
export type ContributionType = 'Correção' | 'Atualização' | 'Nova evidência' | 'Novo caso real' | 'Nova versão' | 'Nova relação' | 'Melhoria geral';
export type ContributionStatus = 'Pendente' | 'Em revisão' | 'Aprovada' | 'Rejeitada' | 'Cancelada';

export type SerializableValue = string | number | boolean | null | SerializableValue[] | { [key: string]: SerializableValue };

export interface ContributionChange {
  id: string;
  field: string;
  label: string;
  previousValue: SerializableValue;
  proposedValue: SerializableValue;
}

export interface ContributionReview {
  id: string;
  status: ContributionStatus;
  reviewerId: string;
  reviewerName: string;
  message: string;
  createdAt: string;
}

export interface Contribution {
  id: string;
  targetType: ContributionTargetType;
  targetId: string;
  targetTitle: string;
  targetOwnerName: string;
  type: ContributionType;
  status: ContributionStatus;
  title: string;
  description: string;
  justification: string;
  changes: ContributionChange[];
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  reviews: ContributionReview[];
  reviewerId: string | null;
  reviewerName: string | null;
}

export interface ContributionStats {
  sent: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
  reputationPoints: number;
  badges: Array<{ id: string; title: string; description: string; level: 'bronze' | 'silver' | 'gold'; unlockedAt: string }>;
}
