import { Plus } from 'lucide-react';
import { ProblemCard } from '../components/Cards';
import { problems } from '../data/mockData';

export function ExploreProblems({ onOpen, onNavigate }: { onOpen: (id: string) => void; onNavigate: (page: string) => void }) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-sm font-medium text-muted">/problems</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Banco de Problemas</h1>
          <p className="mt-3 max-w-2xl text-muted">Registros estruturados de desafios reais para orientar pesquisa, colaboração e soluções reutilizáveis.</p>
        </div>
        <button onClick={() => onNavigate('novo-problema')} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"><Plus size={16} /> Novo problema</button>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {problems.map((problem) => <ProblemCard key={problem.id} problem={problem} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
