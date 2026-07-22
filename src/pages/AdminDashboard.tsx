import { Activity, ClipboardList, FileWarning, MessageSquare, Settings, ShieldCheck, Users } from 'lucide-react';

export type AdminDestination = 'admin-users' | 'admin-problems' | 'admin-solutions' | 'admin-comments' | 'admin-reports' | 'admin-audit' | 'admin-system';

interface AdminDashboardProps {
  onNavigate: (page: AdminDestination) => void;
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
