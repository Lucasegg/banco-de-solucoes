import { ArrowRight, Building2, MapPin, Sparkles } from 'lucide-react';
import type { Problem, Solution } from '../types/domain';

interface CardActions {
  onOpen: (id: string) => void;
}

export function ProblemCard({ problem, onOpen }: { problem: Problem } & CardActions) {
  const solutionCountLabel = `${problem.relatedSolutionIds.length} ${problem.relatedSolutionIds.length === 1 ? 'solução' : 'soluções'}`;

  return (
    <article className="group rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">{problem.category}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{problem.impactLevel}</span>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{solutionCountLabel}</span>
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{problem.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{problem.summary}</p>
      <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
        <MapPin size={16} /> {problem.region}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {problem.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-line px-2.5 py-1 text-xs text-slate-500">#{tag}</span>
        ))}
      </div>
      <button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950" onClick={() => onOpen(problem.id)}>
        Ver detalhes <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </button>
    </article>
  );
}

export function SolutionCard({ solution, onOpen }: { solution: Solution } & CardActions) {
  return (
    <article className="group rounded-3xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
        <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">{solution.maturity}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">{solution.relatedProblemIds.length} problema(s)</span>
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{solution.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{solution.summary}</p>
      <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
        <Building2 size={16} /> {solution.organization}
      </div>
      <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <Sparkles size={16} className="mb-2" /> {solution.impactMetric}
      </div>
      <button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950" onClick={() => onOpen(solution.id)}>
        Ver detalhes <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </button>
    </article>
  );
}
