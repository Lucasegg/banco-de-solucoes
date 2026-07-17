export type DiscussionTargetType = 'problem' | 'solution';
export type ReactionType = 'useful' | 'liked' | 'interesting';
export type BadgeLevel = 'bronze' | 'silver' | 'gold';
import type { ContentVisibility } from './moderation';

export interface CommentReport {
  userId: string;
  reason: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  parentId: string | null;
  targetType: DiscussionTargetType;
  targetId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  deleted: boolean;
  visibility: ContentVisibility;
  bestAnswer: boolean;
  reports: CommentReport[];
}

export interface Reaction {
  id: string;
  userId: string;
  problemId: string | null;
  solutionId: string | null;
  reactionType: ReactionType;
  createdAt: string;
}

/** Dados locais legados de reações a comentários; a Sprint 20 reage ao item. */
export interface CommentReaction { id: string; commentId: string; userId: string; type: 'like' | 'support' | 'interesting' | 'needsEvidence'; createdAt: string; }
export type CommentReactionType = CommentReaction['type'];

export type ReactionCounts = Record<ReactionType, number>;
export interface ReactionState { counts: ReactionCounts; selected: ReactionType[]; }

export interface Badge {
  id: string;
  title: string;
  description: string;
  level: BadgeLevel;
  earnedAt: string;
}

export interface UserReputation {
  userId: string;
  points: number;
  comments: number;
  bestAnswers: number;
  reactionsReceived: number;
  discussions: number;
  badges: Badge[];
}
