import { ArrowRight, Globe2, Network, UsersRound } from 'lucide-react';
import { problems, solutions } from '../data/mockData';

export function Home({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="space-y-14">
      <section className="rounded-[2rem] border border-line bg-white p-8 shadow-soft md:p-14">
        <div className="max-w-3xl">
          <span className="rounded-full border border-line px-3 py-1 text-sm text-muted">Base mundial de conhecimento colaborativo</span>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight md:text-7xl">Conecte problemas reais a soluções que podem escalar.</h1>
          <p className="mt-6 text-lg leading-8 text-muted">Uma plataforma open source para mapear desafios, catalogar soluções, aproximar pessoas, empresas e projetos, e transformar conhecimento disperso em ação coordenada.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => onNavigate('problemas')} className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Explorar problemas</button>
            <button onClick={() => onNavigate('solucoes')} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold">Ver soluções <ArrowRight size={16} /></button>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          [Globe2, `${problems.length} problemas`, 'Desafios descritos com contexto, categoria e impacto.'],
          [Network, `${solutions.length} soluções`, 'Propostas conectadas a problemas e maturidade.'],
          [UsersRound, 'Open source', 'Projetado para colaboração pública e dados abertos.'],
        ].map(([Icon, title, text]) => (
          <div key={String(title)} className="rounded-3xl border border-line bg-white p-6">
            <Icon className="mb-4 text-slate-700" />
            <h2 className="text-xl font-semibold">{String(title)}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{String(text)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
