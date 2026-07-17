export const problemStatuses = ['Reportado', 'Em análise', 'Em vistoria', 'Planejado', 'Licitado', 'Em execução', 'Parcialmente resolvido', 'Resolvido', 'Arquivado', 'Reaberto'] as const;
export type ProblemStatus = typeof problemStatuses[number];
export type ProblemTimelineType = 'problem.created' | 'problem.updated' | 'problem.status_changed' | 'problem.comment' | 'problem.official_update' | 'problem.inspection' | 'problem.execution_started' | 'problem.execution_finished' | 'problem.reopened' | 'problem.closed';
export interface ProblemTimelineEvent {
  id: string;
  eventType: ProblemTimelineType;
  title: string;
  description: string | null;
  official: boolean;
  organizationName: string | null;
  statusBefore: string | null;
  statusAfter: string | null;
  actorName: string;
  createdAt: string;
}
