import { Lightbulb, Network, UsersRound } from 'lucide-react';

export function About() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight">Sobre o Banco de Soluções</h1>
        <p className="mt-5 text-lg leading-8 text-muted">O Banco de Soluções organiza conhecimento prático sobre desafios reais. Em vez de armazenar ideias isoladas, a plataforma conecta problemas, evidências, soluções, pessoas, empresas e projetos em uma rede aberta.</p>
        <p className="mt-4 leading-7 text-muted">Aqui, a comunidade pode compartilhar experiências, encontrar iniciativas e colaborar para transformar conhecimento em ação.</p>
      </div>
      <aside className="rounded-3xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Nossa proposta</h2>
        <ul className="mt-5 space-y-4 text-sm text-muted">
          <li className="flex gap-3"><Lightbulb className="shrink-0 text-amber-600" size={20} aria-hidden="true" /><span>Dar visibilidade a problemas e ideias que podem gerar impacto.</span></li>
          <li className="flex gap-3"><Network className="shrink-0 text-teal-700" size={20} aria-hidden="true" /><span>Conectar desafios a soluções e evidências compartilhadas.</span></li>
          <li className="flex gap-3"><UsersRound className="shrink-0 text-slate-700" size={20} aria-hidden="true" /><span>Fortalecer a colaboração entre pessoas e organizações.</span></li>
        </ul>
      </aside>
    </section>
  );
}
