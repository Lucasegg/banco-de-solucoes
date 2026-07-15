import type { ContentVisibility } from '../../types/moderation';
import type { Comment, CommentReport, Reaction } from '../../types/discussion';
import { localStorageAdapter } from '../../storage/LocalStorageAdapter';

export const COMMENTS_KEY = 'banco-de-solucoes.discussions.comments';
export const REACTIONS_KEY = 'banco-de-solucoes.discussions.reactions';

function isString(value: unknown): value is string { return typeof value === 'string'; }
function isCommentReport(value: unknown): value is CommentReport {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return isString(item.userId) && isString(item.reason) && isString(item.createdAt);
}
function isContentVisibility(value: unknown): value is ContentVisibility { return value === 'visible' || value === 'hidden' || value === 'removed'; }
export function normalizeComment(value: unknown): Comment | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (!(isString(item.id) && (item.parentId === null || isString(item.parentId)) && (item.targetType === 'problem' || item.targetType === 'solution') && isString(item.targetId) && isString(item.authorId) && isString(item.authorName) && isString(item.content) && isString(item.createdAt) && isString(item.updatedAt) && typeof item.edited === 'boolean' && typeof item.deleted === 'boolean' && typeof item.bestAnswer === 'boolean' && Array.isArray(item.reports) && item.reports.every(isCommentReport))) return null;
  return { id: item.id, parentId: item.parentId, targetType: item.targetType, targetId: item.targetId, authorId: item.authorId, authorName: item.authorName, content: item.content, createdAt: item.createdAt, updatedAt: item.updatedAt, edited: item.edited, deleted: item.deleted, visibility: isContentVisibility(item.visibility) ? item.visibility : item.deleted ? 'removed' : 'visible', bestAnswer: item.bestAnswer, reports: item.reports };
}
export function isComment(value: unknown): value is Comment { return normalizeComment(value) !== null; }
export function normalizeCommentArray(value: unknown): Comment[] { return Array.isArray(value) ? value.map(normalizeComment).filter((item): item is Comment => item !== null) : []; }
export function isCommentArray(value: unknown): value is Comment[] { return Array.isArray(value) && value.every(isComment); }
export function isReaction(value: unknown): value is Reaction {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return isString(item.id) && isString(item.commentId) && isString(item.userId) && (item.type === 'like' || item.type === 'support' || item.type === 'interesting' || item.type === 'needsEvidence') && isString(item.createdAt);
}
export function isReactionArray(value: unknown): value is Reaction[] { return Array.isArray(value) && value.every(isReaction); }

export const CommentRepository = {
  keys: { comments: COMMENTS_KEY, reactions: REACTIONS_KEY },
  listComments: () => localStorageAdapter.get(COMMENTS_KEY, { fallback: [] as Comment[], normalizer: normalizeCommentArray }),
  saveComments: (comments: Comment[]) => localStorageAdapter.set(COMMENTS_KEY, comments.filter(isComment)),
  listReactions: () => localStorageAdapter.get(REACTIONS_KEY, { fallback: [] as Reaction[], validator: isReactionArray }),
  saveReactions: (reactions: Reaction[]) => localStorageAdapter.set(REACTIONS_KEY, reactions.filter(isReaction)),
};
