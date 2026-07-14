import { supabaseConfig } from '../lib/supabase';

export function About() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="rounded-[2rem] border border-line bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-semibold tracking-tight">Sobre o Banco de Soluções</h1>
        <p className="mt-5 text-lg leading-8 text-muted">O Banco de Soluções nasce para organizar conhecimento prático sobre desafios reais. Em vez de armazenar ideias isoladas, a plataforma conecta problema, evidência, solução, pessoas, empresas e projetos em uma rede aberta.</p>
        <p className="mt-4 leading-7 text-muted">A primeira fase valida a experiência, a estrutura de informação e o fluxo de contribuição. As próximas fases adicionam autenticação, persistência, moderação e inteligência de descoberta.</p>
      </div>
      <aside className="rounded-3xl border border-line bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Status técnico</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div><dt className="text-muted">Frontend</dt><dd className="font-semibold">React + Vite + TypeScript</dd></div>
          <div><dt className="text-muted">Estilo</dt><dd className="font-semibold">TailwindCSS</dd></div>
          <div><dt className="text-muted">Supabase</dt><dd className="font-semibold">{supabaseConfig.isConfigured ? 'Configurado' : 'Preparado, ainda sem credenciais'}</dd></div>
        </dl>
      </aside>
    </section>
  );
}
