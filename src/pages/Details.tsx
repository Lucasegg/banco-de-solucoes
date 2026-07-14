import type { ReactNode } from 'react';
import { Calendar, Heart, MapPin, Share2, Sparkles, UsersRound } from 'lucide-react';
import { problems, solutions } from '../data/mockData';

export function ProblemDetails({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  const problem = problems.find((item) => item.id === id) ?? problems[0];
  const related = solutions.filter((solution) => problem.relatedSolutionIds.includes(solution.id));

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <article className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-sm">
        <img src={problem.image} alt="" className="h-72 w-full object-cover md:h-96" />
        <div className="p-8">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>{problem.category}</Badge>
            <Badge>{problem.status}</Badge>
            <Badge>{problem.city}, {problem.state}</Badge>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">{problem.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted">{problem.description}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info icon={<MapPin size={18} />} label="Cidade" value={`${problem.city}, ${problem.state}`} />
            <Info icon={<Calendar size={18} />} label="Data" value={new Date(problem.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} />
            <Info icon={<UsersRound size={18} />} label="Autor" value={problem.author} />
            <Info icon={<Heart size={18} />} label="Curtidas" value={String(problem.likes)} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Action icon={<Share2 size={16} />} label="Compartilhar" />
            <Action icon={<Heart size={16} />} label="Curtir" />
            <button onClick={() => onNavigate('solucoes')} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              <Sparkles size={16} /> Encontrar Soluções
            </button>
          </div>
        </div>
      </article>
      <aside className="space-y-4">
        <h2 className="text-xl font-semibold">Soluções relacionadas</h2>
        {related.map((solution) => (
          <button key={solution.id} onClick={() => onNavigate(`solucao:${solution.id}`)} className="w-full rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:shadow-soft">
            <strong>{solution.title}</strong>
            <p className="mt-2 text-sm text-muted">{solution.summary}</p>
          </button>
        ))}
      </aside>
    </section>
  );
}

export function SolutionDetails({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  const solution = solutions.find((item) => item.id === id) ?? solutions[0];
  const related = problems.filter((problem) => solution.relatedProblemIds.includes(problem.id));

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <article className="rounded-[2rem] border border-line bg-white p-8 shadow-sm">
        <span className="rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-700">{solution.maturity}</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">{solution.title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted">{solution.description}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Info label="Organização" value={solution.organization} />
          <Info label="Maturidade" value={solution.maturity} />
          <Info label="Impacto" value={solution.impactMetric} />
        </div>
      </article>
      <aside className="space-y-4">
        <h2 className="text-xl font-semibold">Problemas relacionados</h2>
        {related.map((problem) => (
          <button key={problem.id} onClick={() => onNavigate(`problema:${problem.id}`)} className="w-full rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:shadow-soft">
            <strong>{problem.title}</strong>
            <p className="mt-2 text-sm text-muted">{problem.summary}</p>
          </button>
        ))}
      </aside>
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{children}</span>;
}

function Action({ icon, label }: { icon: ReactNode; label: string }) {
  return <button className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold">{icon}{label}</button>;
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">{icon}{label}</span>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
