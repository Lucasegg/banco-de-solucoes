import { useCallback, useMemo, useState } from 'react';
import type { Comment } from '../types/discussion';
import type { ModerationAction, ModerationActionType, ModerationCase, ModerationStatus } from '../types/moderation';
import type { UserProfile } from '../types/user';
import { getPermissions } from './usePermissions';

const CASES_KEY = 'banco-de-solucoes.moderation.cases';
const ACTIONS_KEY = 'banco-de-solucoes.moderation.actions';
const COMMENTS_KEY = 'banco-de-solucoes.discussions.comments';

type Result = { ok: true } | { ok: false; message: string };
const statuses: ModerationStatus[] = ['open', 'under_review', 'resolved', 'dismissed'];
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isCase(value: unknown): value is ModerationCase { return isRecord(value) && typeof value.id === 'string' && value.targetType === 'comment' && typeof value.targetId === 'string' && statuses.includes(value.status as ModerationStatus) && (value.visibility === 'visible' || value.visibility === 'hidden' || value.visibility === 'removed') && Array.isArray(value.reportIds) && value.reportIds.every((id) => typeof id === 'string') && (value.assignedToId === null || typeof value.assignedToId === 'string') && (value.assignedToName === null || typeof value.assignedToName === 'string') && typeof value.internalNote === 'string' && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string' && (value.resolvedAt === null || typeof value.resolvedAt === 'string'); }
function isAction(value: unknown): value is ModerationAction { return isRecord(value) && typeof value.id === 'string' && typeof value.caseId === 'string' && (value.targetType === 'comment' || value.targetType === 'contribution') && typeof value.targetId === 'string' && typeof value.action === 'string' && typeof value.moderatorId === 'string' && typeof value.moderatorName === 'string' && typeof value.reason === 'string' && typeof value.createdAt === 'string'; }
function readArray<T>(key: string, validator: (value: unknown) => value is T): T[] { try { const raw = window.localStorage.getItem(key); if (!raw) return []; const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(validator) : []; } catch { return []; } }
function writeArray<T>(key: string, value: T[]) { window.localStorage.setItem(key, JSON.stringify(value)); }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readComments(): Comment[] { return readArray<Comment>(COMMENTS_KEY, (value): value is Comment => isRecord(value) && typeof value.id === 'string' && Array.isArray(value.reports)); }
function updateCommentVisibility(commentId: string, visibility: 'visible' | 'hidden' | 'removed') { const comments = readComments(); const next = comments.map((comment) => comment.id === commentId ? { ...comment, visibility, deleted: visibility === 'removed' ? true : comment.deleted, updatedAt: new Date().toISOString() } : comment); writeArray(COMMENTS_KEY, next); }

export function addModerationAction(action: Omit<ModerationAction, 'id' | 'createdAt'>) {
  const actions = readArray(ACTIONS_KEY, isAction);
  writeArray(ACTIONS_KEY, [{ ...action, id: id('action'), createdAt: new Date().toISOString() }, ...actions]);
}

export function useModeration(user: UserProfile | null | undefined) {
  const [cases, setCases] = useState<ModerationCase[]>(() => readArray(CASES_KEY, isCase));
  const [actions, setActions] = useState<ModerationAction[]>(() => readArray(ACTIONS_KEY, isAction));
  const [storageError, setStorageError] = useState('');
  const permissions = getPermissions(user);

  const hydrateCases = useCallback(() => {
    const persisted = readArray(CASES_KEY, isCase);
    const byTarget = new Map(persisted.map((item) => [item.targetId, item]));
    const comments = readComments();
    const generated = comments.filter((comment) => comment.reports.length > 0).map((comment) => {
      const existing = byTarget.get(comment.id);
      const reportIds = comment.reports.map((report) => `${comment.id}:${report.userId}:${report.createdAt}`);
      return existing ? { ...existing, reportIds, visibility: comment.visibility ?? (comment.deleted ? 'removed' : 'visible') } : { id: id('case'), targetType: 'comment' as const, targetId: comment.id, status: 'open' as const, visibility: comment.visibility ?? 'visible', reportIds, assignedToId: null, assignedToName: null, internalNote: '', createdAt: comment.reports[0]?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: null };
    });
    const next = [...generated, ...persisted.filter((item) => !byTarget.has(item.targetId) && item.status !== 'open')];
    try { writeArray(CASES_KEY, next); setCases(next); setStorageError(''); } catch { setStorageError('Não foi possível persistir casos de moderação.'); }
    return next;
  }, []);

  const save = useCallback((next: ModerationCase[]) => { try { writeArray(CASES_KEY, next.filter(isCase)); setCases(next.filter(isCase)); setActions(readArray(ACTIONS_KEY, isAction)); setStorageError(''); return true; } catch { setStorageError('Não foi possível salvar a moderação.'); return false; } }, []);
  const record = useCallback((caseItem: ModerationCase, action: ModerationActionType, reason: string) => { if (!user) return; addModerationAction({ caseId: caseItem.id, targetType: caseItem.targetType, targetId: caseItem.targetId, action, moderatorId: user.id, moderatorName: user.name, reason }); setActions(readArray(ACTIONS_KEY, isAction)); }, [user]);
  const mutateCase = useCallback((caseId: string, action: ModerationActionType, reason: string, updater: (item: ModerationCase) => ModerationCase, destructive = false): Result => {
    if (!user || !permissions.canModerateComments) return { ok: false, message: 'Você não tem permissão para moderar comentários.' };
    const item = cases.find((entry) => entry.id === caseId);
    if (!item) return { ok: false, message: 'Caso não encontrado.' };
    const comment = readComments().find((entry) => entry.id === item.targetId);
    if (comment?.authorId === user.id) return { ok: false, message: 'Você não pode moderar o próprio comentário.' };
    if ((item.status === 'resolved' || item.status === 'dismissed') && action !== 'comment_restored') return { ok: false, message: 'Caso já encerrado.' };
    if (destructive && !reason.trim()) return { ok: false, message: 'Informe uma justificativa.' };
    const updated = updater({ ...item, updatedAt: new Date().toISOString() });
    if (!save(cases.map((entry) => entry.id === caseId ? updated : entry))) return { ok: false, message: 'Falha ao salvar.' };
    record(updated, action, reason.trim() || action);
    return { ok: true };
  }, [cases, permissions.canModerateComments, record, save, user]);

  const stats = useMemo(() => ({ openCases: cases.filter((item) => item.status === 'open').length, resolvedCases: cases.filter((item) => item.status === 'resolved').length, hiddenContent: cases.filter((item) => item.visibility === 'hidden').length, reportedComments: cases.length, recentActions: actions.slice(0, 5) }), [actions, cases]);
  return { cases, actions, stats, storageError, hydrateCases, assignCase: (caseId: string) => mutateCase(caseId, 'assigned', 'Caso assumido.', (item) => ({ ...item, assignedToId: user?.id ?? null, assignedToName: user?.name ?? null })), startReview: (caseId: string) => mutateCase(caseId, 'review_started', 'Revisão iniciada.', (item) => ({ ...item, status: 'under_review' })), addInternalNote: (caseId: string, note: string) => mutateCase(caseId, 'note_added', note, (item) => ({ ...item, internalNote: note })), hideComment: (caseId: string, reason: string) => mutateCase(caseId, 'comment_hidden', reason, (item) => { updateCommentVisibility(item.targetId, 'hidden'); return { ...item, visibility: 'hidden' }; }, true), restoreComment: (caseId: string, reason = 'Comentário restaurado.') => mutateCase(caseId, 'comment_restored', reason, (item) => { updateCommentVisibility(item.targetId, 'visible'); return { ...item, visibility: 'visible' }; }), removeComment: (caseId: string, reason: string) => mutateCase(caseId, 'comment_removed', reason, (item) => { updateCommentVisibility(item.targetId, 'removed'); return { ...item, visibility: 'removed' }; }, true), dismissReport: (caseId: string, reason = 'Reporte ignorado.') => mutateCase(caseId, 'report_dismissed', reason, (item) => ({ ...item, status: 'dismissed', resolvedAt: new Date().toISOString() })), resolveCase: (caseId: string, reason = 'Caso resolvido.') => mutateCase(caseId, 'case_resolved', reason, (item) => ({ ...item, status: 'resolved', resolvedAt: new Date().toISOString() })) };
}
