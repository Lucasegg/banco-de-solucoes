import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Comment } from '../types/discussion';
import type { ContentVisibility, ModerationAction, ModerationActionType, ModerationCase, ModerationStatus } from '../types/moderation';
import type { UserProfile } from '../types/user';
import { getPermissions } from './usePermissions';

const CASES_KEY = 'banco-de-solucoes.moderation.cases';
const ACTIONS_KEY = 'banco-de-solucoes.moderation.actions';
const COMMENTS_KEY = 'banco-de-solucoes.discussions.comments';
const LOCAL_STORAGE_EVENT = 'banco-de-solucoes.local-storage';

const statuses: ModerationStatus[] = ['open', 'under_review', 'resolved', 'dismissed'];
const actionTypes: ModerationActionType[] = ['case_created', 'assigned', 'review_started', 'note_added', 'comment_hidden', 'comment_restored', 'comment_removed', 'report_dismissed', 'case_resolved', 'contribution_assigned', 'contribution_approved', 'contribution_rejected'];

type Result = { ok: true } | { ok: false; message: string };
type StoredSnapshot = Array<{ key: string; value: string | null }>;

type ModerationTransaction = {
  cases: ModerationCase[];
  actions: ModerationAction[];
  comments?: Comment[];
};

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isContentVisibility(value: unknown): value is ContentVisibility { return value === 'visible' || value === 'hidden' || value === 'removed'; }
function isCase(value: unknown): value is ModerationCase { return isRecord(value) && typeof value.id === 'string' && value.targetType === 'comment' && typeof value.targetId === 'string' && statuses.includes(value.status as ModerationStatus) && isContentVisibility(value.visibility) && Array.isArray(value.reportIds) && value.reportIds.every((reportId) => typeof reportId === 'string') && (value.assignedToId === null || typeof value.assignedToId === 'string') && (value.assignedToName === null || typeof value.assignedToName === 'string') && typeof value.internalNote === 'string' && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string' && (value.resolvedAt === null || typeof value.resolvedAt === 'string'); }
function isAction(value: unknown): value is ModerationAction { return isRecord(value) && typeof value.id === 'string' && typeof value.caseId === 'string' && (value.targetType === 'comment' || value.targetType === 'contribution') && typeof value.targetId === 'string' && actionTypes.includes(value.action as ModerationActionType) && typeof value.moderatorId === 'string' && typeof value.moderatorName === 'string' && typeof value.reason === 'string' && typeof value.createdAt === 'string'; }
function isComment(value: unknown): value is Comment { return isRecord(value) && typeof value.id === 'string' && Array.isArray(value.reports); }
function readArray<T>(key: string, validator: (value: unknown) => value is T): T[] { try { const raw = window.localStorage.getItem(key); if (!raw) return []; const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(validator) : []; } catch { return []; } }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function readCases() { return readArray(CASES_KEY, isCase); }
function readActions() { return readArray(ACTIONS_KEY, isAction); }
function readComments() { return readArray(COMMENTS_KEY, isComment); }
function notifyStorageKey(key: string) { window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key } })); }
function writeJson(key: string, value: unknown) { window.localStorage.setItem(key, JSON.stringify(value)); notifyStorageKey(key); }
function snapshot(keys: string[]): StoredSnapshot { return keys.map((key) => ({ key, value: window.localStorage.getItem(key) })); }
function restoreSnapshot(items: StoredSnapshot) { items.forEach((item) => { if (item.value === null) window.localStorage.removeItem(item.key); else window.localStorage.setItem(item.key, item.value); notifyStorageKey(item.key); }); }
function createAction(action: Omit<ModerationAction, 'id' | 'createdAt'>): ModerationAction { return { ...action, id: id('action'), createdAt: new Date().toISOString() }; }

function persistModerationTransaction(transaction: ModerationTransaction): boolean {
  const keys = transaction.comments ? [CASES_KEY, ACTIONS_KEY, COMMENTS_KEY] : [CASES_KEY, ACTIONS_KEY];
  const previous = snapshot(keys);
  try {
    writeJson(CASES_KEY, transaction.cases);
    writeJson(ACTIONS_KEY, transaction.actions);
    if (transaction.comments) writeJson(COMMENTS_KEY, transaction.comments);
    return true;
  } catch {
    restoreSnapshot(previous);
    return false;
  }
}

export function addModerationAction(action: Omit<ModerationAction, 'id' | 'createdAt'>): boolean {
  const next = [createAction(action), ...readActions()];
  const previous = snapshot([ACTIONS_KEY]);
  try { writeJson(ACTIONS_KEY, next); return true; } catch { restoreSnapshot(previous); return false; }
}

