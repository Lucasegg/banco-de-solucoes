import { useEffect, type ReactNode } from 'react';
import { Activity, AlertTriangle, ClipboardList, FileWarning, MessageSquare, Settings, ShieldCheck, Users } from 'lucide-react';

type AdminDestination = 'admin-users' | 'admin-problems' | 'admin-solutions' | 'admin-comments' | 'admin-reports' | 'admin-audit' | 'admin-system';

interface AdminDashboardProps {
  onNavigate: (page: AdminDestination) => void;
}

interface AdminRouteProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  onLoginRequired: () => void;
  children: ReactNode;
}

const adminSections: Array<{ destination: AdminDestination; title: string; description: string; icon: typeof Users }> = [
  { destination: 'admin-users', title: 'Usuários', description: 'Gerencie perfis, papéis e acessos da comunidade.', icon: Users },
  { destination: 'admin-problems', title: 'Problemas', description: 'Acompanhe os registros de problemas publicados.', icon: ClipboardList },
  { destination: 'admin-solutions', title: 'Soluções', description: 'Revise as soluções catalogadas na plataforma.', icon: ShieldCheck },
  { destination: 'admin-comments', title: 'Comentários', description: 'Consulte as discussões e interações da comunidade.', icon: MessageSquare },
  { destination: 'admin-reports', title: 'Denúncias', description: 'Acompanhe conteúdos sinalizados para análise.', icon: FileWarning },
  { destination: 'admin-audit', title: 'Auditoria', description: 'Consulte os registros de ações administrativas.', icon: Activity },
  { destination: 'admin-system', title: 'Sistema', description: 'Verifique a saúde e os diagnósticos do sistema.', icon: Settings },
];

export function AdminRoute({ isAuthenticated, isLoading, isAdmin, onLoginRequired, children }: AdminRouteProps) {
  useEffect(() => {
    if (!isLoading && !isAuthenticated) onLoginRequired();
  }, [isAuthenticated, isLoading, onLoginRequired]);

  if (isLoading) return <p className="text-sm text-muted" role="status">Verificando permissões…</p>;
  if (!isAuthenticated) return null;
  if (!isAdmin) return <ForbiddenPage />;
  return <>{children}</>;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  return <section className="space-y-8">
    <header>
      <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">Administração</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Painel administrativo</h1>
      <p className="mt-3 max-w-2xl text-muted dark:text-slate-300">Acesse as áreas de administração do Banco de Soluções.</p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {adminSections.map(({ destination, title, description, icon: Icon }) => <article key={destination} className="flex min-h-56 flex-col rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <span className="inline-flex w-fit rounded-2xl bg-teal-50 p-3 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><Icon size={22} aria-hidden="true" /></span>
        <h2 className="mt-5 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted dark:text-slate-300">{description}</p>
        <button onClick={() => onNavigate(destination)} className="mt-auto w-fit rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300">Abrir</button>
      </article>)}
    </div>
  </section>;
}

export function AdminSectionPlaceholder({ title, onBack }: { title: string; onBack: () => void }) {
  return <section className="mx-auto max-w-2xl rounded-3xl border border-line bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <span className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Settings size={24} aria-hidden="true" /></span>
    <h1 className="mt-5 text-3xl font-semibold">{title}</h1>
    <p className="mt-3 text-muted dark:text-slate-300">Esta área está estruturada e será disponibilizada em uma próxima etapa.</p>
    <button onClick={onBack} className="mt-6 rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-teal-400 dark:text-slate-950">Voltar ao painel</button>
  </section>;
}

export function ForbiddenPage() {
  return <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900 dark:bg-amber-950/40">
    <AlertTriangle className="mx-auto text-amber-700 dark:text-amber-300" size={32} aria-hidden="true" />
    <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">Erro 403</p>
    <h1 className="mt-2 text-3xl font-semibold">Acesso não autorizado</h1>
    <p className="mt-3 text-muted dark:text-slate-300">Sua conta não possui permissão para acessar a área administrativa.</p>
  </section>;
}
