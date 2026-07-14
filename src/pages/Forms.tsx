const inputClass = 'rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-slate-400';

export function ProblemForm() {
  return <FormShell title="Cadastrar problema" description="Registre um desafio com contexto suficiente para que outras pessoas possam pesquisar e propor soluções." fields={['Título do problema', 'Categoria', 'Região', 'Tags', 'Resumo', 'Descrição do contexto']} />;
}

export function SolutionForm() {
  return <FormShell title="Cadastrar solução" description="Documente uma proposta, piloto ou iniciativa validada e relacione-a aos problemas que ela resolve." fields={['Título da solução', 'Organização responsável', 'Maturidade', 'Problemas relacionados', 'Métrica de impacto', 'Descrição da solução']} />;
}

function FormShell({ title, description, fields }: { title: string; description: string; fields: string[] }) {
  return (
    <section className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white p-8 shadow-sm">
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-muted">{description}</p>
      <form className="mt-8 grid gap-4" onSubmit={(event: { preventDefault: () => void }) => event.preventDefault()}>
        {fields.map((field) => field.includes('Descrição') || field.includes('Resumo') || field.includes('Métrica') ? (
          <label key={field} className="grid gap-2 text-sm font-medium">
            {field}
            <textarea className={`${inputClass} min-h-28`} placeholder={`Informe: ${field.toLowerCase()}`} />
          </label>
        ) : (
          <label key={field} className="grid gap-2 text-sm font-medium">
            {field}
            <input className={inputClass} placeholder={`Informe: ${field.toLowerCase()}`} />
          </label>
        ))}
        <button className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">Salvar rascunho local</button>
        <p className="text-xs text-muted">Nesta fase, o formulário não persiste dados. A integração será feita futuramente com Supabase.</p>
      </form>
    </section>
  );
}
