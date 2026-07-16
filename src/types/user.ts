export type UserAchievementLevel = 'bronze' | 'silver' | 'gold';
export type UserRole = 'member' | 'curator' | 'moderator' | 'admin';

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
  username: string;
  email: string;
  role: string;
  roleKey: UserRole;
  organization: string;
  city: string;
  state: string;
  country: string;
  bio: string;
  avatarUrl?: string;
  website?: string;
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
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization?: string;
  city?: string;
  state?: string;
  country?: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  acceptedTerms: boolean;
};
