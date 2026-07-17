import type { ReactNode } from 'react';
import { ArrowRight, Building2, ExternalLink, Eye, Gauge, Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import type { Problem, Solution, SolutionStatus } from '../types/domain';

interface CardActions {
  onOpen: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

const problemStatusStyles: Record<Problem['status'], string> = {
  Reportado: 'bg-amber-50 text-amber-700',
  'Em análise': 'bg-sky-50 text-sky-700',
  'Em vistoria': 'bg-cyan-50 text-cyan-700',
  Planejado: 'bg-indigo-50 text-indigo-700',
  Licitado: 'bg-violet-50 text-violet-700',
  'Em execução': 'bg-blue-50 text-blue-700',
  'Parcialmente resolvido': 'bg-lime-50 text-lime-700',
  Resolvido: 'bg-emerald-50 text-emerald-700',
  Arquivado: 'bg-slate-100 text-slate-700',
  Reaberto: 'bg-orange-50 text-orange-700',
};

const solutionStatusStyles: Record<SolutionStatus, string> = {
  Proposta: 'bg-indigo-50 text-indigo-700',
  'Em teste': 'bg-amber-50 text-amber-700',
  Implementada: 'bg-emerald-50 text-emerald-700',
  Validada: 'bg-teal-50 text-teal-700',
  Arquivada: 'bg-slate-100 text-slate-600',
};

export function ProblemCard({ problem, onOpen, isFavorite, onToggleFavorite }: { problem: Problem } & CardActions) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <div className={`relative overflow-hidden ${problem.image ? 'h-48' : 'h-14 bg-slate-50'}`}>
        {problem.image && <img src={problem.image} alt={`Imagem do problema ${problem.title}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
        <button type="button" onClick={(event: { stopPropagation: () => void }) => { event.stopPropagation(); onToggleFavorite?.(problem.id); }} aria-pressed={isFavorite} aria-label={isFavorite ? `Remover ${problem.title} dos favoritos` : `Adicionar ${problem.title} aos favoritos`} className={`absolute right-4 top-4 rounded-full p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 ${isFavorite ? 'bg-rose-600 text-white' : 'bg-white/90 text-slate-700 hover:text-rose-600'}`}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${problemStatusStyles[problem.status]}`}>{problem.status}</span>
      </div>
      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">{problem.category}</span>
          <span className="inline-flex items-center gap-1 text-slate-500"><MapPin size={14} /> {problem.city}</span>
        </div>
        <h3 className="text-xl font-semibold tracking-tight">{problem.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{problem.summary}</p>
        {problem.importedFromExternalSource && <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50 p-3 text-xs text-teal-900"><strong>Fonte externa verificada</strong><span className="mt-1 block">{problem.sourceName}</span>{problem.sourceUrl && <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(event: { stopPropagation: () => void }) => event.stopPropagation()} className="mt-2 inline-flex items-center gap-1 font-semibold underline">Consultar fonte original <ExternalLink size={13} /></a>}</div>}
        <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-slate-500">
          <Metric icon={<Heart size={15} />} value={problem.likes} label="curtidas" />
          <Metric icon={<MessageCircle size={15} />} value={problem.comments} label="comentários" />
          <Metric icon={<Eye size={15} />} value={problem.views} label="views" />
        </div>
        <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-400" onClick={() => onOpen(problem.id)}>
          Ver detalhes <ArrowRight size={16} className="transition group-hover:translate-x-1" />
        </button>
      </div>
    </article>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <span className="inline-flex items-center gap-1 rounded-2xl bg-slate-50 px-2.5 py-2">{icon}{value} <span className="hidden sm:inline">{label}</span></span>;
}

export function SolutionCard({ solution, onOpen, isFavorite, onToggleFavorite }: { solution: Solution } & CardActions) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <div className={`relative overflow-hidden ${solution.image ? 'h-44' : 'h-14 bg-teal-50'}`}>
        {solution.image && <img src={solution.image} alt={`Imagem da solução ${solution.title}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
        <button type="button" onClick={(event: { stopPropagation: () => void }) => { event.stopPropagation(); onToggleFavorite?.(solution.id); }} aria-pressed={isFavorite} aria-label={isFavorite ? `Remover ${solution.title} dos favoritos` : `Adicionar ${solution.title} aos favoritos`} className={`absolute right-4 top-4 rounded-full p-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-300 ${isFavorite ? 'bg-rose-600 text-white' : 'bg-white/90 text-slate-700 hover:text-rose-600'}`}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold ${solutionStatusStyles[solution.status]}`}>{solution.status}</span>
      </div>
      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
          <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">{solution.category}</span>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">{solution.maturityLevel}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1"><Gauge size={13} /> {solution.implementationDifficulty}</span>
        </div>
        <h3 className="text-xl font-semibold tracking-tight">{solution.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{solution.summary}</p>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Building2 size={16} /> {solution.organization}</div>
        <div className="mt-5 rounded-2xl bg-teal-50 p-4 text-sm text-teal-800"><Sparkles size={16} className="mb-2" /> {solution.impactMetric}</div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-slate-500">
          <Metric icon={<Heart size={15} />} value={solution.likes} label="curtidas" />
          <Metric icon={<MessageCircle size={15} />} value={solution.comments} label="comentários" />
          <Metric icon={<Eye size={15} />} value={solution.views} label="views" />
        </div>
        <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400" onClick={() => onOpen(solution.id)}>Ver detalhes <ArrowRight size={16} className="transition group-hover:translate-x-1" /></button>
      </div>
    </article>
  );
}
