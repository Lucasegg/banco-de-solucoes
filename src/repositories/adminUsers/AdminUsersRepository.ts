import type { SupabaseClient } from '@supabase/supabase-js';
import { safeDatabaseMessage } from '../errors';
import type { UserRole } from '../../types/user';

export type AdminUserRecord = {
  id: string;
  name: string;
  username: string | null;
  role: UserRole;
};

type Result<T> = { ok: true; data: T } | { ok: false; message: string };

const supportedRoles: UserRole[] = ['member', 'curator', 'moderator', 'verified_organization', 'admin'];

function isRole(value: unknown): value is UserRole {
  return typeof value === 'string' && supportedRoles.includes(value as UserRole);
}

function roleChangeMessage(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/last administrator/i.test(message)) return 'Não é possível remover o último administrador da plataforma.';
  return safeDatabaseMessage(error, 'Não foi possível alterar o papel do usuário.');
}

/** Administrative access is mediated exclusively by the audited database RPCs. */
export class AdminUsersRepository {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient) { this.client = client; }

  async list(): Promise<Result<AdminUserRecord[]>> {
    const { data, error } = await this.client.rpc('get_admin_users');
    if (error) return { ok: false, message: safeDatabaseMessage(error, 'Não foi possível carregar os usuários.') };
    const users = (data ?? []).flatMap((row: Record<string, unknown>) => {
      if (typeof row.id !== 'string' || !isRole(row.role)) return [];
      const username = typeof row.username === 'string' && row.username.trim() ? row.username : null;
      const displayName = typeof row.display_name === 'string' ? row.display_name.trim() : '';
      return [{ id: row.id, name: displayName || username || 'Usuário Banco de Soluções', username, role: row.role }];
    });
    return { ok: true, data: users };
  }

  async updateRole(userId: string, role: UserRole): Promise<Result<null>> {
    const { error } = await this.client.rpc('update_user_role', { p_user_id: userId, p_role: role });
    return error ? { ok: false, message: roleChangeMessage(error) } : { ok: true, data: null };
  }
}
