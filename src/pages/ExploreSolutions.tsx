import { Plus } from 'lucide-react';
import { SolutionCard } from '../components/Cards';
import { solutions } from '../data/mockData';

export function ExploreSolutions({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-sm font-medium text-muted">/solutions</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Banco de Soluções</h1>
          <p className="mt-3 max-w-2xl text-muted">Ideias, pilotos e iniciativas validadas conectadas por ID aos problemas que pretendem resolver.</p>
        </div>
        <button onClick={() => onNavigate('nova-solucao')} className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400"><Plus size={16} /> Nova solução</button>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {solutions.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
