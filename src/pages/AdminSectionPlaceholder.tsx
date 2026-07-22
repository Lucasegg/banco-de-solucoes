import { Settings } from 'lucide-react';

export function AdminSectionPlaceholder({ title, onBack }: { title: string; onBack: () => void }) {
  return <section className="mx-auto max-w-2xl rounded-3xl border border-line bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <span className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Settings size={24} aria-hidden="true" /></span>
    <h1 className="mt-5 text-3xl font-semibold">{title}</h1>
    <p className="mt-3 text-muted dark:text-slate-300">Esta área está estruturada e será disponibilizada em uma próxima etapa.</p>
    <button onClick={onBack} className="mt-6 rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-teal-400 dark:text-slate-950">Voltar ao painel</button>
  </section>;
}
