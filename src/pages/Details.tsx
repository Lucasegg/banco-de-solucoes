import { problems, solutions } from '../data/mockData';

export function ProblemDetails({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  const problem = problems.find((item) => item.id === id) ?? problems[0];
  const related = solutions.filter((solution) => problem.relatedSolutionIds.includes(solution.id));
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <article className="rounded-[2rem] border border-line bg-white p-8 shadow-sm">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-muted">{problem.category}</span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">{problem.title}</h1>
        <p className="mt-5 text-lg leading-8 text-muted">{problem.description}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Info label="Região" value={problem.region} />
          <Info label="Impacto" value={problem.impactLevel} />
          <Info label="Responsável" value={problem.owner} />
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
