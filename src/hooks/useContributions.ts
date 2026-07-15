import { useCallback, useMemo, useState } from 'react';
import type { Contribution, ContributionReview, ContributionStats, ContributionTargetType } from '../types/contribution';
import { ContributionRepository, isContribution } from '../repositories/contributions';
import { ProblemRepository } from '../repositories/problems';
import { SolutionRepository } from '../repositories/solutions';
import type { UserProfile } from '../types/user';
import { getPermissions } from './usePermissions';

type Result = { ok: true; contribution?: Contribution } | { ok: false; message: string };
export type CreateContributionInput = Pick<Contribution, 'targetType' | 'targetId' | 'type' | 'title' | 'description' | 'justification' | 'changes'>;

function readContributions(): Contribution[] { return ContributionRepository.list(); }
function persist(contributions: Contribution[]) { return ContributionRepository.save(contributions); }
function saveWithModerationAction(next: Contribution[], action: Parameters<typeof ContributionRepository.saveWithModerationAction>[1]) {
  return ContributionRepository.saveWithModerationAction(next, action);
}
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function normalizeOwner(value: string) { return value.trim().toLowerCase(); }
function resolveTarget(targetType: ContributionTargetType, targetId: string) {
  if (targetType === 'problem') {
    const problem = ProblemRepository.findById(targetId);
    return problem ? { title: problem.title, owners: [problem.author] } : null;
  }

  const solution = SolutionRepository.findById(targetId);
  return solution ? { title: solution.title, owners: [solution.author, solution.organization] } : null;
}
function isTargetOwner(contribution: Contribution, user: UserProfile) {
  const target = resolveTarget(contribution.targetType, contribution.targetId);
  if (!target) return false;
  const identities = [user.name, user.organization].map(normalizeOwner);
  return target.owners.map(normalizeOwner).some((owner) => identities.includes(owner));
}

export function canReviewContribution(contribution: Contribution, user: UserProfile | null) {
  if (!user || contribution.authorId === user.id) return false;
  if (contribution.status !== 'Pendente' && contribution.status !== 'Em revisão') return false;
  return isTargetOwner(contribution, user) || getPermissions(user).canReviewContributions;
}

export function calculateContributionStats(contributions: Contribution[], userId: string): ContributionStats {
  const mine = contributions.filter((item) => item.authorId === userId);
  const approved = mine.filter((item) => item.status === 'Aprovada').length;
  const rejected = mine.filter((item) => item.status === 'Rejeitada').length;
  const points = mine.length * 2 + approved * 20;
  const firstDate = mine[0]?.createdAt ?? new Date().toISOString();
  const badges: ContributionStats['badges'] = [];
  if (mine.length) badges.push({ id: 'primeira-contribuicao-local', title: 'Primeira contribuição', description: 'Enviou a primeira proposta de melhoria.', level: 'bronze', unlockedAt: firstDate });
  if (approved) badges.push({ id: 'primeira-contribuicao-aprovada', title: 'Primeira contribuição aprovada', description: 'Teve uma proposta aprovada pela revisão.', level: 'silver', unlockedAt: firstDate });
  if (approved >= 5) badges.push({ id: 'colaborador-cinco-aprovacoes', title: 'Colaborador — cinco aprovações', description: 'Alcançou cinco contribuições aprovadas.', level: 'gold', unlockedAt: firstDate });
  return { sent: mine.length, approved, rejected, pending: mine.filter((item) => item.status === 'Pendente').length, approvalRate: mine.length ? Math.round((approved / mine.length) * 100) : 0, reputationPoints: points, badges };
}

