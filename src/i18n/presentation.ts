import type { ProblemStatus } from '../types/problemTimeline.ts';
import type { SolutionStatus } from '../types/domain.ts';
import type { TranslationKey } from './resources.ts';

export const problemStatusKeys: Record<ProblemStatus, TranslationKey> = {
  Reportado:'status.problem.Reportado','Em análise':'status.problem.Em análise','Em vistoria':'status.problem.Em vistoria',Planejado:'status.problem.Planejado',Licitado:'status.problem.Licitado','Em execução':'status.problem.Em execução','Parcialmente resolvido':'status.problem.Parcialmente resolvido',Resolvido:'status.problem.Resolvido',Arquivado:'status.problem.Arquivado',Reaberto:'status.problem.Reaberto',
};
export const solutionStatusKeys: Record<SolutionStatus, TranslationKey> = {
  Proposta:'status.solution.Proposta','Em teste':'status.solution.Em teste',Implementada:'status.solution.Implementada',Validada:'status.solution.Validada',Arquivada:'status.solution.Arquivada',
};
