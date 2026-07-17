import { ArrowRight, CheckCircle2, Globe2, Network, Sparkles, UsersRound } from 'lucide-react';
import { SolutionCard } from '../components/Cards';
import { problems, solutions } from '../data/mockData';

export function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  const highlighted = solutions.filter((solution) => solution.status === 'Implementada' || solution.status === 'Validada').slice(0, 3);
  const implemented = solutions.filter((solution) => solution.status === 'Implementada').length;
  return (
    <div className="space-y-14">
      <section className="rounded-[2rem] border border-line bg-white p-8 shadow-soft md:p-14">
        <div className="max-w-3xl">
          <span className="rounded-full border border-line px-3 py-1 text-sm text-muted">Base Nacional de conhecimento colaborativo</span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-7xl">Conecte problemas reais a soluções que podem escalar.</h1>
          <p className="mt-6 text-lg leading-8 text-muted">Uma plataforma open source para mapear desafios, catalogar soluções, aproximar pessoas, empresas e projetos, e transformar conhecimento disperso em ação coordenada.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => onNavigate('problemas')} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-400">Explorar problemas</button>
            <button onClick={() => onNavigate('solucoes')} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400">Ver soluções <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {[
          [Globe2, `${problems.length} problemas`, 'Desafios descritos com contexto, categoria e impacto.'],
          [Network, `${solutions.length} soluções`, 'Propostas conectadas a problemas e maturidade.'],
          [CheckCircle2, `${implemented} implementadas`, 'Soluções com execução registrada na plataforma.'],
          [UsersRound, '128 colaboradores', 'Pessoas e organizações colaborando em rede.'],
        ].map(([Icon, title, text]) => (
          <div key={String(title)} className="rounded-3xl border border-line bg-white p-6">
            <Icon className="mb-4 text-slate-700" />
            <h2 className="text-xl font-semibold">{String(title)}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{String(text)}</p>
          </div>
        ))}
      </section>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div><span className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"><Sparkles size={16} /> Soluções em destaque</span><h2 className="mt-2 text-3xl font-semibold tracking-tight">Iniciativas prontas para inspirar ação</h2></div>
          <button onClick={() => onNavigate('solucoes')} className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white">Ver soluções <ArrowRight size={16} /></button>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{highlighted.map((solution) => <SolutionCard key={solution.id} solution={solution} onOpen={(id) => onNavigate(`solucao:${id}`)} />)}</div>
      </section>
    </div>
  );
}
