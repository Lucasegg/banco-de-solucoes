import { useCallback, useMemo, useState } from 'react';
import type { Contribution, ContributionChange, ContributionReview, ContributionStats, ContributionStatus, ContributionTargetType, ContributionType, SerializableValue } from '../types/contribution';
import { problems, solutions } from '../data/mockData';
import type { UserProfile } from '../types/user';
import { addModerationAction } from './useModeration';
import { getPermissions } from './usePermissions';

const STORAGE_KEY = 'banco-de-solucoes.contributions';
const contributionTypes: ContributionType[] = ['Correção', 'Atualização', 'Nova evidência', 'Novo caso real', 'Nova versão', 'Nova relação', 'Melhoria geral'];
const statuses: ContributionStatus[] = ['Pendente', 'Em revisão', 'Aprovada', 'Rejeitada', 'Cancelada'];
const targetTypes: ContributionTargetType[] = ['problem', 'solution'];

type Result = { ok: true; contribution?: Contribution } | { ok: false; message: string };
export type CreateContributionInput = Pick<Contribution, 'targetType' | 'targetId' | 'type' | 'title' | 'description' | 'justification' | 'changes'>;

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isSerializable(value: unknown): value is SerializableValue {
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isSerializable);
  if (isRecord(value)) return Object.values(value).every(isSerializable);
  return false;
}
function isChange(value: unknown): value is ContributionChange {
  return isRecord(value) && typeof value.id === 'string' && typeof value.field === 'string' && typeof value.label === 'string' && isSerializable(value.previousValue) && isSerializable(value.proposedValue);
}
function isReview(value: unknown): value is ContributionReview {
  return isRecord(value) && typeof value.id === 'string' && statuses.includes(value.status as ContributionStatus) && typeof value.reviewerId === 'string' && typeof value.reviewerName === 'string' && typeof value.message === 'string' && typeof value.createdAt === 'string';
}
function isContribution(value: unknown): value is Contribution {
  return isRecord(value)
    && typeof value.id === 'string'
    && targetTypes.includes(value.targetType as ContributionTargetType)
    && typeof value.targetId === 'string'
    && typeof value.targetTitle === 'string'
    && typeof value.targetOwnerName === 'string'
    && contributionTypes.includes(value.type as ContributionType)
    && statuses.includes(value.status as ContributionStatus)
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && typeof value.justification === 'string'
    && Array.isArray(value.changes) && value.changes.length > 0 && value.changes.every(isChange)
    && typeof value.authorId === 'string'
    && typeof value.authorName === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && Array.isArray(value.reviews) && value.reviews.every(isReview);
}
function normalizeContribution(value: unknown): Contribution | null {
  if (!isContribution(value)) return null;
  return { ...value, reviewerId: typeof value.reviewerId === 'string' ? value.reviewerId : null, reviewerName: typeof value.reviewerName === 'string' ? value.reviewerName : null };
}
function readContributions(): Contribution[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeContribution).filter((item): item is Contribution => item !== null) : [];
  } catch { return []; }
}
function persist(contributions: Contribution[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contributions)); return true; } catch { return false; }
}
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function normalizeOwner(value: string) { return value.trim().toLowerCase(); }
function resolveTarget(targetType: ContributionTargetType, targetId: string) {
  if (targetType === 'problem') {
    const problem = problems.find((item) => item.id === targetId);
    return problem ? { title: problem.title, owners: [problem.author] } : null;
  }

  const solution = solutions.find((item) => item.id === targetId);
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
    if (!save(contributions.map((entry) => entry.id === contributionId ? next : entry))) return { ok: false, message: 'Falha ao assumir revisão.' };
    addModerationAction({ caseId: contributionId, targetType: 'contribution', targetId: contributionId, action: 'contribution_assigned', moderatorId: currentUser.id, moderatorName: currentUser.name, reason: 'Revisão de contribuição assumida.' });
    return { ok: true, contribution: next };
  }, [contributions, currentUser, save]);
  const reviewContribution = useCallback((contributionId: string, status: 'Aprovada' | 'Rejeitada', message: string): Result => {
    const item = contributions.find((entry) => entry.id === contributionId);
    if (!item || !currentUser || !canReviewContribution(item, currentUser)) return { ok: false, message: 'Você não tem autorização para revisar esta contribuição.' };
    if (item.status !== 'Pendente' && item.status !== 'Em revisão') return { ok: false, message: 'Somente contribuições pendentes ou em revisão podem ser revisadas.' };
    if (item.reviewerId && item.reviewerId !== currentUser.id && currentUser.roleKey !== 'admin') return { ok: false, message: 'Somente o revisor responsável ou admin pode concluir esta revisão.' };
    if (status === 'Rejeitada' && !message.trim()) return { ok: false, message: 'Informe uma justificativa para rejeitar.' };
    const review: ContributionReview = { id: id('review'), status, reviewerId: currentUser.id, reviewerName: currentUser.name, message: message.trim() || 'Contribuição aprovada.', createdAt: new Date().toISOString() };
    const ok = save(contributions.map((entry) => entry.id === contributionId ? { ...entry, status, reviewerId: item.reviewerId ?? currentUser.id, reviewerName: item.reviewerName ?? currentUser.name, updatedAt: review.createdAt, reviews: [...entry.reviews, review] } : entry));
    if (ok) addModerationAction({ caseId: contributionId, targetType: 'contribution', targetId: contributionId, action: status === 'Aprovada' ? 'contribution_approved' : 'contribution_rejected', moderatorId: currentUser.id, moderatorName: currentUser.name, reason: review.message });
    return ok ? { ok: true } : { ok: false, message: 'Falha ao revisar.' };
  }, [contributions, currentUser, save]);
  const stats = useMemo(() => currentUser ? calculateContributionStats(contributions, currentUser.id) : null, [contributions, currentUser]);
  return { contributions, storageError, stats, createContribution, cancelContribution, approveContribution: (idValue: string, msg = '') => reviewContribution(idValue, 'Aprovada', msg), rejectContribution: (idValue: string, msg: string) => reviewContribution(idValue, 'Rejeitada', msg), assignReview, canReview: (c: Contribution) => canReviewContribution(c, currentUser ?? null) };
}
