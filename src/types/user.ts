export type UserAchievementLevel = 'bronze' | 'silver' | 'gold';

export interface UserStats {
  problemsSubmitted: number;
  solutionsSubmitted: number;
  favoritesSaved: number;
  contributionsReviewed: number;
  impactScore: number;
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  level: UserAchievementLevel;
  unlockedAt: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  publicProfile: boolean;
  weeklyDigest: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  city: string;
  state: string;
  bio: string;
  avatarUrl?: string;
  createdAt: string;
  stats: UserStats;
  achievements: UserAchievement[];
  settings: UserSettings;
}

export interface MockUser extends UserProfile {
  password: string;
}

export type RegisterUserInput = {
  name: string;
  email: string;
  password: string;
  organization?: string;
  city?: string;
  state?: string;
};
