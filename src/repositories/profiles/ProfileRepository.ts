import type { SupabaseClient } from '@supabase/supabase-js';
import { defaultAchievements, defaultStats } from '../../data/mockUsers';
import type { UserProfile, UserRole } from '../../types/user';

export type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type EditableProfileFields = Pick<UserProfile, 'username' | 'name' | 'country' | 'bio' | 'avatarUrl'>;
export type ProfileLoadResult = { ok: true; profile: UserProfile } | { ok: false; reason: 'missing' | 'invalid' | 'forbidden' | 'network'; message: string };

const editableColumns = ['username', 'display_name', 'country', 'bio', 'avatar_url'] as const;

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function roleKey(value: unknown): UserRole { return value === 'curator' || value === 'moderator' || value === 'admin' ? value : 'member'; }
function roleLabel(role: UserRole) { return ({ member: 'Colaborador(a)', curator: 'Curador(a)', moderator: 'Moderador(a)', admin: 'Administrador(a)' } as const)[role]; }
function normalizeUsername(value: string) { return value.trim().toLowerCase(); }
function isProfileRow(value: unknown): value is ProfileRow { return isRecord(value) && typeof value.id === 'string'; }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BS'; }

export function mapProfileRowToUserProfile(row: ProfileRow, email = ''): UserProfile | null {
  if (!isProfileRow(row)) return null;
  const name = row.display_name?.trim() || row.username?.trim() || 'Usuário Banco de Soluções';
  const role = roleKey(row.role);
  return {
    id: row.id,
    name,
    username: row.username?.trim() || row.id.slice(0, 8),
    email,
    role: roleLabel(role),
    roleKey: role,
    organization: 'Comunidade Banco de Soluções',
    city: '—',
    state: '—',
    country: row.country?.trim() || 'Brasil',
    bio: row.bio?.trim() || 'Perfil sem biografia pública.',
    avatarUrl: row.avatar_url?.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(initials(name))}&background=0f172a&color=fff`,
    createdAt: row.created_at || new Date().toISOString(),
    stats: { ...defaultStats },
    achievements: defaultAchievements.slice(0, 1),
    settings: { emailNotifications: true, publicProfile: true, weeklyDigest: false },
  };
}

export class ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getByAuthUserId(userId: string, email = ''): Promise<ProfileLoadResult> {
    const { data, error } = await this.client.from('profiles').select('id, username, display_name, country, bio, avatar_url, role, created_at, updated_at').eq('id', userId).maybeSingle();
    if (error) return { ok: false, reason: error.code === '42501' ? 'forbidden' : 'network', message: 'Não foi possível carregar o perfil.' };
    if (!data) return { ok: false, reason: 'missing', message: 'Sessão válida, mas o perfil ainda não está disponível.' };
    const profile = mapProfileRowToUserProfile(data, email);
    if (!profile) return { ok: false, reason: 'invalid', message: 'O perfil retornado está inválido.' };
    return { ok: true, profile };
  }

  async updateEditableFields(userId: string, fields: Partial<EditableProfileFields>, email = ''): Promise<ProfileLoadResult> {
    const payload: Partial<Record<(typeof editableColumns)[number], string | null>> = {};
    if (typeof fields.username === 'string') payload.username = normalizeUsername(fields.username);
    if (typeof fields.name === 'string') payload.display_name = fields.name.trim();
    if (typeof fields.country === 'string') payload.country = fields.country.trim();
    if (typeof fields.bio === 'string') payload.bio = fields.bio.trim();
    if (typeof fields.avatarUrl === 'string') payload.avatar_url = fields.avatarUrl.trim() || null;

    const { data, error } = await this.client.from('profiles').update(payload).eq('id', userId).select('id, username, display_name, country, bio, avatar_url, role, created_at, updated_at').single();
    if (error) {
      const conflict = error.code === '23505' ? 'Nome de usuário já está em uso.' : 'Não foi possível atualizar o perfil.';
      return { ok: false, reason: error.code === '42501' ? 'forbidden' : 'network', message: conflict };
    }
    const profile = mapProfileRowToUserProfile(data, email);
    if (!profile) return { ok: false, reason: 'invalid', message: 'O perfil retornado está inválido.' };
    return { ok: true, profile };
  }
}
