import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContentVisibility, ModerationAction, ModerationActionType, ModerationCase } from '../types/moderation';
import type { UserProfile } from '../types/user';
import { ModerationRepository, createAction, isAction, isCase } from '../repositories/moderation';
import { CommentRepository } from '../repositories/comments';
import { getPermissions } from './usePermissions';

const CASES_KEY = ModerationRepository.keys.cases;
const ACTIONS_KEY = ModerationRepository.keys.actions;

type Result = { ok: true } | { ok: false; message: string };

function readCases() { return ModerationRepository.listCases(); }
function readActions() { return ModerationRepository.listActions(); }
function readComments() { return ModerationRepository.listComments(); }
function id(prefix: string) { return ModerationRepository.createId(prefix); }

export function addModerationAction(action: Parameters<typeof ModerationRepository.addAction>[0]): boolean {
  return ModerationRepository.addAction(action);
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
    window.addEventListener(ModerationRepository.eventName, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(ModerationRepository.eventName, sync);
    };
  }, [refreshState]);
  const fail = useCallback((message: string): Result => { setStorageError(message); refreshState(); return { ok: false, message }; }, [refreshState]);

  const hydrateCases = useCallback(() => {
    const persisted = readCases();
    const byTarget = new Map(persisted.map((item) => [item.targetId, item]));
    const comments = readComments();
    if (CommentRepository) {
      void CommentRepository.listReported().then((result) => {
        if (!result.ok) { setStorageError(result.message); return; }
        const remoteGenerated = result.data.filter((comment) => comment.reports.length > 0).map((comment) => {
          const existing = byTarget.get(comment.id);
          const reportIds = comment.reports.map((report) => `${comment.id}:${report.userId}:${report.createdAt}`);
          return existing ? { ...existing, reportIds, visibility: comment.visibility ?? (comment.deleted ? 'removed' : 'visible') } : { id: id('case'), targetType: 'comment' as const, targetId: comment.id, status: 'open' as const, visibility: comment.visibility ?? 'visible', reportIds, assignedToId: null, assignedToName: null, internalNote: '', createdAt: comment.reports[0]?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: null };
        });
        const remoteTargetIds = new Set(remoteGenerated.map((item) => item.targetId));
        const nextRemote = [...remoteGenerated, ...persisted.filter((item) => !remoteTargetIds.has(item.targetId) && item.status !== 'open')];
        if (ModerationRepository.saveCases(nextRemote)) { setCases(nextRemote); setStorageError(''); } else setStorageError('Não foi possível persistir casos de moderação.');
      });
      return persisted;
    }
    const generated = comments.filter((comment) => comment.reports.length > 0).map((comment) => {
      const existing = byTarget.get(comment.id);
      const reportIds = comment.reports.map((report) => `${comment.id}:${report.userId}:${report.createdAt}`);
      return existing ? { ...existing, reportIds, visibility: comment.visibility ?? (comment.deleted ? 'removed' : 'visible') } : { id: id('case'), targetType: 'comment' as const, targetId: comment.id, status: 'open' as const, visibility: comment.visibility ?? 'visible', reportIds, assignedToId: null, assignedToName: null, internalNote: '', createdAt: comment.reports[0]?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: null };
    });
    const generatedTargetIds = new Set(generated.map((item) => item.targetId));
    const next = [...generated, ...persisted.filter((item) => !generatedTargetIds.has(item.targetId) && item.status !== 'open')];
    if (ModerationRepository.saveCases(next)) { setCases(next); setStorageError(''); } else { setStorageError('Não foi possível persistir casos de moderação.'); }
    return next;
  }, []);

  const mutateCase = useCallback(async (caseId: string, action: ModerationActionType, reason: string, updater: (item: ModerationCase) => ModerationCase, visibility?: ContentVisibility, requiresReason = false): Promise<Result> => {
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
    if (visibility && CommentRepository) {
      const moderated = await CommentRepository.moderateVisibility(updated.targetId, visibility);
      if (!moderated.ok) return fail(moderated.message);
    }
    const nextComments = visibility ? currentComments.map((entry) => entry.id === updated.targetId ? { ...entry, visibility, deleted: visibility === 'removed' ? true : entry.deleted, updatedAt: now } : entry) : undefined;
    const ok = ModerationRepository.persistTransaction({ cases: nextCases, actions: nextActions, comments: nextComments });
    if (!ok) return fail('Não foi possível salvar a ação de moderação. Nenhuma alteração foi mantida.');
    setCases(nextCases); setActions(nextActions); setStorageError('');
    return { ok: true };
  }, [fail, permissions.canModerateComments, user]);

  const stats = useMemo(() => ({ openCases: cases.filter((item) => item.status === 'open').length, resolvedCases: cases.filter((item) => item.status === 'resolved').length, hiddenContent: cases.filter((item) => item.visibility === 'hidden').length, reportedComments: cases.length, recentActions: actions.slice(0, 5) }), [actions, cases]);
  return { cases, actions, stats, storageError, hydrateCases, assignCase: (caseId: string) => mutateCase(caseId, 'assigned', 'Caso assumido.', (item) => ({ ...item, assignedToId: user?.id ?? null, assignedToName: user?.name ?? null })), startReview: (caseId: string) => mutateCase(caseId, 'review_started', 'Revisão iniciada.', (item) => ({ ...item, status: 'under_review' })), addInternalNote: (caseId: string, note: string) => mutateCase(caseId, 'note_added', note, (item) => ({ ...item, internalNote: note })), hideComment: (caseId: string, reason: string) => mutateCase(caseId, 'comment_hidden', reason, (item) => ({ ...item, visibility: 'hidden' }), 'hidden', true), restoreComment: (caseId: string, reason = 'Comentário restaurado.') => mutateCase(caseId, 'comment_restored', reason, (item) => ({ ...item, visibility: 'visible' }), 'visible'), removeComment: (caseId: string, reason: string) => mutateCase(caseId, 'comment_removed', reason, (item) => ({ ...item, visibility: 'removed' }), 'removed', true), dismissReport: (caseId: string, reason = 'Reporte ignorado.') => mutateCase(caseId, 'report_dismissed', reason, (item) => ({ ...item, status: 'dismissed', resolvedAt: new Date().toISOString() })), resolveCase: (caseId: string, reason = 'Caso resolvido.') => mutateCase(caseId, 'case_resolved', reason, (item) => ({ ...item, status: 'resolved', resolvedAt: new Date().toISOString() })) };
}
