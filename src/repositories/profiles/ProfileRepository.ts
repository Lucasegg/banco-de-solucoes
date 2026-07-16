import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile, UserRole, UserStats } from '../../types/user';

export type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  organization: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type EditableProfileFields = Pick<UserProfile, 'username' | 'name' | 'organization' | 'city' | 'state' | 'country' | 'bio' | 'website'>;
export type ProfileLoadResult = { ok: true; profile: UserProfile } | { ok: false; reason: 'missing' | 'invalid' | 'forbidden' | 'network'; message: string };

const profileSelect = 'id, username, display_name, organization, city, state, country, bio, avatar_url, website, role, created_at, updated_at';
const usernameRegex = /^[a-z0-9._-]{3,30}$/;

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function isNullableString(value: unknown): value is string | null | undefined { return value === null || value === undefined || typeof value === 'string'; }
function requiredString(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function safeTrim(value: string | null | undefined) { return value?.trim() ?? ''; }
function nullableTrim(value: string | undefined) { const trimmed = value?.trim() ?? ''; return trimmed.length > 0 ? trimmed : null; }
function roleKey(value: unknown): UserRole { return value === 'curator' || value === 'moderator' || value === 'admin' ? value : 'member'; }
function roleLabel(role: UserRole) { return ({ member: 'Colaborador(a)', curator: 'Curador(a)', moderator: 'Moderador(a)', admin: 'Administrador(a)' } as const)[role]; }
export function normalizeUsername(value: string) { return value.trim().toLowerCase(); }
export function isValidUsername(value: string) { return usernameRegex.test(normalizeUsername(value)); }
function isProfileRow(value: unknown): value is ProfileRow {
  return isRecord(value)
    && requiredString(value.id)
    && isNullableString(value.username)
    && isNullableString(value.display_name)
    && isNullableString(value.organization)
    && isNullableString(value.city)
    && isNullableString(value.state)
    && isNullableString(value.country)
    && isNullableString(value.bio)
    && isNullableString(value.avatar_url)
    && isNullableString(value.website)
    && isNullableString(value.role)
    && isNullableString(value.created_at)
    && isNullableString(value.updated_at);
}
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BS'; }

export function createEmptyUserStats(): UserStats {
  return { problemsSubmitted: 0, solutionsSubmitted: 0, favoritesSaved: 0, contributionsReviewed: 0, impactScore: 0 };
}

export function mapProfileRowToUserProfile(row: ProfileRow, email = ''): UserProfile | null {
  if (!isProfileRow(row)) return null;
  const name = safeTrim(row.display_name) || safeTrim(row.username) || 'Usuário Banco de Soluções';
  const role = roleKey(row.role);
  return {
    id: row.id,
    name,
    username: safeTrim(row.username) || row.id.slice(0, 8),
    email,
    role: roleLabel(role),
    roleKey: role,
    organization: safeTrim(row.organization),
    city: safeTrim(row.city),
    state: safeTrim(row.state),
    country: safeTrim(row.country),
    bio: safeTrim(row.bio),
    website: safeTrim(row.website),
    avatarUrl: safeTrim(row.avatar_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(initials(name))}&background=0f172a&color=fff`,
    createdAt: row.created_at || new Date().toISOString(),
    stats: createEmptyUserStats(),
    achievements: [],
    settings: { emailNotifications: true, publicProfile: true, weeklyDigest: false },
  };
}

export class ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByUserId(userId: string, email = ''): Promise<ProfileLoadResult> {
    const { data, error } = await this.client.from('profiles').select(profileSelect).eq('id', userId).maybeSingle();
    if (error) return { ok: false, reason: error.code === '42501' ? 'forbidden' : 'network', message: 'Não foi possível carregar o perfil.' };
    if (!data) return { ok: false, reason: 'missing', message: 'Sessão válida, mas o perfil ainda não está disponível.' };
    const profile = mapProfileRowToUserProfile(data, email);
    if (!profile) return { ok: false, reason: 'invalid', message: 'O perfil retornado está inválido.' };
    return { ok: true, profile };
  }

  getByAuthUserId(userId: string, email = '') { return this.getByUserId(userId, email); }

  async getByUsername(username: string, email = ''): Promise<ProfileLoadResult> {
    const normalized = normalizeUsername(username);
    const { data, error } = await this.client.from('profiles').select(profileSelect).eq('username', normalized).maybeSingle();
    if (error) return { ok: false, reason: error.code === '42501' ? 'forbidden' : 'network', message: 'Não foi possível carregar o perfil.' };
    if (!data) return { ok: false, reason: 'missing', message: 'Perfil não encontrado.' };
    const profile = mapProfileRowToUserProfile(data, email);
    if (!profile) return { ok: false, reason: 'invalid', message: 'O perfil retornado está inválido.' };
    return { ok: true, profile };
  }

  async isUsernameAvailable(username: string, currentUserId?: string): Promise<{ ok: boolean; available: boolean; message?: string }> {
    const normalized = normalizeUsername(username);
    if (!isValidUsername(normalized)) return { ok: true, available: false, message: 'Use 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou underline.' };
    const { data, error } = await this.client.from('profiles').select('id').eq('username', normalized).maybeSingle();
    if (error) return { ok: false, available: false, message: 'Não foi possível validar o nome de usuário.' };
    return { ok: true, available: !data || data.id === currentUserId };
  }

  async updateOwnProfile(userId: string, fields: Partial<EditableProfileFields>, email = ''): Promise<ProfileLoadResult> {
    const payload = {
      username: typeof fields.username === 'string' ? normalizeUsername(fields.username) : undefined,
      display_name: typeof fields.name === 'string' ? nullableTrim(fields.name) : undefined,
      organization: typeof fields.organization === 'string' ? nullableTrim(fields.organization) : undefined,
      city: typeof fields.city === 'string' ? nullableTrim(fields.city) : undefined,
      state: typeof fields.state === 'string' ? nullableTrim(fields.state) : undefined,
      country: typeof fields.country === 'string' ? nullableTrim(fields.country) : undefined,
      bio: typeof fields.bio === 'string' ? nullableTrim(fields.bio) : undefined,
      website: typeof fields.website === 'string' ? nullableTrim(fields.website) : undefined,
    };
    const { data, error } = await this.client.from('profiles').update(payload).eq('id', userId).select(profileSelect).single();
    if (error) {
      const message = error.code === '23505' ? 'Nome de usuário já está em uso.' : error.code === '23514' ? 'Revise os campos informados.' : 'Não foi possível atualizar o perfil.';
      return { ok: false, reason: error.code === '42501' ? 'forbidden' : 'network', message };
    }
    const profile = mapProfileRowToUserProfile(data, email);
    if (!profile) return { ok: false, reason: 'invalid', message: 'O perfil retornado está inválido.' };
    return { ok: true, profile };
  }

  updateEditableFields(userId: string, fields: Partial<EditableProfileFields>, email = '') { return this.updateOwnProfile(userId, fields, email); }
}
