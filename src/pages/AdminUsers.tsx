import { ArrowLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChangeUserRoleDialog } from '../components/admin/ChangeUserRoleDialog';
import { UserAdminList } from '../components/admin/UserAdminList';
import { filterAdminUsers, roleLabels, useAdminUsers } from '../hooks/useAdminUsers';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import type { AdminUserRecord } from '../repositories/adminUsers';
import type { UserRole } from '../types/user';
import { restoreFocus } from '../components/admin/focusTrap';

export function AdminUsers({ onBack }: { onBack: () => void }) {
  const { user } = useAuth(); const permissions = usePermissions(user); const adminUsers = useAdminUsers(permissions.canManageRoles);
  const [searchInput, setSearchInput] = useState(''); const [search, setSearch] = useState(''); const [role, setRole] = useState<UserRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null); const trigger = useRef<HTMLButtonElement | null>(null); const [feedback, setFeedback] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setSearch(searchInput), 250); return () => window.clearTimeout(timer); }, [searchInput]);
  const filteredUsers = useMemo(() => filterAdminUsers(adminUsers.users, search, role), [adminUsers.users, search, role]);
  function openDialog(nextUser: AdminUserRecord, source: HTMLButtonElement) { trigger.current = source; setFeedback(''); setSelectedUser(nextUser); }
  function closeDialog() { setSelectedUser(null); window.setTimeout(() => restoreFocus(trigger.current), 0); }
  async function changeRole(nextRole: UserRole) { if (!selectedUser) return { ok: false, message: 'Usuário não encontrado.' }; const result = await adminUsers.updateRole(selectedUser.id, nextRole); if (result.ok) { setFeedback(`Papel de ${selectedUser.name} atualizado para ${roleLabels[nextRole]}.`); closeDialog(); } return result; }
  if (!permissions.canManageRoles) return null;
  return <section className="space-y-6"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Administração</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Gestão de usuários</h1><p className="mt-3 max-w-2xl text-muted dark:text-slate-300">Consulte perfis e atualize papéis administrativos pela autorização segura da plataforma.</p></div><button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"><ArrowLeft size={16} aria-hidden="true" />Voltar ao painel</button></header>
    <div className="grid gap-3 rounded-3xl border border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[1fr_220px]"><div><label htmlFor="user-search" className="sr-only">Buscar usuários por nome ou nome de usuário</label><div className="flex items-center rounded-2xl border border-line bg-white px-3 focus-within:ring-2 focus-within:ring-teal-400 dark:bg-slate-950"><Search size={18} aria-hidden="true" className="text-muted" /><input id="user-search" value={searchInput} onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchInput(event.target.value)} placeholder="Buscar por nome ou nome de usuário" className="w-full bg-transparent p-3 text-sm outline-none" /></div></div><div><label htmlFor="role-filter" className="sr-only">Filtrar usuários por papel</label><select id="role-filter" value={role} onChange={(event: ChangeEvent<HTMLSelectElement>) => setRole(event.target.value as UserRole | 'all')} className="w-full rounded-2xl border border-line bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-slate-950"><option value="all">Todos os papéis</option>{(Object.keys(roleLabels) as UserRole[]).map((item) => <option key={item} value={item}>{roleLabels[item]}</option>)}</select></div></div>
    <p aria-live="polite" className="text-sm text-muted dark:text-slate-300">{adminUsers.loading ? 'Carregando usuários…' : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}.`}</p><p aria-live="assertive" className="text-sm font-semibold text-rose-700 dark:text-rose-300">{adminUsers.error}</p><p aria-live="polite" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{feedback}</p>
    {adminUsers.loading ? <div role="status" className="rounded-3xl border border-line bg-white p-8 text-center text-muted dark:border-slate-700 dark:bg-slate-900">Carregando usuários cadastrados…</div> : !adminUsers.error && !filteredUsers.length ? <div className="rounded-3xl border border-dashed border-line bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold">Nenhum usuário encontrado</h2><p className="mt-2 text-sm text-muted dark:text-slate-300">Ajuste a busca ou o filtro para ver outros resultados.</p></div> : !adminUsers.error ? <UserAdminList users={filteredUsers} onChangeRole={openDialog} /> : <button type="button" onClick={adminUsers.refresh} className="rounded-full border border-line px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400">Tentar novamente</button>}
    {selectedUser && <ChangeUserRoleDialog user={selectedUser} onClose={closeDialog} onConfirm={changeRole} />}
  </section>;
}
