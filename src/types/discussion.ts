export type DiscussionTargetType = 'problem' | 'solution';
export type ReactionType = 'like' | 'support' | 'interesting' | 'needsEvidence';
export type BadgeLevel = 'bronze' | 'silver' | 'gold';

export interface Comment {
  id: string;
  parentId: string | null;
  targetType: DiscussionTargetType;
  targetId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  deleted: boolean;
  bestAnswer: boolean;
}

export interface Reaction {
  id: string;
  commentId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
}

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