export function useContributions(currentUser?: UserProfile | null) {
  const [contributions, setContributions] = useState<Contribution[]>(readContributions);
  const [storageError, setStorageError] = useState('');
  const save = useCallback((next: Contribution[]): boolean => {
    const safe = next.filter(isContribution);
    if (!persist(safe)) { setStorageError('Não foi possível salvar contribuições no navegador.'); return false; }
    setStorageError(''); setContributions(safe); return true;
  }, []);
  const createContribution = useCallback((input: CreateContributionInput): Result => {
    if (!currentUser) return { ok: false, message: 'Entre para propor alterações.' };
    if (!input.title.trim() || !input.description.trim() || !input.justification.trim() || input.changes.length === 0) return { ok: false, message: 'Preencha título, descrição, justificativa e ao menos uma alteração.' };
    const target = resolveTarget(input.targetType, input.targetId);
    if (!target) return { ok: false, message: 'Alvo da contribuição não encontrado.' };
    const now = new Date().toISOString();
    const contribution: Contribution = { ...input, targetTitle: target.title, targetOwnerName: target.owners.join(' · '), authorId: currentUser.id, authorName: currentUser.name, id: id('contribution'), status: 'Pendente', createdAt: now, updatedAt: now, reviews: [], reviewerId: null, reviewerName: null };
    return save([contribution, ...contributions]) ? { ok: true, contribution } : { ok: false, message: 'Falha ao salvar a contribuição.' };
  }, [contributions, currentUser, save]);
  const cancelContribution = useCallback((contributionId: string): Result => {
    const item = contributions.find((entry) => entry.id === contributionId);
    if (!item || !currentUser || item.authorId !== currentUser.id || item.status !== 'Pendente') return { ok: false, message: 'Somente o autor pode cancelar contribuição pendente.' };
    return save(contributions.map((entry) => entry.id === contributionId ? { ...entry, status: 'Cancelada', updatedAt: new Date().toISOString() } : entry)) ? { ok: true } : { ok: false, message: 'Falha ao cancelar.' };
  }, [contributions, currentUser, save]);
  const assignReview = useCallback((contributionId: string): Result => {
    const item = contributions.find((entry) => entry.id === contributionId);
    if (!item || !currentUser || !canReviewContribution(item, currentUser)) return { ok: false, message: 'Você não tem autorização para assumir esta revisão.' };
    if (item.reviewerId && item.reviewerId !== currentUser.id && currentUser.roleKey !== 'admin') return { ok: false, message: 'Revisão já atribuída a outro usuário.' };
    const now = new Date().toISOString();
    const next = { ...item, status: 'Em revisão' as const, reviewerId: currentUser.id, reviewerName: currentUser.name, updatedAt: now };
    const nextContributions = contributions.map((entry) => entry.id === contributionId ? next : entry);
    const ok = saveWithModerationAction(nextContributions, { caseId: contributionId, targetType: 'contribution', targetId: contributionId, action: 'contribution_assigned', moderatorId: currentUser.id, moderatorName: currentUser.name, reason: 'Revisão de contribuição assumida.' });
    if (!ok) { setStorageError('Falha ao assumir revisão e registrar histórico. Nenhuma alteração foi mantida.'); return { ok: false, message: 'Falha ao assumir revisão e registrar histórico.' }; }
    setStorageError(''); setContributions(nextContributions); return { ok: true, contribution: next };
  }, [contributions, currentUser, save]);
  const reviewContribution = useCallback((contributionId: string, status: 'Aprovada' | 'Rejeitada', message: string): Result => {
    const item = contributions.find((entry) => entry.id === contributionId);
    if (!item || !currentUser || !canReviewContribution(item, currentUser)) return { ok: false, message: 'Você não tem autorização para revisar esta contribuição.' };
    if (item.status !== 'Pendente' && item.status !== 'Em revisão') return { ok: false, message: 'Somente contribuições pendentes ou em revisão podem ser revisadas.' };
    if (item.reviewerId && item.reviewerId !== currentUser.id && currentUser.roleKey !== 'admin') return { ok: false, message: 'Somente o revisor responsável ou admin pode concluir esta revisão.' };
    if (status === 'Rejeitada' && !message.trim()) return { ok: false, message: 'Informe uma justificativa para rejeitar.' };
    const review: ContributionReview = { id: id('review'), status, reviewerId: currentUser.id, reviewerName: currentUser.name, message: message.trim() || 'Contribuição aprovada.', createdAt: new Date().toISOString() };
    const nextContributions = contributions.map((entry) => entry.id === contributionId ? { ...entry, status, reviewerId: item.reviewerId ?? currentUser.id, reviewerName: item.reviewerName ?? currentUser.name, updatedAt: review.createdAt, reviews: [...entry.reviews, review] } : entry);
    const ok = saveWithModerationAction(nextContributions, { caseId: contributionId, targetType: 'contribution', targetId: contributionId, action: status === 'Aprovada' ? 'contribution_approved' : 'contribution_rejected', moderatorId: currentUser.id, moderatorName: currentUser.name, reason: review.message });
    if (!ok) { setStorageError('Falha ao revisar e registrar histórico. Nenhuma alteração foi mantida.'); return { ok: false, message: 'Falha ao revisar e registrar histórico.' }; }
    setStorageError(''); setContributions(nextContributions); return { ok: true };
  }, [contributions, currentUser, save]);
  const stats = useMemo(() => currentUser ? calculateContributionStats(contributions, currentUser.id) : null, [contributions, currentUser]);
  return { contributions, storageError, stats, createContribution, cancelContribution, approveContribution: (idValue: string, msg = '') => reviewContribution(idValue, 'Aprovada', msg), rejectContribution: (idValue: string, msg: string) => reviewContribution(idValue, 'Rejeitada', msg), assignReview, canReview: (c: Contribution) => canReviewContribution(c, currentUser ?? null) };
}
