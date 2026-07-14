import { SolutionCard } from '../components/Cards';
import { solutions } from '../data/mockData';

export function ExploreSolutions({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="space-y-8">
      <div>
        <span className="text-sm font-medium text-muted">Explorar</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Soluções</h1>
        <p className="mt-3 max-w-2xl text-muted">Ideias, pilotos e iniciativas validadas conectadas aos problemas que pretendem resolver.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {solutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
