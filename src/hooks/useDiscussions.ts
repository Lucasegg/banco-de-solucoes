import { useMemo } from 'react';
import type { ContentVisibility } from '../types/moderation';
import type { Badge, Comment, CommentReport, DiscussionTargetType, Reaction, ReactionType, UserReputation } from '../types/discussion';
import type { UserProfile } from '../types/user';
import { useAuth } from './useAuth';
import { useLocalStorageState } from './useLocalStorageState';

const COMMENTS_KEY = 'banco-de-solucoes.discussions.comments';
const REACTIONS_KEY = 'banco-de-solucoes.discussions.reactions';
const MAX_DEPTH = 3;

type ActionResult = { ok: boolean; message?: string };

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isCommentReport(value: unknown): value is CommentReport {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return isString(item.userId) && isString(item.reason) && isString(item.createdAt);
}

function isContentVisibility(value: unknown): value is ContentVisibility { return value === 'visible' || value === 'hidden' || value === 'removed'; }
function normalizeComment(value: unknown): Comment | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (!(isString(item.id) && (item.parentId === null || isString(item.parentId)) && (item.targetType === 'problem' || item.targetType === 'solution') && isString(item.targetId) && isString(item.authorId) && isString(item.authorName) && isString(item.content) && isString(item.createdAt) && isString(item.updatedAt) && typeof item.edited === 'boolean' && typeof item.deleted === 'boolean' && typeof item.bestAnswer === 'boolean' && Array.isArray(item.reports) && item.reports.every(isCommentReport))) return null;
  return { id: item.id, parentId: item.parentId, targetType: item.targetType, targetId: item.targetId, authorId: item.authorId, authorName: item.authorName, content: item.content, createdAt: item.createdAt, updatedAt: item.updatedAt, edited: item.edited, deleted: item.deleted, visibility: isContentVisibility(item.visibility) ? item.visibility : item.deleted ? 'removed' : 'visible', bestAnswer: item.bestAnswer, reports: item.reports };
}
function isReaction(value: unknown): value is Reaction {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return isString(item.id)
    && isString(item.commentId)
    && isString(item.userId)
    && (item.type === 'like' || item.type === 'support' || item.type === 'interesting' || item.type === 'needsEvidence')
    && isString(item.createdAt);
}

function isCommentArray(value: unknown): value is Comment[] {
  return Array.isArray(value) && value.every((item) => normalizeComment(item) !== null);
}
function normalizeCommentArray(value: unknown): Comment[] {
  return Array.isArray(value) ? value.map(normalizeComment).filter((item): item is Comment => item !== null) : [];
}

function isReactionArray(value: unknown): value is Reaction[] {
  return Array.isArray(value) && value.every(isReaction);
}

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
  const [comments, setComments, commentsStorageError] = useLocalStorageState<Comment[]>(COMMENTS_KEY, [], isCommentArray, normalizeCommentArray);
  const [reactions, setReactions, reactionsStorageError] = useLocalStorageState<Reaction[]>(REACTIONS_KEY, [], isReactionArray);
  const canMarkBestAnswer = canManageTarget(user, targetOwnerNames);

  const targetComments = useMemo(() => comments.filter((comment) => !targetType || !targetId || (comment.targetType === targetType && comment.targetId === targetId)), [comments, targetId, targetType]);

  const addComment = (content: string, parentId: string | null = null): ActionResult => {
    if (!targetType || !targetId || !user) return { ok: false, message: 'Entre para comentar.' };
    if (!content.trim()) return { ok: false, message: 'Escreva um comentário antes de publicar.' };
    if (getDepth(comments, parentId) > MAX_DEPTH) return { ok: false, message: 'Respostas são permitidas até três níveis.' };
    const now = new Date().toISOString();
    const comment: Comment = { id: createId('comment'), parentId, targetType, targetId, authorId: user.id, authorName: user.name, content: content.trim(), createdAt: now, updatedAt: now, edited: false, deleted: false, visibility: 'visible', bestAnswer: false, reports: [] };
    setComments((current) => [comment, ...current]);
    return { ok: true };
  };

  const editComment = (commentId: string, content: string): ActionResult => {
    if (!user) return { ok: false, message: 'Entre para editar.' };
    if (!content.trim()) return { ok: false, message: 'O comentário não pode ficar vazio.' };
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.authorId !== user.id || comment.deleted) return { ok: false, message: 'Você só pode editar seus comentários ativos.' };
    setComments((current) => current.map((item) => item.id === commentId ? { ...item, content: content.trim(), edited: true, updatedAt: new Date().toISOString() } : item));
    return { ok: true };
  };

  const deleteComment = (commentId: string): ActionResult => {
    if (!user) return { ok: false, message: 'Entre para excluir.' };
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.authorId !== user.id || comment.deleted) return { ok: false, message: 'Você só pode excluir seus comentários ativos.' };
    setComments((current) => current.map((item) => item.id === commentId ? { ...item, deleted: true, visibility: 'removed', bestAnswer: false, updatedAt: new Date().toISOString() } : item));
    return { ok: true };
  };

  const reportComment = (commentId: string, reason: string): ActionResult => {
    if (!user) return { ok: false, message: 'Entre para reportar.' };
    if (!reason.trim()) return { ok: false, message: 'Informe o motivo do reporte.' };
    const comment = comments.find((item) => item.id === commentId);
    if (!comment || comment.authorId === user.id || comment.reports.some((report) => report.userId === user.id)) return { ok: false, message: 'Não foi possível registrar este reporte.' };
    const report: CommentReport = { userId: user.id, reason: reason.trim(), createdAt: new Date().toISOString() };
    setComments((current) => current.map((item) => item.id === commentId ? { ...item, reports: [...item.reports, report] } : item));
    return { ok: true, message: 'Comentário reportado para moderação.' };
  };

  const toggleReaction = (commentId: string, type: ReactionType) => {
    if (!user) return;
    setReactions((current) => {
      const existing = current.find((reaction) => reaction.commentId === commentId && reaction.userId === user.id && reaction.type === type);
      if (existing) return current.filter((reaction) => reaction.id !== existing.id);
      return [...current, { id: createId('reaction'), commentId, userId: user.id, type, createdAt: new Date().toISOString() }];
    });
  };

  const markBestAnswer = (commentId: string): ActionResult => {
    if (!targetType || !targetId) return { ok: false, message: 'Discussão não encontrada.' };
    if (!canMarkBestAnswer) return { ok: false, message: 'Apenas o autor pode marcar a melhor resposta.' };
    const comment = comments.find((item) => item.id === commentId && item.targetType === targetType && item.targetId === targetId && !item.deleted);
    if (!comment) return { ok: false, message: 'Comentário não encontrado.' };
    setComments((current) => current.map((item) => item.targetType === targetType && item.targetId === targetId ? { ...item, bestAnswer: item.id === commentId } : item));
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

  return { comments: targetComments, allComments: comments, reactions, reputations, addComment, editComment, deleteComment, reportComment, toggleReaction, markBestAnswer, canMarkBestAnswer, currentUserId: user?.id ?? null, storageError: commentsStorageError ?? reactionsStorageError };
}
