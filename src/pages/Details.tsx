import type { ReactNode } from 'react';
import { Bookmark, Calendar, Eye, Heart, Lightbulb, MapPin, MessageCircle, Share2, Sparkles, UsersRound } from 'lucide-react';
import { problems, solutions } from '../data/mockData';

export function ProblemDetails({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  const problem = problems.find((item) => item.id === id) ?? problems[0];
  const related = solutions.filter((solution) => solution.relatedProblemIds.includes(problem.id));

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <article className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-sm">
        <img src={problem.image} alt={`Imagem do problema ${problem.title}`} className="h-72 w-full object-cover md:h-96" />
        <div className="p-8">
          <div className="flex flex-wrap gap-2 text-sm"><Badge>{problem.category}</Badge><Badge>{problem.status}</Badge><Badge>{problem.city}, {problem.state}</Badge></div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">{problem.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted">{problem.description}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info icon={<MapPin size={18} />} label="Cidade" value={`${problem.city}, ${problem.state}`} />
            <Info icon={<Calendar size={18} />} label="Data" value={formatDate(problem.createdAt)} />
            <Info icon={<UsersRound size={18} />} label="Autor" value={problem.author} />
            <Info icon={<Heart size={18} />} label="Curtidas" value={String(problem.likes)} />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Action icon={<Share2 size={16} />} label="Compartilhar" />
            <Action icon={<Heart size={16} />} label="Curtir" />
            <button onClick={() => onNavigate('solucoes')} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-slate-400"><Sparkles size={16} /> Encontrar Soluções</button>
          </div>
        </div>
      </article>
      <aside className="space-y-4"><h2 className="text-xl font-semibold">Soluções relacionadas</h2>{related.map((solution) => <button key={solution.id} onClick={() => onNavigate(`solucao:${solution.id}`)} className="w-full rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-teal-400"><strong>{solution.title}</strong><p className="mt-2 text-sm text-muted">{solution.category} · {solution.status} · {solution.maturityLevel}</p></button>)}</aside>
    </section>
  );
}

export function SolutionDetails({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  const solution = solutions.find((item) => item.id === id) ?? solutions[0];
  const related = problems.filter((problem) => solution.relatedProblemIds.includes(problem.id));

  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <article className="overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-sm">
        <img src={solution.image} alt={`Imagem da solução ${solution.title}`} className="h-72 w-full object-cover md:h-96" />
        <div className="p-8">
          <div className="flex flex-wrap gap-2 text-sm"><Badge>{solution.category}</Badge><Badge>{solution.status}</Badge><Badge>{solution.maturityLevel}</Badge><Badge>{solution.implementationDifficulty}</Badge></div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">{solution.title}</h1>
          <p className="mt-5 text-lg leading-8 text-muted">{solution.description}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Info label="Organização responsável" value={solution.organization} />
            <Info label="Autor" value={solution.author} />
            <Info label="Localização" value={`${solution.location}, ${solution.country}`} />
            <Info label="Custo estimado" value={solution.estimatedCost} />
            <Info label="Tempo" value={solution.implementationTime} />
            <Info label="Impacto" value={solution.impactMetric} />
            <Info label="Criada em" value={formatDate(solution.createdAt)} />
            <Info label="Atualizada em" value={formatDate(solution.updatedAt)} />
          </div>
          <div className="mt-8 flex flex-wrap gap-2">{solution.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
          <div className="mt-8 grid gap-3 text-sm text-muted sm:grid-cols-3"><Metric icon={<Heart size={16} />} value={solution.likes} label="curtidas" /><Metric icon={<MessageCircle size={16} />} value={solution.comments} label="comentários" /><Metric icon={<Eye size={16} />} value={solution.views} label="visualizações" /></div>
          <div className="mt-8 flex flex-wrap gap-3"><Action icon={<Share2 size={16} />} label="Compartilhar" /><Action icon={<Heart size={16} />} label="Curtir" /><Action icon={<Bookmark size={16} />} label="Salvar" /><Action icon={<Lightbulb size={16} />} label="Propor melhoria" /><button onClick={() => onNavigate(`problema:${related[0]?.id ?? problems[0].id}`)} className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-teal-400">Ver problemas relacionados</button></div>
          <div className="mt-8"><h2 className="text-lg font-semibold">Links de evidência</h2><ul className="mt-3 space-y-2 text-sm text-teal-700">{solution.evidenceLinks.map((link) => <li key={link}><a className="break-all underline underline-offset-4" href={link}>{link}</a></li>)}</ul></div>
        </div>
      </article>
      <aside className="space-y-4"><h2 className="text-xl font-semibold">Problemas relacionados</h2>{related.map((problem) => <button key={problem.id} onClick={() => onNavigate(`problema:${problem.id}`)} className="w-full rounded-3xl border border-line bg-white p-5 text-left shadow-sm hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-teal-400"><strong>{problem.title}</strong><p className="mt-2 text-sm text-muted">{problem.category} · {problem.city}, {problem.state} · {problem.status}</p></button>)}</aside>
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) { return <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{children}</span>; }
function Action({ icon, label }: { icon: ReactNode; label: string }) { return <button className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400">{icon}{label}</button>; }
function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) { return <div className="rounded-2xl bg-slate-50 p-4"><span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">{icon}{label}</span><p className="mt-2 text-sm font-semibold text-slate-800">{value}</p></div>; }
function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) { return <span className="inline-flex items-center gap-2 rounded-2xl bg-teal-50 px-3 py-2 text-teal-800">{icon}{value} {label}</span>; }
function formatDate(date: string) { return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }); }
