import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { AdminUserRecord } from '../../repositories/adminUsers';
import type { UserRole } from '../../types/user';
import { manageableRoles, roleLabels } from '../../hooks/useAdminUsers';
import { focusInitialElement, handleModalKeyDown } from './focusTrap';

interface Props { user: AdminUserRecord; onClose: () => void; onConfirm: (role: UserRole) => Promise<{ ok: boolean; message?: string }>; }
const privilegeRank: Record<UserRole, number> = { member: 0, curator: 1, moderator: 1, verified_organization: 1, admin: 2 };

export function ChangeUserRoleDialog({ user, onClose, onConfirm }: Props) {
  const [nextRole, setNextRole] = useState<UserRole>(user.role === 'verified_organization' ? 'member' : user.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!dialogRef.current) return;
    focusInitialElement(dialogRef.current);
    const onKeyDown = (event: KeyboardEvent) => handleModalKeyDown(event, dialogRef.current!, busy, onClose);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);
  const elevated = privilegeRank[nextRole] > privilegeRank[user.role];
  async function confirm() { setBusy(true); setError(''); const result = await onConfirm(nextRole); if (!result.ok) { setError(result.message ?? 'Não foi possível alterar o papel.'); setBusy(false); } }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event: { target: unknown; currentTarget: HTMLDivElement }) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="change-role-title" aria-describedby="change-role-description" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4"><div><h2 id="change-role-title" className="text-xl font-semibold">Alterar papel</h2><p id="change-role-description" className="mt-2 text-sm text-muted dark:text-slate-300">Confirme a alteração de acesso para {user.name}.</p></div><button ref={closeButton} type="button" onClick={onClose} disabled={busy} className="rounded-xl px-3 py-1 text-sm font-semibold hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:hover:bg-slate-800">Fechar</button></div>
      <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800"><div><dt className="font-semibold">Usuário afetado</dt><dd>{user.name}{user.username ? ` (@${user.username})` : ''}</dd></div><div><dt className="font-semibold">Papel atual</dt><dd>{roleLabels[user.role]}</dd></div></dl>
      <label className="mt-5 block text-sm font-semibold" htmlFor="new-user-role">Novo papel</label><select id="new-user-role" value={nextRole} onChange={(event: ChangeEvent<HTMLSelectElement>) => setNextRole(event.target.value as UserRole)} disabled={busy} className="mt-2 w-full rounded-2xl border border-line bg-white p-3 dark:bg-slate-950">{manageableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>
      {elevated && <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><strong>Aumento de privilégio.</strong> Este usuário receberá permissões administrativas adicionais.</p>}
      {nextRole === 'admin' && <p className="mt-3 rounded-2xl border border-teal-300 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">Administradores possuem acesso às ferramentas de gestão e segurança da plataforma.</p>}
      <p aria-live="assertive" className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} disabled={busy} className="rounded-full border border-line px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400">Cancelar</button><button type="button" onClick={() => void confirm()} disabled={busy || nextRole === user.role} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-slate-950">{busy ? 'Salvando…' : 'Confirmar alteração'}</button></div>
    </section>
  </div>;
}
