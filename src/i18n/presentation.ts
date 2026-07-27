import type { ProblemStatus } from '../types/problemTimeline.ts';
import type { SolutionStatus } from '../types/domain.ts';
import type { TranslationKey } from './resources.ts';
import type { UserRole } from '../types/user.ts';
import type { ContributionStatus, ContributionType } from '../types/contribution.ts';

export const problemStatusKeys: Record<ProblemStatus, TranslationKey> = {
  Reportado:'status.problem.Reportado','Em análise':'status.problem.Em análise','Em vistoria':'status.problem.Em vistoria',Planejado:'status.problem.Planejado',Licitado:'status.problem.Licitado','Em execução':'status.problem.Em execução','Parcialmente resolvido':'status.problem.Parcialmente resolvido',Resolvido:'status.problem.Resolvido',Arquivado:'status.problem.Arquivado',Reaberto:'status.problem.Reaberto',
};
export const solutionStatusKeys: Record<SolutionStatus, TranslationKey> = {
  Proposta:'status.solution.Proposta','Em teste':'status.solution.Em teste',Implementada:'status.solution.Implementada',Validada:'status.solution.Validada',Arquivada:'status.solution.Arquivada',
};
export const userRoleKeys: Record<UserRole, TranslationKey> = {
  member: 'role.member', curator: 'role.curator', moderator: 'role.moderator',
  verified_organization: 'role.verified_organization', admin: 'role.admin',
};
export const contributionStatusKeys: Record<ContributionStatus, TranslationKey> = {
  pending: 'contribution.pending', changes_requested: 'contribution.changes_requested', approved: 'contribution.approved', rejected: 'contribution.rejected', withdrawn: 'contribution.withdrawn',
};
export const contributionTypeKeys: Record<ContributionType, TranslationKey> = {
  correction: 'contribution.correction', supplement: 'contribution.supplement', status_update: 'contribution.status_update', evidence: 'contribution.evidence', description_improvement: 'contribution.description_improvement', location: 'contribution.location', other: 'contribution.other',
};
