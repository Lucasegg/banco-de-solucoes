import type { ReactNode } from 'react';
import { DatabaseZap, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const links = [
  ['home', 'Home'],
  ['problemas', 'Problemas'],
  ['solucoes', 'Soluções'],
  ['novo-problema', 'Cadastrar problema'],
  ['nova-solucao', 'Cadastrar solução'],
  ['sobre', 'Sobre'],
];

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, isAuthenticated } = useAuth();
  const permissions = usePermissions(user);

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-white/85 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <button className="flex items-center gap-3 text-left" onClick={() => onNavigate('home')}>
            <span className="rounded-2xl border border-slate-200 bg-slate-950 p-2 text-white shadow-sm">
              <DatabaseZap size={20} />
            </span>
            <span>
              <strong className="block text-sm tracking-tight">Banco de Soluções</strong>
              <span className="text-xs text-muted">Problemas conectados a ação</span>
            </span>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {links.map(([id, label]) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  (currentPage === id || (currentPage === 'problema' && id === 'problemas') || (currentPage === 'solucao' && id === 'solucoes')) ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                {label}
              </button>
            ))}
            {isAuthenticated && user ? (
              <>
              <button
                onClick={() => onNavigate('favorites')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'favorites' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                Meus favoritos
              </button>
              <button
                onClick={() => onNavigate('contributions')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'contributions' || currentPage === 'contribution' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                Contribuições
              </button>
              {permissions.canAccessAdmin && <button onClick={() => onNavigate('admin')} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'admin' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}>Admin</button>}
              <button
                onClick={() => onNavigate('account')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'account' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                Conta
              </button>
              <button
                onClick={() => onNavigate('profile')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'profile' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <img src={user.avatarUrl} alt={`Avatar de ${user.name}`} className="h-7 w-7 rounded-full object-cover" />
                Perfil
              </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition ${currentPage === 'login' || currentPage === 'register' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <LogIn size={16} /> Entrar
              </button>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <span>Open source, colaborativo e preparado para dados reais.</span>
          <span>Fase 1 · React · TypeScript · Vite · TailwindCSS</span>
        </div>
      </footer>
    </div>
  );
}
