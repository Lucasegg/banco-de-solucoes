import { useEffect, useMemo, useState } from 'react';
import type { Badge, Comment, CommentReport, DiscussionTargetType, CommentReaction, CommentReactionType, UserReputation } from '../types/discussion';
import type { UserProfile } from '../types/user';
import { useAuth } from './useAuth';
import { useLocalStorageState } from './useLocalStorageState';
import { CommentRepository, COMMENTS_KEY, REACTIONS_KEY, isCommentArray, isReactionArray, normalizeCommentArray } from '../repositories/comments';

const MAX_DEPTH = 3;

type ActionResult = { ok: boolean; message?: string };

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDepth(comments: Comment[], parentId: string | null): number {
  if (!parentId) return 1;
  const parent = comments.find((comment) => comment.id === parentId);
  if (!parent) return 1;
  return 1 + getDepth(comments, parent.parentId);
}

function buildBadges(stats: Omit<UserReputation, 'badges'>): Badge[] {
  const badges: Badge[] = [];
  const today = new Date().toISOString();
  if (stats.comments >= 1) badges.push({ id: 'voz-ativa', title: 'Voz ativa', description: 'Publicou o primeiro comentário.', level: 'bronze', earnedAt: today });
  if (stats.reactionsReceived >= 3) badges.push({ id: 'ideia-apoiada', title: 'Ideia apoiada', description: 'Recebeu múltiplas reações da comunidade.', level: 'silver', earnedAt: today });
  if (stats.bestAnswers >= 1) badges.push({ id: 'melhor-resposta', title: 'Melhor resposta', description: 'Teve uma resposta marcada como melhor resposta.', level: 'gold', earnedAt: today });
  return badges;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function canManageTarget(user: UserProfile | null, targetOwnerNames: string[]) {
  if (!user) return false;
  const aliases = [user.id, user.name, user.username, user.organization, user.email].map(normalize);
  return targetOwnerNames.map(normalize).some((owner) => aliases.includes(owner));
}

export function useDiscussions(targetType?: DiscussionTargetType, targetId?: string, targetOwnerNames: string[] = []) {
  const { user } = useAuth();
  const [localComments, setLocalComments, commentsStorageError] = useLocalStorageState<Comment[]>(COMMENTS_KEY, [], isCommentArray, normalizeCommentArray);
  const [remoteComments, setRemoteComments] = useState<Comment[]>([]);
  const [remoteError, setRemoteError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reactions, setReactions, reactionsStorageError] = useLocalStorageState<CommentReaction[]>(REACTIONS_KEY, [], isReactionArray);
  const canMarkBestAnswer = canManageTarget(user, targetOwnerNames);

  const comments = CommentRepository ? remoteComments : localComments;
  useEffect(() => {
    let active = true;
    async function loadRemoteComments() {
      if (!CommentRepository) return;
      const result = targetType && targetId ? (targetType === 'problem' ? await CommentRepository.listByProblem(targetId) : await CommentRepository.listBySolution(targetId)) : await CommentRepository.listReported();
      if (!active) return;
      if (result.ok) { setRemoteComments(result.data); setRemoteError(''); } else setRemoteError(result.message);
    }
    void loadRemoteComments();
    return () => { active = false; };
  }, [targetId, targetType]);

  const targetComments = useMemo(() => comments.filter((comment) => !targetType || !targetId || (comment.targetType === targetType && comment.targetId === targetId)), [comments, targetId, targetType]);

  const addComment = async (content: string, parentId: string | null = null): Promise<ActionResult> => {
    if (!targetType || !targetId || !user) return { ok: false, message: 'Entre para comentar.' };
    if (!content.trim()) return { ok: false, message: 'Escreva um comentário antes de publicar.' };
    if (getDepth(comments, parentId) > MAX_DEPTH) return { ok: false, message: 'Respostas são permitidas até três níveis.' };
    if (content.trim().length > 2000) return { ok: false, message: 'O comentário deve ter no máximo 2000 caracteres.' };
    if (isSubmitting) return { ok: false, message: 'Aguarde o envio do comentário.' };
    if (CommentRepository) {
      setIsSubmitting(true);
      const result = await CommentRepository.create(targetType === 'problem' ? { authorId: user.id, problemId: targetId, parentId, content } : { authorId: user.id, solutionId: targetId, parentId, content });
      if (result.ok) { setRemoteComments((current) => [result.data, ...current]); setRemoteError(''); } else setRemoteError(result.message);
      setIsSubmitting(false);
      return result.ok ? { ok: true } : result;
    }
    const now = new Date().toISOString();
    const comment: Comment = { id: createId('comment'), parentId, targetType, targetId, authorId: user.id, authorName: user.name, authorAvatarUrl: user.avatarUrl ?? null, content: content.trim(), createdAt: now, updatedAt: now, edited: false, deleted: false, visibility: 'visible', bestAnswer: false, reports: [] };
    setLocalComments((current) => [comment, ...current]);
    return { ok: true };
  };

  const editComment = async (commentId: string, content: string): Promise<ActionResult> => {
    if (!user) return { ok: false, message: 'Entre para editar.' };
    if (!content.trim()) return { ok: false, message: 'O comentário não pode ficar vazio.' };
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.authorId !== user.id || comment.deleted) return { ok: false, message: 'Você só pode editar seus comentários ativos.' };
    if (content.trim().length > 2000) return { ok: false, message: 'O comentário deve ter no máximo 2000 caracteres.' };
    if (CommentRepository) {
      const result = await CommentRepository.update(commentId, { content });
      if (result.ok) { setRemoteComments((current) => current.map((item) => item.id === commentId ? result.data : item)); setRemoteError(''); } else setRemoteError(result.message);
      return result.ok ? { ok: true } : result;
    }
    setLocalComments((current) => current.map((item) => item.id === commentId ? { ...item, content: content.trim(), edited: true, updatedAt: new Date().toISOString() } : item));
    return { ok: true };
  };

  const deleteComment = async (commentId: string): Promise<ActionResult> => {
    if (!user) return { ok: false, message: 'Entre para excluir.' };
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.authorId !== user.id || comment.deleted) return { ok: false, message: 'Você só pode excluir seus comentários ativos.' };
    if (CommentRepository) {
      const result = await CommentRepository.delete(commentId);
      if (result.ok) { setRemoteComments((current) => current.filter((item) => item.id !== commentId)); setRemoteError(''); } else setRemoteError(result.message);
      return result.ok ? { ok: true } : result;
    }
    setLocalComments((current) => current.map((item) => item.id === commentId ? { ...item, deleted: true, visibility: 'removed', bestAnswer: false, updatedAt: new Date().toISOString() } : item));
    return { ok: true };
  };

  const reportComment = async (commentId: string, reason: string): Promise<ActionResult> => {
    if (!user) return { ok: false, message: 'Entre para reportar.' };
    if (!reason.trim()) return { ok: false, message: 'Informe o motivo do reporte.' };
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.authorId === user.id || comment.reports.some((report) => report.userId === user.id)) return { ok: false, message: 'Não foi possível registrar este reporte.' };
    const report: CommentReport = { userId: user.id, reason: reason.trim(), createdAt: new Date().toISOString() };
    const nextReports = [...comment.reports, report];
    if (CommentRepository) {
      const result = await CommentRepository.report(commentId, reason);
      if (result.ok) { setRemoteComments((current) => current.map((item) => item.id === commentId ? { ...item, reports: nextReports } : item)); setRemoteError(''); } else { setRemoteError(result.message); return result; }
    } else {
      setLocalComments((current) => current.map((item) => item.id === commentId ? { ...item, reports: nextReports } : item));
    }
    return { ok: true, message: 'Comentário reportado para moderação.' };
  };

  const toggleReaction = (commentId: string, type: CommentReactionType) => {
    if (!user) return;
    setReactions((current) => {
      const existing = current.find((reaction) => reaction.commentId === commentId && reaction.userId === user.id && reaction.type === type);
      if (existing) return current.filter((reaction) => reaction.id !== existing.id);
      return [...current, { id: createId('reaction'), commentId, userId: user.id, type, createdAt: new Date().toISOString() }];
    });
  };

  const markBestAnswer = async (commentId: string): Promise<ActionResult> => {
    if (!targetType || !targetId) return { ok: false, message: 'Discussão não encontrada.' };
    if (!canMarkBestAnswer) return { ok: false, message: 'Apenas o autor pode marcar a melhor resposta.' };
    const comment = comments.find((item) => item.id === commentId && item.targetType === targetType && item.targetId === targetId && !item.deleted);
    if (!comment) return { ok: false, message: 'Comentário não encontrado.' };
    if (CommentRepository) {
      const result = await CommentRepository.setBestAnswer(targetType, targetId, commentId);
      if (result.ok) { setRemoteComments((current) => current.map((item) => item.targetType === targetType && item.targetId === targetId ? { ...item, bestAnswer: item.id === commentId } : item)); setRemoteError(''); } else setRemoteError(result.message);
      return result.ok ? { ok: true } : result;
    }
    setLocalComments((current) => current.map((item) => item.targetType === targetType && item.targetId === targetId ? { ...item, bestAnswer: item.id === commentId } : item));
    return { ok: true };
  };

  const reputations = useMemo<UserReputation[]>(() => {
    const userIds = new Set(comments.map((comment) => comment.authorId));
    return Array.from(userIds).map((userId) => {
      const authored = comments.filter((comment) => comment.authorId === userId && !comment.deleted);
      const authoredIds = new Set(authored.map((comment) => comment.id));
      const reactionsReceived = reactions.filter((reaction) => authoredIds.has(reaction.commentId)).length;
      const bestAnswers = authored.filter((comment) => comment.bestAnswer).length;
      const discussions = new Set(authored.map((comment) => `${comment.targetType}:${comment.targetId}`)).size;
      const stats = { userId, points: authored.length * 5 + reactionsReceived * 2 + bestAnswers * 25, comments: authored.length, bestAnswers, reactionsReceived, discussions };
      return { ...stats, badges: buildBadges(stats) };
    });
  }, [comments, reactions]);

  return { comments: targetComments, allComments: comments, reactions, reputations, addComment, editComment, deleteComment, reportComment, toggleReaction, markBestAnswer, canMarkBestAnswer, currentUserId: user?.id ?? null, storageError: remoteError || commentsStorageError || reactionsStorageError || (isSubmitting ? 'Enviando comentário...' : '') };
}
