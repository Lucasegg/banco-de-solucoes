import type { ProblemStatus } from '../types/problemTimeline.ts';
import type { SolutionStatus } from '../types/domain.ts';
import type { TranslationKey } from './resources.ts';
import type { UserRole } from '../types/user.ts';
import type { ContributionStatus, ContributionType } from '../types/contribution.ts';
import type { AdminContentKind, AdminContentStatus } from '../repositories/adminContent/AdminContentRepository.ts';
import type { ImpactLevel, ImplementationDifficulty, SolutionMaturityLevel } from '../types/domain.ts';

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
export function adminContentStatusKey(kind: AdminContentKind, status: AdminContentStatus): TranslationKey {
  return kind === 'problem' ? problemStatusKeys[status as ProblemStatus] : solutionStatusKeys[status as SolutionStatus];
}
export const impactLevelKeys: Record<ImpactLevel, TranslationKey> = { local: 'impact.local', regional: 'impact.regional', national: 'impact.national', global: 'impact.global' };
export const maturityLevelKeys: Record<SolutionMaturityLevel, TranslationKey> = { Ideia: 'maturity.Ideia', 'Protótipo': 'maturity.Protótipo', Piloto: 'maturity.Piloto', 'Em operação': 'maturity.Em operação', 'Escalável': 'maturity.Escalável' };
export const difficultyKeys: Record<ImplementationDifficulty, TranslationKey> = { Baixa: 'difficulty.Baixa', 'Média': 'difficulty.Média', Alta: 'difficulty.Alta' };
export const knownCategoryKeys = { Infraestrutura: 'category.Infraestrutura', 'Educação': 'category.Educação', 'Saúde': 'category.Saúde', 'Segurança': 'category.Segurança', Tecnologia: 'category.Tecnologia', Mobilidade: 'category.Mobilidade', 'Meio Ambiente': 'category.Meio Ambiente', 'Assistência Social': 'category.Assistência Social', Empreendedorismo: 'category.Empreendedorismo', Outros: 'category.Outros' } as const satisfies Record<string, TranslationKey>;

export function getKnownCategoryKey(category: string): TranslationKey | undefined {
  return category in knownCategoryKeys
    ? knownCategoryKeys[category as keyof typeof knownCategoryKeys]
    : undefined;
}
