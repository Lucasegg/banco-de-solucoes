import type { Contribution, ContributionStatus } from '../types/contribution';

type Authored = { authorId?: string };
export const editableContributionStatuses: readonly ContributionStatus[] = ['pending', 'changes_requested'];
export function canEditProblem(userId: string | null | undefined, problem: Authored) { return Boolean(userId && problem.authorId === userId); }
export const canDeleteProblem = canEditProblem;
export function canEditSolution(userId: string | null | undefined, solution: Authored) { return Boolean(userId && solution.authorId === userId); }
export const canDeleteSolution = canEditSolution;
export function canEditContribution(userId: string | null | undefined, contribution: Contribution) { return Boolean(userId && contribution.userId === userId && editableContributionStatuses.includes(contribution.status)); }
export const canDeleteContribution = canEditContribution;
export const canWithdrawContribution = canEditContribution;
export function canModerateContribution(role: string | null | undefined) { return role === 'admin' || role === 'curator'; }
