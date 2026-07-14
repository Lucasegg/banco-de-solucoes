import { ProblemCard } from '../components/Cards';
import { problems } from '../data/mockData';

export function ExploreProblems({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="space-y-8">
      <div>
        <span className="text-sm font-medium text-muted">Explorar</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Problemas</h1>
        <p className="mt-3 max-w-2xl text-muted">Registros estruturados de desafios reais para orientar pesquisa, colaboração e soluções reutilizáveis.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {problems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