export function useModeration(user: UserProfile | null | undefined) {
  const [cases, setCases] = useState<ModerationCase[]>(readCases);
  const [actions, setActions] = useState<ModerationAction[]>(readActions);
  const [storageError, setStorageError] = useState('');
  const permissions = getPermissions(user);

  const refreshState = useCallback(() => { setCases(readCases()); setActions(readActions()); }, []);
  useEffect(() => {
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== CASES_KEY && event.key !== ACTIONS_KEY) return;
      if (event instanceof CustomEvent && event.detail?.key !== CASES_KEY && event.detail?.key !== ACTIONS_KEY) return;
      refreshState();
    };
    window.addEventListener('storage', sync);
    window.addEventListener(LOCAL_STORAGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(LOCAL_STORAGE_EVENT, sync);
    };
  }, [refreshState]);
  const fail = useCallback((message: string): Result => { setStorageError(message); refreshState(); return { ok: false, message }; }, [refreshState]);

  const hydrateCases = useCallback(() => {
    const persisted = readCases();
    const byTarget = new Map(persisted.map((item) => [item.targetId, item]));
    const comments = readComments();
    const generated = comments.filter((comment) => comment.reports.length > 0).map((comment) => {
      const existing = byTarget.get(comment.id);
      const reportIds = comment.reports.map((report) => `${comment.id}:${report.userId}:${report.createdAt}`);
      return existing ? { ...existing, reportIds, visibility: comment.visibility ?? (comment.deleted ? 'removed' : 'visible') } : { id: id('case'), targetType: 'comment' as const, targetId: comment.id, status: 'open' as const, visibility: comment.visibility ?? 'visible', reportIds, assignedToId: null, assignedToName: null, internalNote: '', createdAt: comment.reports[0]?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: null };
    });
    const generatedTargetIds = new Set(generated.map((item) => item.targetId));
    const next = [...generated, ...persisted.filter((item) => !generatedTargetIds.has(item.targetId) && item.status !== 'open')];
    const previous = snapshot([CASES_KEY]);
    try { writeJson(CASES_KEY, next); setCases(next); setStorageError(''); } catch { restoreSnapshot(previous); setStorageError('Não foi possível persistir casos de moderação.'); }
    return next;
  }, []);

  const mutateCase = useCallback((caseId: string, action: ModerationActionType, reason: string, updater: (item: ModerationCase) => ModerationCase, visibility?: ContentVisibility, requiresReason = false): Result => {
    if (!user || !permissions.canModerateComments) return { ok: false, message: 'Você não tem permissão para moderar comentários.' };
    const currentCases = readCases();
    const currentActions = readActions();
    const currentComments = readComments();
    const item = currentCases.find((entry) => entry.id === caseId);
    if (!item) return { ok: false, message: 'Caso não encontrado.' };
    const comment = currentComments.find((entry) => entry.id === item.targetId);
    if (comment?.authorId === user.id) return { ok: false, message: 'Você não pode moderar o próprio comentário.' };
    if ((item.status === 'resolved' || item.status === 'dismissed') && action !== 'comment_restored') return { ok: false, message: 'Caso já encerrado.' };
    if (requiresReason && !reason.trim()) return { ok: false, message: 'Informe uma justificativa.' };
    const now = new Date().toISOString();
    const updated = updater({ ...item, updatedAt: now });
    const nextCases = currentCases.map((entry) => entry.id === caseId ? updated : entry).filter(isCase);
    const nextActions = [createAction({ caseId: updated.id, targetType: updated.targetType, targetId: updated.targetId, action, moderatorId: user.id, moderatorName: user.name, reason: reason.trim() || action }), ...currentActions].filter(isAction);
    const nextComments = visibility ? currentComments.map((entry) => entry.id === updated.targetId ? { ...entry, visibility, deleted: visibility === 'removed' ? true : entry.deleted, updatedAt: now } : entry) : undefined;
    const ok = persistModerationTransaction({ cases: nextCases, actions: nextActions, comments: nextComments });
    if (!ok) return fail('Não foi possível salvar a ação de moderação. Nenhuma alteração foi mantida.');
    setCases(nextCases); setActions(nextActions); setStorageError('');
    return { ok: true };
  }, [fail, permissions.canModerateComments, user]);

  const stats = useMemo(() => ({ openCases: cases.filter((item) => item.status === 'open').length, resolvedCases: cases.filter((item) => item.status === 'resolved').length, hiddenContent: cases.filter((item) => item.visibility === 'hidden').length, reportedComments: cases.length, recentActions: actions.slice(0, 5) }), [actions, cases]);
  return { cases, actions, stats, storageError, hydrateCases, assignCase: (caseId: string) => mutateCase(caseId, 'assigned', 'Caso assumido.', (item) => ({ ...item, assignedToId: user?.id ?? null, assignedToName: user?.name ?? null })), startReview: (caseId: string) => mutateCase(caseId, 'review_started', 'Revisão iniciada.', (item) => ({ ...item, status: 'under_review' })), addInternalNote: (caseId: string, note: string) => mutateCase(caseId, 'note_added', note, (item) => ({ ...item, internalNote: note })), hideComment: (caseId: string, reason: string) => mutateCase(caseId, 'comment_hidden', reason, (item) => ({ ...item, visibility: 'hidden' }), 'hidden', true), restoreComment: (caseId: string, reason = 'Comentário restaurado.') => mutateCase(caseId, 'comment_restored', reason, (item) => ({ ...item, visibility: 'visible' }), 'visible'), removeComment: (caseId: string, reason: string) => mutateCase(caseId, 'comment_removed', reason, (item) => ({ ...item, visibility: 'removed' }), 'removed', true), dismissReport: (caseId: string, reason = 'Reporte ignorado.') => mutateCase(caseId, 'report_dismissed', reason, (item) => ({ ...item, status: 'dismissed', resolvedAt: new Date().toISOString() })), resolveCase: (caseId: string, reason = 'Caso resolvido.') => mutateCase(caseId, 'case_resolved', reason, (item) => ({ ...item, status: 'resolved', resolvedAt: new Date().toISOString() })) };
}
