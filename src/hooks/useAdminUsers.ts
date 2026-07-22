import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '../integrations/supabase/client';
import { AdminUsersRepository, type AdminUserRecord } from '../repositories/adminUsers';
import type { UserRole } from '../types/user';

export const roleLabels: Record<UserRole, string> = {
  member: 'Usuário', curator: 'Curador', moderator: 'Moderador', verified_organization: 'Organização verificada', admin: 'Administrador',
};
export const manageableRoles: UserRole[] = ['member', 'curator', 'moderator', 'admin'];

export function filterAdminUsers(users: AdminUserRecord[], search: string, role: UserRole | 'all') {
  const normalized = search.trim().toLocaleLowerCase('pt-BR');
  return users.filter((user) => (role === 'all' || user.role === role) && (!normalized || `${user.name} ${user.username ?? ''}`.toLocaleLowerCase('pt-BR').includes(normalized)));
}

export function useAdminUsers(enabled: boolean) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const repository = useMemo(() => supabaseClient ? new AdminUsersRepository(supabaseClient) : null, []);

  useEffect(() => {
    if (!enabled) return;
    if (!repository) { setLoading(false); setError('A gestão de usuários requer uma conexão configurada com o Supabase.'); return; }
    let active = true;
    setLoading(true); setError('');
    void repository.list().then((result) => {
      if (!active) return;
      if (result.ok) setUsers(result.data); else setError(result.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [enabled, repository, refreshToken]);

  async function updateRole(userId: string, role: UserRole) {
    if (!repository) return { ok: false, message: 'A gestão de usuários requer uma conexão configurada com o Supabase.' };
    const result = await repository.updateRole(userId, role);
    if (!result.ok) { setError(result.message); return result; }
    setRefreshToken((value) => value + 1);
    return result;
  }
  return { users, loading, error, clearError: () => setError(''), refresh: () => setRefreshToken((value) => value + 1), updateRole };
}
