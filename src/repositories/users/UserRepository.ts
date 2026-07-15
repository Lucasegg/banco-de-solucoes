import { defaultAchievements, defaultStats, mockUsers } from '../../data/mockUsers';
import { localStorageAdapter } from '../../storage/LocalStorageAdapter';
import type { MockUser, RegisterUserInput, UserProfile, UserRole, UserSettings } from '../../types/user';

const SESSION_KEY = 'banco-de-solucoes.auth.session';
const USERS_KEY = 'banco-de-solucoes.auth.users';

type Session = { email: string; signedInAt: string };

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function roleKeyOrMember(value: unknown): UserRole { return value === 'curator' || value === 'moderator' || value === 'admin' ? value : 'member'; }
function normalizeUser(user: MockUser): MockUser { return { ...user, roleKey: roleKeyOrMember(user.roleKey) }; }
function isStoredUser(value: unknown): value is MockUser { return isRecord(value) && typeof value.email === 'string' && typeof value.password === 'string'; }
function normalizeStoredUser(value: unknown): MockUser | null { return isStoredUser(value) ? normalizeUser(value) : null; }
function isSession(value: unknown): value is Session { return isRecord(value) && typeof value.email === 'string' && typeof value.signedInAt === 'string'; }
function createId() { if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID(); return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function mergeUsers(defaultUsers: MockUser[], storedUsers: MockUser[]) {
  const usersByEmail = new Map(defaultUsers.map((user) => [user.email.toLowerCase(), normalizeUser(user)]));
  storedUsers.forEach((storedUser) => usersByEmail.set(storedUser.email.toLowerCase(), normalizeUser(storedUser)));
  return Array.from(usersByEmail.values());
}

export function withoutPassword(user: MockUser): UserProfile {
  const { password: _password, ...profile } = user;
  return normalizeUser(profile as MockUser);
}

export function buildRegisteredUser(input: RegisterUserInput): MockUser {
  const name = input.name.trim();
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BS';
  return { id: `user-${createId()}`, name, username: input.username.trim().toLowerCase(), email: input.email.trim().toLowerCase(), password: input.password, role: 'Colaborador(a)', roleKey: 'member', organization: input.organization?.trim() || 'Comunidade Banco de Soluções', city: input.city?.trim() || 'Brasil', state: input.state?.trim() || 'BR', country: input.country?.trim() || 'Brasil', bio: input.bio?.trim() || 'Novo perfil preparado para contribuir com problemas, soluções e evidências.', avatarUrl: input.avatarUrl?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0f172a&color=fff`, createdAt: new Date().toISOString().slice(0, 10), stats: { ...defaultStats, problemsSubmitted: 0, solutionsSubmitted: 0, favoritesSaved: 0, contributionsReviewed: 0, impactScore: 10 }, achievements: defaultAchievements.slice(0, 1), settings: { emailNotifications: true, publicProfile: true, weeklyDigest: false } };
}

export const UserRepository = {
  keys: { users: USERS_KEY, session: SESSION_KEY },
  listStoredUsers: () => localStorageAdapter.list(USERS_KEY, { normalizer: normalizeStoredUser }),
  listUsers: () => mergeUsers(mockUsers, localStorageAdapter.list(USERS_KEY, { normalizer: normalizeStoredUser })),
  saveUsers: (users: MockUser[]) => localStorageAdapter.set(USERS_KEY, users.map(normalizeUser)),
  readSessionEmail: () => localStorageAdapter.get(SESSION_KEY, { fallback: null as string | null, normalizer: (value) => isSession(value) ? value.email : null }),
  saveSession: (email: string) => localStorageAdapter.set(SESSION_KEY, { email, signedInAt: new Date().toISOString() }),
  clearSession: () => localStorageAdapter.remove(SESSION_KEY),
  findByEmail: (email: string, users: MockUser[]) => users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase()) ?? null,
  findByUsername: (username: string, users: MockUser[]) => users.find((item) => item.username.toLowerCase() === username.trim().toLowerCase()) ?? null,
  updateSettings: (users: MockUser[], userId: string, settings: UserSettings) => users.map((item) => item.id === userId ? { ...item, settings } : item),
};
