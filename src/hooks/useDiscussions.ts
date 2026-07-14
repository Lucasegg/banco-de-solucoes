import { useMemo } from 'react';
import type { Badge, Comment, DiscussionTargetType, Reaction, ReactionType, UserReputation } from '../types/discussion';
import { useAuth } from './useAuth';
import { useLocalStorageState } from './useLocalStorageState';

const COMMENTS_KEY = 'banco-de-solucoes.discussions.comments';
const REACTIONS_KEY = 'banco-de-solucoes.discussions.reactions';
const MAX_DEPTH = 3;

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

export function useDiscussions(targetType?: DiscussionTargetType, targetId?: string) {
  const { user } = useAuth();
  const [comments, setComments] = useLocalStorageState<Comment[]>(COMMENTS_KEY, []);
  const [reactions, setReactions] = useLocalStorageState<Reaction[]>(REACTIONS_KEY, []);

  const targetComments = useMemo(() => comments.filter((comment) => !targetType || !targetId || (comment.targetType === targetType && comment.targetId === targetId)), [comments, targetId, targetType]);

  const addComment = (content: string, parentId: string | null = null) => {
    if (!targetType || !targetId || !user) return { ok: false, message: 'Entre para comentar.' };
    if (!content.trim()) return { ok: false, message: 'Escreva um comentário antes de publicar.' };
    if (getDepth(comments, parentId) > MAX_DEPTH) return { ok: false, message: 'Respostas são permitidas até três níveis.' };
    const now = new Date().toISOString();
    const comment: Comment = { id: createId('comment'), parentId, targetType, targetId, authorId: user.id, authorName: user.name, content: content.trim(), createdAt: now, updatedAt: now, edited: false, deleted: false, bestAnswer: false };
    setComments((current) => [comment, ...current]);
    return { ok: true };
  };

  const toggleReaction = (commentId: string, type: ReactionType) => {
    if (!user) return;
    setReactions((current) => {
      const existing = current.find((reaction) => reaction.commentId === commentId && reaction.userId === user.id && reaction.type === type);
      if (existing) return current.filter((reaction) => reaction.id !== existing.id);
      return [...current, { id: createId('reaction'), commentId, userId: user.id, type, createdAt: new Date().toISOString() }];
    });
  };

  const markBestAnswer = (commentId: string) => {
    if (!targetType || !targetId) return;
    setComments((current) => current.map((comment) => comment.targetType === targetType && comment.targetId === targetId ? { ...comment, bestAnswer: comment.id === commentId } : comment));
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

  return { comments: targetComments, allComments: comments, reactions, reputations, addComment, toggleReaction, markBestAnswer, currentUserId: user?.id ?? null };
}
